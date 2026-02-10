namespace DataHub.Settlement.Application.Settlement;

public interface ICorrectionService
{
    Task<CorrectionBatchDetail> TriggerCorrectionAsync(TriggerCorrectionRequest request, CancellationToken ct);
}
