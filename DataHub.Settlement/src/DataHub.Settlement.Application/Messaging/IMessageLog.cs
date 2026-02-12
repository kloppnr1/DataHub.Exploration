namespace DataHub.Settlement.Application.Messaging;

public interface IMessageLog
{
    Task<bool> IsProcessedAsync(string messageId, CancellationToken ct);
    Task MarkProcessedAsync(string messageId, CancellationToken ct);
    /// <summary>
    /// Atomically claims a message for processing using INSERT ... ON CONFLICT DO NOTHING.
    /// Returns true if this caller won the claim (insert succeeded), false if already claimed.
    /// </summary>
    Task<bool> TryClaimForProcessingAsync(string messageId, CancellationToken ct);
    Task RecordInboundAsync(string messageId, string messageType, string? correlationId, string queueName, int payloadSize, string rawPayload, CancellationToken ct);
    Task MarkInboundStatusAsync(string messageId, string status, string? errorDetails, CancellationToken ct);
    Task DeadLetterAsync(string messageId, string queueName, string errorReason, string rawPayload, CancellationToken ct);
    Task ClearClaimAsync(string messageId, CancellationToken ct);
}
