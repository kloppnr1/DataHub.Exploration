namespace DataHub.Settlement.Application.Lifecycle;

public record ProcessRequest(
    Guid Id,
    string ProcessType,
    string Gsrn,
    string Status,
    DateOnly? EffectiveDate,
    string? DatahubCorrelationId,
    string? CancelCorrelationId = null);

public record ProcessEvent(
    Guid Id,
    Guid ProcessRequestId,
    DateTime OccurredAt,
    string EventType,
    string? Payload,
    string? Source);
