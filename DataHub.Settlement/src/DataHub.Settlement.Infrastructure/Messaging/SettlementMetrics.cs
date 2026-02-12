using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace DataHub.Settlement.Infrastructure.Messaging;

/// <summary>
/// Custom metrics for the settlement system, exported via OpenTelemetry.
/// </summary>
public sealed class SettlementMetrics
{
    public static readonly string MeterName = "DataHub.Settlement";

    private readonly Counter<long> _messagesProcessed;
    private readonly Counter<long> _messagesDeadLettered;
    private readonly Counter<long> _messagesFailed;
    private readonly Histogram<double> _messageProcessingDuration;
    private readonly Counter<long> _invoicesCreated;
    private readonly Counter<long> _paymentsAllocated;
    private readonly Histogram<double> _paymentAmount;

    public SettlementMetrics(IMeterFactory? meterFactory = null)
    {
        var meter = meterFactory?.Create(MeterName) ?? new Meter(MeterName);

        _messagesProcessed = meter.CreateCounter<long>(
            "settlement.messages.processed",
            description: "Number of DataHub messages successfully processed");

        _messagesDeadLettered = meter.CreateCounter<long>(
            "settlement.messages.dead_lettered",
            description: "Number of DataHub messages sent to dead letter queue");

        _messagesFailed = meter.CreateCounter<long>(
            "settlement.messages.failed",
            description: "Number of DataHub messages that failed processing (will retry)");

        _messageProcessingDuration = meter.CreateHistogram<double>(
            "settlement.messages.processing_duration_ms",
            unit: "ms",
            description: "Duration of message processing in milliseconds");

        _invoicesCreated = meter.CreateCounter<long>(
            "settlement.invoices.created",
            description: "Number of invoices created");

        _paymentsAllocated = meter.CreateCounter<long>(
            "settlement.payments.allocated",
            description: "Number of payment allocations performed");

        _paymentAmount = meter.CreateHistogram<double>(
            "settlement.payments.amount_dkk",
            unit: "DKK",
            description: "Payment amounts allocated in DKK");
    }

    public void RecordMessageProcessed(string messageType, string queue)
    {
        var tags = new TagList { { "message_type", messageType }, { "queue", queue } };
        _messagesProcessed.Add(1, tags);
    }

    public void RecordMessageDeadLettered(string messageType, string queue)
    {
        var tags = new TagList { { "message_type", messageType }, { "queue", queue } };
        _messagesDeadLettered.Add(1, tags);
    }

    public void RecordMessageFailed(string messageType, string queue)
    {
        var tags = new TagList { { "message_type", messageType }, { "queue", queue } };
        _messagesFailed.Add(1, tags);
    }

    public void RecordMessageDuration(double durationMs, string messageType)
    {
        var tags = new TagList { { "message_type", messageType } };
        _messageProcessingDuration.Record(durationMs, tags);
    }

    public void RecordInvoiceCreated(string invoiceType)
    {
        var tags = new TagList { { "invoice_type", invoiceType } };
        _invoicesCreated.Add(1, tags);
    }

    public void RecordPaymentAllocated(decimal amount)
    {
        _paymentsAllocated.Add(1, default(TagList));
        _paymentAmount.Record((double)amount);
    }
}
