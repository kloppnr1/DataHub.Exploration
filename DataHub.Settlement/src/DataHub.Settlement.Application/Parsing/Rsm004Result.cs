namespace DataHub.Settlement.Application.Parsing;

public record Rsm004Result(
    string Gsrn,
    string? NewGridAreaCode,
    string? NewSettlementMethod,
    string? NewConnectionStatus,
    DateTimeOffset EffectiveDate);
