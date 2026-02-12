using DataHub.Settlement.Application.Metering;
using DataHub.Settlement.Application.Settlement;
using DataHub.Settlement.Application.Tariff;
using DataHub.Settlement.Infrastructure.Settlement;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

/// <summary>
/// Tests for critical financial correctness in SettlementEngine.
/// Covers: year-boundary subscription, missing spot prices, and VAT calculation.
/// </summary>
public class SettlementEngineFinancialTests
{
    private readonly SettlementEngine _engine = new();

    [Fact]
    public void Year_boundary_period_produces_positive_subscription_charge()
    {
        // Settlement period spanning Dec 15 → Jan 15 (crosses year boundary)
        // This previously used DayNumber (day-of-year) subtraction which would produce negative values.
        var periodStart = new DateOnly(2024, 12, 15);
        var periodEnd = new DateOnly(2025, 1, 15);

        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var start = new DateTime(2024, 12, 15, 0, 0, 0, DateTimeKind.Utc);
        var hours = (int)(new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc) - start).TotalHours;

        for (var i = 0; i < hours; i++)
        {
            var ts = start.AddHours(i);
            consumption.Add(new MeteringDataRow(ts, "PT1H", 0.5m, "E01", "tx-1", DateTime.UtcNow));
            spotPrices.Add(new SpotPriceRow("DK1", ts, 50m, "PT1H"));
        }

        var gridRates = Enumerable.Range(1, 24)
            .Select(h => new TariffRateRow(h, 0.20m))
            .ToList();

        var request = new SettlementRequest(
            "571313100000012345", periodStart, periodEnd,
            consumption, spotPrices, gridRates,
            SystemTariffRate: 0.054m,
            TransmissionTariffRate: 0.049m,
            ElectricityTaxRate: 0.008m,
            GridSubscriptionPerMonth: 50m,
            MarginPerKwh: 0.04m,
            SupplementPerKwh: 0m,
            SupplierSubscriptionPerMonth: 39m);

        var result = _engine.Calculate(request);

        // Key assertion: subscription charges must be positive
        result.Lines.First(l => l.ChargeType == "grid_subscription").Amount.Should().BePositive(
            "grid subscription must be positive even when period crosses year boundary");
        result.Lines.First(l => l.ChargeType == "supplier_subscription").Amount.Should().BePositive(
            "supplier subscription must be positive even when period crosses year boundary");

        // Total must also be positive
        result.Total.Should().BePositive();

        // Days in period should be 31 (Dec 15 → Jan 15)
        var expectedDays = 31;
        var daysInMonth = 31; // December
        var expectedProRata = (decimal)expectedDays / daysInMonth;
        var expectedGridSub = Math.Round(50m * expectedProRata, 2);
        result.Lines.First(l => l.ChargeType == "grid_subscription").Amount.Should().Be(expectedGridSub);
    }

    [Fact]
    public void Missing_spot_price_throws_instead_of_silent_zero()
    {
        // One consumption hour has no matching spot price
        var periodStart = new DateOnly(2025, 1, 1);
        var periodEnd = new DateOnly(2025, 1, 2);

        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var start = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        for (var i = 0; i < 24; i++)
        {
            var ts = start.AddHours(i);
            consumption.Add(new MeteringDataRow(ts, "PT1H", 0.5m, "E01", "tx-1", DateTime.UtcNow));

            // Skip hour 12 intentionally — no spot price
            if (i != 12)
            {
                spotPrices.Add(new SpotPriceRow("DK1", ts, 50m, "PT1H"));
            }
        }

        var gridRates = Enumerable.Range(1, 24)
            .Select(h => new TariffRateRow(h, 0.20m))
            .ToList();

        var request = new SettlementRequest(
            "571313100000012345", periodStart, periodEnd,
            consumption, spotPrices, gridRates,
            SystemTariffRate: 0.054m,
            TransmissionTariffRate: 0.049m,
            ElectricityTaxRate: 0.008m,
            GridSubscriptionPerMonth: 50m,
            MarginPerKwh: 0.04m,
            SupplementPerKwh: 0m,
            SupplierSubscriptionPerMonth: 39m);

        var act = () => _engine.Calculate(request);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Missing spot price*")
            .WithMessage("*2025-01-01 12:00*");
    }

    [Fact]
    public void Missing_spot_price_for_solar_production_credit_also_throws()
    {
        var periodStart = new DateOnly(2025, 6, 1);
        var periodEnd = new DateOnly(2025, 6, 2);

        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var production = new List<MeteringDataRow>();
        var start = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);

        for (var i = 0; i < 24; i++)
        {
            var ts = start.AddHours(i);
            consumption.Add(new MeteringDataRow(ts, "PT1H", 0.3m, "E01", "tx-1", DateTime.UtcNow));

            // Solar produces more than consumed during midday (excess production)
            if (i >= 10 && i <= 14)
                production.Add(new MeteringDataRow(ts, "PT1H", 2.0m, "E01", "tx-1", DateTime.UtcNow));

            // Skip hour 12 spot price — this is a production credit hour
            if (i != 12)
                spotPrices.Add(new SpotPriceRow("DK1", ts, 50m, "PT1H"));
        }

        var gridRates = Enumerable.Range(1, 24)
            .Select(h => new TariffRateRow(h, 0.20m))
            .ToList();

        var request = new SettlementRequest(
            "571313100000012345", periodStart, periodEnd,
            consumption, spotPrices, gridRates,
            SystemTariffRate: 0.054m,
            TransmissionTariffRate: 0.049m,
            ElectricityTaxRate: 0.008m,
            GridSubscriptionPerMonth: 50m,
            MarginPerKwh: 0.04m,
            SupplementPerKwh: 0m,
            SupplierSubscriptionPerMonth: 39m,
            Production: production);

        var act = () => _engine.Calculate(request);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Missing spot price*");
    }

    [Fact]
    public void Configurable_vat_rate_is_applied_correctly()
    {
        var engine = new SettlementEngine(vatRate: 0.20m); // 20% VAT instead of default 25%
        var periodStart = new DateOnly(2025, 1, 1);
        var periodEnd = new DateOnly(2025, 1, 2);

        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var start = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        for (var i = 0; i < 24; i++)
        {
            var ts = start.AddHours(i);
            consumption.Add(new MeteringDataRow(ts, "PT1H", 1.0m, "E01", "tx-1", DateTime.UtcNow));
            spotPrices.Add(new SpotPriceRow("DK1", ts, 100m, "PT1H")); // 1 DKK/kWh
        }

        var gridRates = Enumerable.Range(1, 24)
            .Select(h => new TariffRateRow(h, 0m))
            .ToList();

        var request = new SettlementRequest(
            "571313100000012345", periodStart, periodEnd,
            consumption, spotPrices, gridRates,
            SystemTariffRate: 0m,
            TransmissionTariffRate: 0m,
            ElectricityTaxRate: 0m,
            GridSubscriptionPerMonth: 0m,
            MarginPerKwh: 0m,
            SupplementPerKwh: 0m,
            SupplierSubscriptionPerMonth: 0m);

        var result = engine.Calculate(request);

        // 24 kWh × 1 DKK/kWh = 24 DKK subtotal
        result.Subtotal.Should().Be(24m);
        // 20% VAT = 4.80 DKK
        result.VatAmount.Should().Be(4.80m);
        result.Total.Should().Be(28.80m);
    }
}
