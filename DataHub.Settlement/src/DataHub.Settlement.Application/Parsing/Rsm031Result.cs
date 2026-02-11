namespace DataHub.Settlement.Application.Parsing;

public record Rsm031Result(
    string MessageId,
    string MeteringPointId,
    IReadOnlyList<TariffAttachment> Tariffs);

public record TariffAttachment(
    string TariffId,
    string TariffType,
    DateOnly ValidFrom,
    DateOnly? ValidTo);
