using DataHub.Settlement.Application.Billing;
using DataHub.Settlement.Application.Metering;
using DataHub.Settlement.Application.Settlement;
using DataHub.Settlement.Application.Tariff;
using DataHub.Settlement.Infrastructure.Settlement;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class FinalSettlementServiceTests
{
    private static readonly SettlementEngine Engine = new();
    private readonly FinalSettlementService _sut = new(Engine);

    private static SettlementRequest BuildPartialRequest(DateOnly start, DateOnly end)
    {
        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var current = start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDt = end.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        while (current < endDt)
        {
            var hour = current.Hour;
            var kwh = hour switch
            {
                >= 0 and <= 5 => 0.300m,
                >= 6 and <= 15 => 0.500m,
                >= 16 and <= 19 => 1.200m,
                _ => 0.400m,
            };
            var spot = hour switch
            {
                >= 0 and <= 5 => 45m,
                >= 6 and <= 15 => 85m,
                >= 16 and <= 19 => 125m,
                _ => 55m,
            };
            consumption.Add(new MeteringDataRow(current, "PT1H", kwh, "A03", "test"));
            spotPrices.Add(new SpotPriceRow("DK1", current, spot));
            current = current.AddHours(1);
        }

        var gridRates = Enumerable.Range(1, 24).Select(h => new TariffRateRow(h, h switch
        {
            >= 1 and <= 6 => 0.06m,
            >= 7 and <= 16 => 0.18m,
            >= 17 and <= 20 => 0.54m,
            _ => 0.06m,
        })).ToList();

        return new SettlementRequest(
            "571313100000012345",
            start, end,
            consumption, spotPrices, gridRates,
            0.054m, 0.049m, 0.008m,
            49.00m, 0.04m, 0m, 39.00m);
    }

    [Fact]
    public void Post_payment_customer_final_settlement_returns_full_amount()
    {
        // Jan 16 - Feb 1, 16 days, no aconto
        var request = BuildPartialRequest(new DateOnly(2025, 1, 16), new DateOnly(2025, 2, 1));

        var result = _sut.CalculateFinal(request, acontoPaid: null);

        result.AcontoPaid.Should().BeNull();
        result.AcontoDifference.Should().BeNull();
        result.TotalDue.Should().Be(result.Settlement.Total);
        result.Settlement.TotalKwh.Should().BeGreaterThan(0);
    }

    [Fact]
    public void Aconto_customer_final_settlement_with_reconciliation()
    {
        var request = BuildPartialRequest(new DateOnly(2025, 1, 16), new DateOnly(2025, 2, 1));

        var result = _sut.CalculateFinal(request, acontoPaid: 300.00m);

        result.AcontoPaid.Should().Be(300.00m);
        result.AcontoDifference.Should().Be(result.Settlement.Total - 300.00m);
        result.TotalDue.Should().Be(result.Settlement.Total - 300.00m);
    }
}
