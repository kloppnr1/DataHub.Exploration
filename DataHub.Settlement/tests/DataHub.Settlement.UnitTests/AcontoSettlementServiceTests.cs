using DataHub.Settlement.Application.Billing;
using DataHub.Settlement.Application.Metering;
using DataHub.Settlement.Application.Settlement;
using DataHub.Settlement.Application.Tariff;
using DataHub.Settlement.Infrastructure.Settlement;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class AcontoSettlementServiceTests
{
    private static readonly SettlementEngine Engine = new();
    private readonly AcontoSettlementService _sut = new(Engine);

    private static SettlementRequest BuildJanuaryRequest()
    {
        var consumption = new List<MeteringDataRow>();
        var spotPrices = new List<SpotPriceRow>();
        var start = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        for (var i = 0; i < 744; i++)
        {
            var ts = start.AddHours(i);
            var hour = ts.Hour;
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
            consumption.Add(new MeteringDataRow(ts, "PT1H", kwh, "A03", "test"));
            spotPrices.Add(new SpotPriceRow("DK1", ts, spot));
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
            new DateOnly(2025, 1, 1), new DateOnly(2025, 2, 1),
            consumption, spotPrices, gridRates,
            0.054m, 0.049m, 0.008m,
            49.00m, 0.04m, 0m, 39.00m);
    }

    [Fact]
    public void Underpayment_produces_positive_difference()
    {
        var request = BuildJanuaryRequest();
        // Golden master total is 793.14 DKK; aconto paid less
        var result = _sut.CalculateQuarterlyInvoice(request, totalAcontoPaid: 700.00m, newQuarterlyEstimate: 800.00m);

        result.PreviousQuarter.ActualSettlement.Total.Should().Be(793.14m);
        result.PreviousQuarter.TotalAcontoPaid.Should().Be(700.00m);
        result.PreviousQuarter.Difference.Should().Be(93.14m);
        result.NewAcontoAmount.Should().Be(800.00m);
        result.TotalDue.Should().Be(893.14m); // 93.14 + 800.00
    }

    [Fact]
    public void Overpayment_produces_negative_difference()
    {
        var request = BuildJanuaryRequest();
        var result = _sut.CalculateQuarterlyInvoice(request, totalAcontoPaid: 900.00m, newQuarterlyEstimate: 800.00m);

        result.PreviousQuarter.Difference.Should().Be(-106.86m); // 793.14 - 900.00
        result.TotalDue.Should().Be(693.14m); // -106.86 + 800.00
    }

    [Fact]
    public void Exact_payment_produces_zero_difference()
    {
        var request = BuildJanuaryRequest();
        var result = _sut.CalculateQuarterlyInvoice(request, totalAcontoPaid: 793.14m, newQuarterlyEstimate: 800.00m);

        result.PreviousQuarter.Difference.Should().Be(0m);
        result.TotalDue.Should().Be(800.00m);
    }
}
