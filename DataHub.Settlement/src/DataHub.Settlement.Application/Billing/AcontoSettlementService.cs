using DataHub.Settlement.Application.Settlement;

namespace DataHub.Settlement.Application.Billing;

public sealed class AcontoSettlementService
{
    private readonly ISettlementEngine _engine;

    public AcontoSettlementService(ISettlementEngine engine)
    {
        _engine = engine;
    }

    /// <summary>
    /// Runs settlement for the quarter, compares to aconto paid, and produces a combined invoice.
    /// </summary>
    public CombinedQuarterlyInvoice CalculateQuarterlyInvoice(
        SettlementRequest request,
        decimal totalAcontoPaid,
        decimal newQuarterlyEstimate)
    {
        var actual = _engine.Calculate(request);
        var difference = actual.Total - totalAcontoPaid;

        var acontoResult = new AcontoSettlementResult(
            actual, totalAcontoPaid, difference, newQuarterlyEstimate);

        // Total due = settlement difference + next quarter aconto
        var totalDue = difference + newQuarterlyEstimate;

        return new CombinedQuarterlyInvoice(acontoResult, newQuarterlyEstimate, totalDue);
    }
}
