namespace DataHub.Settlement.Application.Metering;

/// <summary>
/// A single spot price data point. PricePerKwh is stored in øre/kWh.
/// Resolution is PT1H (hourly, pre-Oct 2025) or PT15M (quarter-hourly, post-Oct 2025).
/// </summary>
public record SpotPriceRow(string PriceArea, DateTime Timestamp, decimal PricePerKwh, string Resolution = "PT1H");

public record SpotPricePagedResult(
    IReadOnlyList<SpotPriceRow> Items,
    int TotalCount,
    decimal AvgPrice,
    decimal MinPrice,
    decimal MaxPrice);

public record SpotPriceDualRow(DateTime Timestamp, decimal? PriceDk1, decimal? PriceDk2, string Resolution);

public record SpotPriceDualResult(
    IReadOnlyList<SpotPriceDualRow> Items,
    int TotalCount,
    decimal AvgPriceDk1, decimal MinPriceDk1, decimal MaxPriceDk1,
    decimal AvgPriceDk2, decimal MinPriceDk2, decimal MaxPriceDk2);

public record SpotPriceStatus(
    DateOnly? LatestDate,
    DateTime? LastFetchedAt,
    bool HasTomorrow,
    string Status);
