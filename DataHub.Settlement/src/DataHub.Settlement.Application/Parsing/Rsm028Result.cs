namespace DataHub.Settlement.Application.Parsing;

public record Rsm028Result(
    string MessageId,
    string MeteringPointId,
    string CustomerName,
    string CprCvr,
    string CustomerType,
    string? Phone,
    string? Email);
