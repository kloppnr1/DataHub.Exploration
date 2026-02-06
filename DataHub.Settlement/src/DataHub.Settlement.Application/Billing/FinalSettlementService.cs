using DataHub.Settlement.Application.Settlement;

namespace DataHub.Settlement.Application.Billing;

public record FinalSettlementResult(
    SettlementResult Settlement,
    decimal? AcontoPaid,
    decimal? AcontoDifference,
    decimal TotalDue);

public sealed class FinalSettlementService
{
    private readonly ISettlementEngine _engine;

    public FinalSettlementService(ISettlementEngine engine)
    {
        _engine = engine;
    }

    /// <summary>
    /// Runs final settlement for a partial period (e.g. offboarding mid-month).
    /// For aconto customers, includes reconciliation of paid amounts.
    /// </summary>
    public FinalSettlementResult CalculateFinal(
        SettlementRequest request,
        decimal? acontoPaid)
    {
        var settlement = _engine.Calculate(request);

        if (acontoPaid.HasValue)
        {
            var difference = settlement.Total - acontoPaid.Value;
            return new FinalSettlementResult(settlement, acontoPaid.Value, difference, difference);
        }

        return new FinalSettlementResult(settlement, null, null, settlement.Total);
    }
}
