using DataHub.Settlement.Application.Eloverblik;

namespace DataHub.Settlement.Infrastructure.Eloverblik;

public sealed class MockEloverblikClient : IEloverblikClient
{
    // ~4,000 kWh/year: seasonal variation with higher winter consumption
    private static readonly decimal[] MonthlyKwhPattern =
    [
        420m,  // Jan
        380m,  // Feb
        350m,  // Mar
        300m,  // Apr
        250m,  // May
        220m,  // Jun
        200m,  // Jul
        210m,  // Aug
        280m,  // Sep
        340m,  // Oct
        400m,  // Nov
        450m,  // Dec
    ];

    public Task<EloverblikMeteringPoint?> GetMeteringPointAsync(string gsrn, CancellationToken ct)
    {
        var result = new EloverblikMeteringPoint(gsrn, "E17", "344", "flex", "connected");
        return Task.FromResult<EloverblikMeteringPoint?>(result);
    }

    public Task<IReadOnlyList<MonthlyConsumption>> GetHistoricalConsumptionAsync(string gsrn, int months, CancellationToken ct)
    {
        var result = new List<MonthlyConsumption>();
        var now = DateTime.UtcNow;

        for (var i = months; i >= 1; i--)
        {
            var date = now.AddMonths(-i);
            var patternIndex = date.Month - 1;
            result.Add(new MonthlyConsumption(date.Year, date.Month, MonthlyKwhPattern[patternIndex]));
        }

        return Task.FromResult<IReadOnlyList<MonthlyConsumption>>(result);
    }
}
