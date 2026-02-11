using DataHub.Settlement.Infrastructure.Parsing;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class CimJsonParserRsm004ReasonCodeTests
{
    private readonly CimJsonParser _sut = new();

    private static string LoadFixture(string name) =>
        File.ReadAllText(Path.Combine("..", "..", "..", "..", "..", "fixtures", name));

    [Fact]
    public void ParseRsm004_without_reason_returns_null_reason_code()
    {
        var json = LoadFixture("rsm004-grid-area-change.json");

        var result = _sut.ParseRsm004(json);

        result.ReasonCode.Should().BeNull();
    }

    [Fact]
    public void ParseRsm004_D11_extracts_reason_code()
    {
        var json = LoadFixture("rsm004-auto-cancel-d11.json");

        var result = _sut.ParseRsm004(json);

        result.ReasonCode.Should().Be("D11");
    }

    [Fact]
    public void ParseRsm004_D11_extracts_gsrn()
    {
        var json = LoadFixture("rsm004-auto-cancel-d11.json");

        var result = _sut.ParseRsm004(json);

        result.Gsrn.Should().Be("571313100000012345");
    }

    [Fact]
    public void ParseRsm004_D11_extracts_effective_date()
    {
        var json = LoadFixture("rsm004-auto-cancel-d11.json");

        var result = _sut.ParseRsm004(json);

        result.EffectiveDate.Should().Be(DateTimeOffset.Parse("2025-02-01T00:00:00Z"));
    }
}
