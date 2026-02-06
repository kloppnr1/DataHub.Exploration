namespace DataHub.Settlement.Application.Eloverblik;

public record EloverblikMeteringPoint(
    string Gsrn,
    string Type,
    string GridAreaCode,
    string SettlementMethod,
    string ConnectionStatus);

public record MonthlyConsumption(
    int Year,
    int Month,
    decimal TotalKwh);
