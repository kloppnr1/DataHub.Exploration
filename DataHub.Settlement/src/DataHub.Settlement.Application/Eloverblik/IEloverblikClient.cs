namespace DataHub.Settlement.Application.Eloverblik;

public interface IEloverblikClient
{
    Task<EloverblikMeteringPoint?> GetMeteringPointAsync(string gsrn, CancellationToken ct);
    Task<IReadOnlyList<MonthlyConsumption>> GetHistoricalConsumptionAsync(string gsrn, int months, CancellationToken ct);
}
