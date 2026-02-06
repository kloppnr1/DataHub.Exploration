namespace DataHub.Settlement.Application.Metering;

/// <summary>PricePerKwh is stored in øre/kWh (as delivered by DDQ/DataHub).</summary>
public record SpotPriceRow(string PriceArea, DateTime Hour, decimal PricePerKwh);
