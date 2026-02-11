using DataHub.Settlement.Infrastructure.Parsing;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class Rsm031ParserTests
{
    private readonly CimJsonParser _sut = new();

    private static string LoadFixture() =>
        File.ReadAllText(Path.Combine("..", "..", "..", "..", "..", "fixtures", "rsm031-price-attachments.json"));

    [Fact]
    public void ParseRsm031_extracts_message_id()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.MessageId.Should().Be("msg-rsm031-001");
    }

    [Fact]
    public void ParseRsm031_extracts_gsrn()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.MeteringPointId.Should().Be("571313100000012345");
    }

    [Fact]
    public void ParseRsm031_extracts_three_tariffs()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.Tariffs.Should().HaveCount(3);
    }

    [Fact]
    public void ParseRsm031_extracts_tariff_ids_and_types()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.Tariffs[0].TariffId.Should().Be("40000");
        result.Tariffs[0].TariffType.Should().Be("grid");

        result.Tariffs[1].TariffId.Should().Be("45013");
        result.Tariffs[1].TariffType.Should().Be("transmission");

        result.Tariffs[2].TariffId.Should().Be("40010");
        result.Tariffs[2].TariffType.Should().Be("system");
    }

    [Fact]
    public void ParseRsm031_extracts_valid_from()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.Tariffs[0].ValidFrom.Should().Be(new DateOnly(2025, 1, 1));
    }

    [Fact]
    public void ParseRsm031_extracts_valid_to_when_present()
    {
        var result = _sut.ParseRsm031(LoadFixture());

        result.Tariffs[0].ValidTo.Should().BeNull();
        result.Tariffs[1].ValidTo.Should().Be(new DateOnly(2025, 12, 31));
    }
}
