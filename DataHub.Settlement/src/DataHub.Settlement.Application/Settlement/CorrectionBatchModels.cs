namespace DataHub.Settlement.Application.Settlement;

public record CorrectionBatchSummary(
    Guid CorrectionBatchId,
    string MeteringPointId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    Guid? OriginalRunId,
    decimal TotalDeltaKwh,
    decimal Subtotal,
    decimal VatAmount,
    decimal Total,
    string TriggerType,
    string Status,
    string? Note,
    DateTime CreatedAt);

public record CorrectionBatchDetail(
    Guid CorrectionBatchId,
    string MeteringPointId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    Guid? OriginalRunId,
    decimal TotalDeltaKwh,
    decimal Subtotal,
    decimal VatAmount,
    decimal Total,
    string TriggerType,
    string Status,
    string? Note,
    DateTime CreatedAt,
    IReadOnlyList<CorrectionLineDetail> Lines);

public record CorrectionLineDetail(Guid Id, string ChargeType, decimal DeltaKwh, decimal DeltaAmount);

public record TriggerCorrectionRequest(string MeteringPointId, DateOnly PeriodStart, DateOnly PeriodEnd, string? Note);
