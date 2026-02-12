namespace DataHub.Settlement.Application.Billing;

public interface IPaymentMatchingService
{
    Task<Payment> RecordAndMatchPaymentAsync(CreatePaymentRequest request, CancellationToken ct);
    Task ManualAllocateAsync(Guid paymentId, Guid invoiceId, decimal amount, string allocatedBy, CancellationToken ct);
    Task<BankFileImportResult> ImportBankFileAsync(BankFileImportRequest request, CancellationToken ct);
}
