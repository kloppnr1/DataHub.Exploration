using DataHub.Settlement.Application.Common;

namespace DataHub.Settlement.Application.Settlement;

public interface ICorrectionRepository
{
    Task StoreCorrectionAsync(Guid batchId, CorrectionResult result, Guid? originalRunId, string triggerType, string? note, CancellationToken ct);
    Task<PagedResult<CorrectionBatchSummary>> GetCorrectionsPagedAsync(string? meteringPointId, string? triggerType, DateOnly? fromDate, DateOnly? toDate, int page, int pageSize, CancellationToken ct);
    Task<CorrectionBatchDetail?> GetCorrectionAsync(Guid correctionBatchId, CancellationToken ct);
    Task<IReadOnlyList<CorrectionBatchSummary>> GetCorrectionsForRunAsync(Guid originalRunId, CancellationToken ct);
}
