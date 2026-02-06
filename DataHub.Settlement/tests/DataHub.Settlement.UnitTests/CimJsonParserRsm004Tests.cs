using DataHub.Settlement.Infrastructure.Parsing;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class CimJsonParserRsm004Tests
{
    private readonly CimJsonParser _sut = new();

    private static string LoadFixture(string name)
    {
        var path = Path.Combine(FindFixturesDir(), name);
        return File.ReadAllText(path);
    }

    private static string FindFixturesDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var fixtures = Path.Combine(dir.FullName, "fixtures");
            if (Directory.Exists(fixtures))
                return fixtures;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not find fixtures directory");
    }

    [Fact]
    public void Grid_area_change_parses_gsrn_and_new_grid_area()
    {
        var json = LoadFixture("rsm004-grid-area-change.json");

        var result = _sut.ParseRsm004(json);

        result.Gsrn.Should().Be("571313100000012345");
        result.NewGridAreaCode.Should().Be("740");
    }

    [Fact]
    public void Grid_area_change_parses_new_settlement_method()
    {
        var json = LoadFixture("rsm004-grid-area-change.json");

        var result = _sut.ParseRsm004(json);

        result.NewSettlementMethod.Should().Be("non_profiled");
    }

    [Fact]
    public void Grid_area_change_parses_effective_date()
    {
        var json = LoadFixture("rsm004-grid-area-change.json");

        var result = _sut.ParseRsm004(json);

        result.EffectiveDate.Should().Be(DateTimeOffset.Parse("2025-03-01T00:00:00Z"));
    }

    [Fact]
    public void Connection_status_is_null_when_not_present()
    {
        var json = LoadFixture("rsm004-grid-area-change.json");

        var result = _sut.ParseRsm004(json);

        result.NewConnectionStatus.Should().BeNull();
    }
}
