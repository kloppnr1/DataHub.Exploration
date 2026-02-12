using DataHub.Settlement.Application.Messaging;

namespace DataHub.Settlement.IntegrationTests;

/// <summary>
/// No-op IMessageRepository for tests that don't care about message recording.
/// </summary>
public sealed class NullMessageRepository : IMessageRepository
{
    public Task RecordOutboundRequestAsync(string processType, string gsrn, string correlationId, string status, string? rawPayload, CancellationToken ct)
        => Task.CompletedTask;

    public Task<Application.Common.PagedResult<InboundMessageSummary>> GetInboundMessagesAsync(MessageFilter filter, int page, int pageSize, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<InboundMessageDetail?> GetInboundMessageAsync(Guid messageId, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<Application.Common.PagedResult<OutboundRequestSummary>> GetOutboundRequestsAsync(OutboundFilter filter, int page, int pageSize, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<OutboundRequestDetail?> GetOutboundRequestAsync(Guid requestId, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<Application.Common.PagedResult<DeadLetterSummary>> GetDeadLettersAsync(bool? resolvedOnly, int page, int pageSize, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<DeadLetterDetail?> GetDeadLetterAsync(Guid deadLetterId, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<MessageStats> GetMessageStatsAsync(CancellationToken ct)
        => throw new NotImplementedException();
    public Task<Application.Common.PagedResult<ConversationSummary>> GetConversationsAsync(int page, int pageSize, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<ConversationDetail?> GetConversationAsync(string correlationId, CancellationToken ct)
        => throw new NotImplementedException();
    public Task<IReadOnlyList<DataDeliverySummary>> GetDataDeliveriesAsync(CancellationToken ct)
        => throw new NotImplementedException();
    public Task ResolveDeadLetterAsync(Guid id, string resolvedBy, CancellationToken ct)
        => Task.CompletedTask;
}
