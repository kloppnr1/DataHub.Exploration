namespace DataHub.Settlement.Application.Billing;

public interface IAcontoPaymentRepository
{
    Task<AcontoPayment> RecordPaymentAsync(string gsrn, DateOnly periodStart, DateOnly periodEnd, decimal amount, CancellationToken ct);
    Task<IReadOnlyList<AcontoPayment>> GetPaymentsAsync(string gsrn, DateOnly from, DateOnly to, CancellationToken ct);
    Task<decimal> GetTotalPaidAsync(string gsrn, DateOnly from, DateOnly to, CancellationToken ct);
}
