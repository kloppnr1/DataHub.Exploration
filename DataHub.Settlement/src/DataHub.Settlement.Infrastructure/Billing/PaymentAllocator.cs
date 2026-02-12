using Dapper;
using DataHub.Settlement.Application.Billing;
using DataHub.Settlement.Infrastructure.Database;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace DataHub.Settlement.Infrastructure.Billing;

public sealed class PaymentAllocator : IPaymentAllocator
{
    private readonly string _connectionString;
    private readonly ILogger<PaymentAllocator> _logger;

    static PaymentAllocator()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
        DapperTypeHandlers.Register();
    }

    public PaymentAllocator(string connectionString, ILogger<PaymentAllocator> logger)
    {
        _connectionString = connectionString;
        _logger = logger;
    }

    public async Task AutoMatchAsync(Guid paymentId, CancellationToken ct)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        // Lock the payment row and read current state
        var payment = await conn.QuerySingleOrDefaultAsync<Payment>(
            new CommandDefinition(
                "SELECT * FROM billing.payment WHERE id = @Id FOR UPDATE",
                new { Id = paymentId }, transaction: tx, cancellationToken: ct));

        if (payment is null)
        {
            _logger.LogWarning("AutoMatch: Payment {PaymentId} not found", paymentId);
            return;
        }

        var remaining = payment.AmountUnallocated;
        if (remaining <= 0)
        {
            _logger.LogInformation("AutoMatch: Payment {PaymentId} has no unallocated amount", paymentId);
            await tx.CommitAsync(ct);
            return;
        }

        // Lock and read outstanding invoices for customer (oldest due first)
        var outstanding = (await conn.QueryAsync<Invoice>(
            new CommandDefinition("""
                SELECT * FROM billing.invoice
                WHERE customer_id = @CustomerId AND amount_outstanding > 0 AND status IN ('sent', 'partially_paid', 'overdue')
                ORDER BY due_date ASC NULLS LAST
                FOR UPDATE
                """,
                new { payment.CustomerId }, transaction: tx, cancellationToken: ct))).ToList();

        if (outstanding.Count == 0)
        {
            _logger.LogInformation("AutoMatch: No outstanding invoices for customer {CustomerId}", payment.CustomerId);
            await tx.CommitAsync(ct);
            return;
        }

        foreach (var invoice in outstanding)
        {
            if (remaining <= 0) break;

            var allocAmount = Math.Min(remaining, invoice.AmountOutstanding);
            await AllocateWithinTransactionAsync(conn, tx, paymentId, invoice, allocAmount, "auto", ct);
            remaining -= allocAmount;
        }

        // Update payment totals
        var newAllocated = payment.Amount - remaining;
        var paymentStatus = remaining <= 0 ? "allocated" : "partially_allocated";
        await conn.ExecuteAsync(
            new CommandDefinition("""
                UPDATE billing.payment
                SET amount_allocated = @Allocated, amount_unallocated = @Unallocated, status = @Status, updated_at = now()
                WHERE id = @Id
                """,
                new { Id = paymentId, Allocated = newAllocated, Unallocated = remaining, Status = paymentStatus },
                transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        _logger.LogInformation("AutoMatch: Payment {PaymentId} — allocated {Allocated} DKK across {Count} invoices",
            paymentId, newAllocated, outstanding.Count);
    }

    public async Task AllocateAsync(Guid paymentId, Guid invoiceId, decimal amount, string? allocatedBy, CancellationToken ct)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        // Lock both rows
        var payment = await conn.QuerySingleOrDefaultAsync<Payment>(
            new CommandDefinition(
                "SELECT * FROM billing.payment WHERE id = @Id FOR UPDATE",
                new { Id = paymentId }, transaction: tx, cancellationToken: ct))
            ?? throw new InvalidOperationException($"Payment {paymentId} not found");

        var invoice = await conn.QuerySingleOrDefaultAsync<Invoice>(
            new CommandDefinition(
                "SELECT * FROM billing.invoice WHERE id = @Id FOR UPDATE",
                new { Id = invoiceId }, transaction: tx, cancellationToken: ct))
            ?? throw new InvalidOperationException($"Invoice {invoiceId} not found");

        if (amount > payment.AmountUnallocated)
            throw new InvalidOperationException($"Amount {amount} exceeds unallocated balance {payment.AmountUnallocated}");

        if (amount > invoice.AmountOutstanding)
            throw new InvalidOperationException($"Amount {amount} exceeds invoice outstanding {invoice.AmountOutstanding}");

        await AllocateWithinTransactionAsync(conn, tx, paymentId, invoice, amount, allocatedBy, ct);

        // Update payment totals
        var newAllocated = payment.AmountAllocated + amount;
        var newUnallocated = payment.AmountUnallocated - amount;
        var paymentStatus = newUnallocated <= 0 ? "allocated" : "partially_allocated";
        await conn.ExecuteAsync(
            new CommandDefinition("""
                UPDATE billing.payment
                SET amount_allocated = @Allocated, amount_unallocated = @Unallocated, status = @Status, updated_at = now()
                WHERE id = @Id
                """,
                new { Id = paymentId, Allocated = newAllocated, Unallocated = newUnallocated, Status = paymentStatus },
                transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        _logger.LogInformation("Allocated {Amount} DKK from payment {PaymentId} to invoice {InvoiceId}",
            amount, paymentId, invoiceId);
    }

    private static async Task AllocateWithinTransactionAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx,
        Guid paymentId, Invoice invoice, decimal amount, string? allocatedBy,
        CancellationToken ct)
    {
        // Create allocation record
        await conn.ExecuteAsync(
            new CommandDefinition("""
                INSERT INTO billing.payment_allocation (payment_id, invoice_id, amount, allocated_by)
                VALUES (@PaymentId, @InvoiceId, @Amount, @AllocatedBy)
                """,
                new { PaymentId = paymentId, InvoiceId = invoice.Id, Amount = amount, AllocatedBy = allocatedBy },
                transaction: tx, cancellationToken: ct));

        // Update invoice amounts and status atomically
        var newPaid = invoice.AmountPaid + amount;
        var newOutstanding = invoice.AmountOutstanding - amount;
        var invoiceStatus = newOutstanding <= 0 ? "paid" : "partially_paid";

        await conn.ExecuteAsync(
            new CommandDefinition("""
                UPDATE billing.invoice
                SET amount_paid = @Paid, amount_outstanding = @Outstanding, status = @Status,
                    paid_at = CASE WHEN @Outstanding <= 0 THEN now() ELSE paid_at END,
                    updated_at = now()
                WHERE id = @Id
                """,
                new { Id = invoice.Id, Paid = newPaid, Outstanding = newOutstanding, Status = invoiceStatus },
                transaction: tx, cancellationToken: ct));
    }
}
