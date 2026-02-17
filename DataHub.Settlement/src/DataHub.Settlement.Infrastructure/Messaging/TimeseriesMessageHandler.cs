using DataHub.Settlement.Application.DataHub;
using DataHub.Settlement.Application.Metering;
using DataHub.Settlement.Application.Messaging;
using DataHub.Settlement.Application.Parsing;
using DataHub.Settlement.Application.Settlement;
using DataHub.Settlement.Infrastructure.Settlement;
using Microsoft.Extensions.Logging;

namespace DataHub.Settlement.Infrastructure.Messaging;

public sealed class TimeseriesMessageHandler : IMessageHandler
{
    private readonly ICimParser _parser;
    private readonly IMeteringDataRepository _meteringRepo;
    private readonly SettlementTriggerService? _settlementTrigger;
    private readonly ICorrectionService? _correctionService;
    private readonly ILogger<TimeseriesMessageHandler> _logger;

    public TimeseriesMessageHandler(
        ICimParser parser,
        IMeteringDataRepository meteringRepo,
        ILogger<TimeseriesMessageHandler> logger,
        SettlementTriggerService? settlementTrigger = null,
        ICorrectionService? correctionService = null)
    {
        _parser = parser;
        _meteringRepo = meteringRepo;
        _logger = logger;
        _settlementTrigger = settlementTrigger;
        _correctionService = correctionService;
    }

    public QueueName Queue => QueueName.Timeseries;

    public async Task HandleAsync(DataHubMessage message, CancellationToken ct)
    {
        var seriesList = _parser.ParseRsm012(message.RawPayload);
        var processedGsrns = new HashSet<string>();
        // Track time range of changed readings per GSRN for auto-correction
        var changedRanges = new Dictionary<string, (DateTime Min, DateTime Max)>();

        foreach (var series in seriesList)
        {
            var regTimestamp = series.RegistrationTimestamp.UtcDateTime;

            var validPoints = new List<MeteringDataRow>();
            foreach (var p in series.Points)
            {
                if (p.QuantityKwh < 0)
                {
                    _logger.LogWarning(
                        "Skipping negative quantity {Quantity} kWh at position {Position} for {Gsrn}",
                        p.QuantityKwh, p.Position, series.MeteringPointId);
                    continue;
                }

                validPoints.Add(new MeteringDataRow(
                    p.Timestamp.UtcDateTime, series.Resolution, p.QuantityKwh, p.QualityCode,
                    series.TransactionId, regTimestamp));
            }

            if (validPoints.Count == 0)
                continue;

            var changedCount = await _meteringRepo.StoreTimeSeriesWithHistoryAsync(series.MeteringPointId, validPoints, ct);
            processedGsrns.Add(series.MeteringPointId);

            if (changedCount > 0)
            {
                _logger.LogInformation(
                    "Detected {ChangedCount} corrected readings for {Gsrn} — triggering auto-correction",
                    changedCount, series.MeteringPointId);

                // Track min/max timestamps of the points in this series for correction range
                var timestamps = validPoints.Select(p => p.Timestamp).ToList();
                var min = timestamps.Min();
                var max = timestamps.Max();

                if (changedRanges.TryGetValue(series.MeteringPointId, out var existing))
                {
                    changedRanges[series.MeteringPointId] = (
                        existing.Min < min ? existing.Min : min,
                        existing.Max > max ? existing.Max : max);
                }
                else
                {
                    changedRanges[series.MeteringPointId] = (min, max);
                }
            }
        }

        // Trigger normal settlement for new data
        if (_settlementTrigger is not null)
        {
            foreach (var gsrn in processedGsrns)
            {
                try
                {
                    await _settlementTrigger.TrySettleAsync(gsrn, ct);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "RSM-012 triggered settlement failed for GSRN {Gsrn}", gsrn);
                }
            }
        }

        // Trigger auto-corrections for changed readings
        if (_correctionService is not null)
        {
            foreach (var (gsrn, range) in changedRanges)
            {
                try
                {
                    var count = await _correctionService.TriggerAutoCorrectionsAsync(gsrn, range.Min, range.Max, ct);
                    if (count > 0)
                    {
                        _logger.LogInformation(
                            "Auto-correction: {Count} correction(s) created for GSRN {Gsrn}",
                            count, gsrn);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Auto-correction failed for GSRN {Gsrn}", gsrn);
                }
            }
        }
    }
}
