namespace DataHub.Settlement.Application.Lifecycle;

public record ProcessRequest(
    Guid Id,
    string ProcessType,
    string Gsrn,
    string Status,
    DateOnly? EffectiveDate,
    string? DatahubCorrelationId,
    bool CustomerDataReceived = false,
    bool TariffDataReceived = false);

public record ProcessEvent(
    Guid Id,
    Guid ProcessRequestId,
    DateTime OccurredAt,
    string EventType,
    string? Payload,
    string? Source);
