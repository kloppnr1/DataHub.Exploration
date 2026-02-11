using DataHub.Settlement.Infrastructure.Parsing;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class Rsm028ParserTests
{
    private readonly CimJsonParser _sut = new();

    private static string LoadFixture() =>
        File.ReadAllText(Path.Combine("..", "..", "..", "..", "..", "fixtures", "rsm028-customer-data.json"));

    [Fact]
    public void ParseRsm028_extracts_message_id()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.MessageId.Should().Be("msg-rsm028-001");
    }

    [Fact]
    public void ParseRsm028_extracts_gsrn()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.MeteringPointId.Should().Be("571313100000012345");
    }

    [Fact]
    public void ParseRsm028_extracts_customer_name()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.CustomerName.Should().Be("Anders Hansen");
    }

    [Fact]
    public void ParseRsm028_extracts_cpr_cvr()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.CprCvr.Should().Be("1234567890");
    }

    [Fact]
    public void ParseRsm028_extracts_customer_type()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.CustomerType.Should().Be("person");
    }

    [Fact]
    public void ParseRsm028_extracts_contact_details()
    {
        var result = _sut.ParseRsm028(LoadFixture());

        result.Phone.Should().Be("+45 12345678");
        result.Email.Should().Be("anders.hansen@example.dk");
    }
}
