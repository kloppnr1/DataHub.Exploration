using Microsoft.Extensions.Logging;

namespace DataHub.Settlement.Application.Billing;

/// <summary>
/// Atomically allocates a payment amount to an invoice within a single DB transaction.
/// Implemented in Infrastructure with row-level locking to prevent concurrent corruption.
/// </summary>
public interface IPaymentAllocator
{
    /// <summary>
    /// Allocates the specified amount from payment to invoice, updating all amounts and statuses
    /// atomically within a single transaction with row locks (SELECT ... FOR UPDATE).
    /// </summary>
    Task AllocateAsync(Guid paymentId, Guid invoiceId, decimal amount, string? allocatedBy, CancellationToken ct);

    /// <summary>
    /// Auto-matches a payment against all outstanding invoices for its customer,
    /// performing all allocations within a single transaction with row locks.
    /// </summary>
    Task AutoMatchAsync(Guid paymentId, CancellationToken ct);
}

public sealed class PaymentMatchingService : IPaymentMatchingService
{
    private readonly IPaymentRepository _paymentRepo;
    private readonly IPaymentAllocator _allocator;
    private readonly ILogger<PaymentMatchingService> _logger;

    public PaymentMatchingService(
        IPaymentRepository paymentRepo,
        IPaymentAllocator allocator,
        ILogger<PaymentMatchingService> logger)
    {
        _paymentRepo = paymentRepo;
        _allocator = allocator;
        _logger = logger;
    }

    public async Task<Payment> RecordAndMatchPaymentAsync(CreatePaymentRequest request, CancellationToken ct)
    {
        var payment = await _paymentRepo.CreateAsync(request, ct);
        await _allocator.AutoMatchAsync(payment.Id, ct);

        // Re-read to get updated amounts
        return (await _paymentRepo.GetAsync(payment.Id, ct))!;
    }

    public async Task ManualAllocateAsync(Guid paymentId, Guid invoiceId, decimal amount, string allocatedBy, CancellationToken ct)
    {
        await _allocator.AllocateAsync(paymentId, invoiceId, amount, allocatedBy, ct);
    }

    public async Task<BankFileImportResult> ImportBankFileAsync(BankFileImportRequest request, CancellationToken ct)
    {
        var matched = 0;
        var unmatched = 0;
        var errors = new List<string>();

        foreach (var bankPayment in request.Payments)
        {
            try
            {
                // Try to find customer by payment reference (invoice number)
                var customerId = await _paymentRepo.FindCustomerByPaymentReferenceAsync(
                    bankPayment.PaymentReference, ct);

                if (customerId is null)
                {
                    unmatched++;
                    errors.Add($"No customer found for reference {bankPayment.PaymentReference}");
                    continue;
                }

                var paymentRequest = new CreatePaymentRequest(
                    customerId.Value, "bank_transfer", bankPayment.PaymentReference,
                    bankPayment.ExternalId, bankPayment.Amount, bankPayment.ValueDate);

                await RecordAndMatchPaymentAsync(paymentRequest, ct);
                matched++;
            }
            catch (Exception ex)
            {
                unmatched++;
                errors.Add($"Error processing payment ref {bankPayment.PaymentReference}: {ex.Message}");
                _logger.LogWarning(ex, "Bank file import: failed to process payment ref {Ref}", bankPayment.PaymentReference);
            }
        }

        _logger.LogInformation("Bank file import: {Total} payments, {Matched} matched, {Unmatched} unmatched",
            request.Payments.Count, matched, unmatched);

        return new BankFileImportResult(request.Payments.Count, matched, unmatched, errors);
    }
}
