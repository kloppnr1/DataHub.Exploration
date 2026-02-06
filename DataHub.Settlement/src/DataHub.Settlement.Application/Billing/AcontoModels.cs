using DataHub.Settlement.Application.Settlement;

namespace DataHub.Settlement.Application.Billing;

public record AcontoPayment(Guid Id, string Gsrn, DateOnly PeriodStart, DateOnly PeriodEnd, decimal Amount);

public record AcontoSettlementResult(
    SettlementResult ActualSettlement,
    decimal TotalAcontoPaid,
    decimal Difference,
    decimal NewQuarterlyEstimate);

public record CombinedQuarterlyInvoice(
    AcontoSettlementResult PreviousQuarter,
    decimal NewAcontoAmount,
    decimal TotalDue);
