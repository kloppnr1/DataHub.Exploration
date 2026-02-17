namespace DataHub.Settlement.Application.Settlement;

public interface ICorrectionService
{
    Task<CorrectionBatchDetail> TriggerCorrectionAsync(TriggerCorrectionRequest request, CancellationToken ct);
    Task<int> TriggerAutoCorrectionsAsync(string gsrn, DateTime changesFromUtc, DateTime changesToUtc, CancellationToken ct);
}
