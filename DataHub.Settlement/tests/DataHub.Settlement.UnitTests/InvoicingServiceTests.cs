using DataHub.Settlement.Infrastructure.Billing;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class InvoicingServiceTests
{
    [Fact]
    public void Skips_runs_when_monthly_period_not_yet_due()
    {
        // Period ends Feb 28, today is Feb 15 — not due yet
        var periodEnd = new DateOnly(2025, 2, 28);
        var today = new DateOnly(2025, 2, 15);

        InvoicingService.IsPeriodDue("monthly", periodEnd, today).Should().BeFalse();
    }

    [Fact]
    public void Creates_invoice_when_monthly_period_due()
    {
        // Period ends Jan 31, today is Feb 1 — due
        var periodEnd = new DateOnly(2025, 1, 31);
        var today = new DateOnly(2025, 2, 1);

        InvoicingService.IsPeriodDue("monthly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Creates_invoice_when_monthly_period_end_equals_today()
    {
        // Period ends Jan 31, today is Jan 31 — due (periodEnd <= today)
        var periodEnd = new DateOnly(2025, 1, 31);
        var today = new DateOnly(2025, 1, 31);

        InvoicingService.IsPeriodDue("monthly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Creates_invoice_when_quarterly_period_due()
    {
        // Q1 period ends March 15, quarter end is March 31, today is April 1 — due
        var periodEnd = new DateOnly(2025, 3, 15);
        var today = new DateOnly(2025, 4, 1);

        InvoicingService.IsPeriodDue("quarterly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Skips_when_quarterly_period_not_yet_due()
    {
        // Q1 period ends Feb 28, quarter end is March 31, today is March 15 — not due
        var periodEnd = new DateOnly(2025, 2, 28);
        var today = new DateOnly(2025, 3, 15);

        InvoicingService.IsPeriodDue("quarterly", periodEnd, today).Should().BeFalse();
    }

    [Fact]
    public void Quarterly_q2_due_after_june_30()
    {
        var periodEnd = new DateOnly(2025, 5, 31);
        var today = new DateOnly(2025, 7, 1);

        InvoicingService.IsPeriodDue("quarterly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Quarterly_q4_due_after_dec_31()
    {
        var periodEnd = new DateOnly(2025, 11, 30);
        var today = new DateOnly(2026, 1, 1);

        InvoicingService.IsPeriodDue("quarterly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Quarterly_not_due_on_quarter_end_day()
    {
        // Quarter end is March 31, today is March 31 — not due (today > quarterEnd required)
        var periodEnd = new DateOnly(2025, 3, 15);
        var today = new DateOnly(2025, 3, 31);

        InvoicingService.IsPeriodDue("quarterly", periodEnd, today).Should().BeFalse();
    }

    [Fact]
    public void Weekly_due_after_sunday()
    {
        // Week Mon Jan 6 – Sun Jan 12, today is Mon Jan 13 — due
        var periodEnd = new DateOnly(2025, 1, 12); // Sunday
        var today = new DateOnly(2025, 1, 13);

        InvoicingService.IsPeriodDue("weekly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Weekly_due_on_sunday()
    {
        // Week Mon Jan 6 – Sun Jan 12, today is Sun Jan 12 — due (periodEnd <= today)
        var periodEnd = new DateOnly(2025, 1, 12); // Sunday
        var today = new DateOnly(2025, 1, 12);

        InvoicingService.IsPeriodDue("weekly", periodEnd, today).Should().BeTrue();
    }

    [Fact]
    public void Weekly_not_due_before_period_end()
    {
        // Week Mon Jan 6 – Sun Jan 12, today is Fri Jan 10 — not due
        var periodEnd = new DateOnly(2025, 1, 12); // Sunday
        var today = new DateOnly(2025, 1, 10);

        InvoicingService.IsPeriodDue("weekly", periodEnd, today).Should().BeFalse();
    }

    // ── GetAcontoPeriodEnd uses BillingFrequency (not a separate AcontoFrequency) ──

    [Theory]
    [InlineData("weekly")]
    [InlineData("monthly")]
    [InlineData("quarterly")]
    public void GetAcontoPeriodEnd_accepts_all_valid_billing_frequencies(string frequency)
    {
        var date = new DateOnly(2026, 2, 15);

        var result = InvoicingService.GetAcontoPeriodEnd(date, frequency);

        result.Should().BeAfter(date);
    }

    [Fact]
    public void GetAcontoPeriodEnd_monthly_returns_first_of_next_month()
    {
        var date = new DateOnly(2026, 2, 15);

        var result = InvoicingService.GetAcontoPeriodEnd(date, "monthly");

        result.Should().Be(new DateOnly(2026, 3, 1));
    }

    [Fact]
    public void GetAcontoPeriodEnd_quarterly_returns_first_of_next_quarter()
    {
        var date = new DateOnly(2026, 2, 15);

        var result = InvoicingService.GetAcontoPeriodEnd(date, "quarterly");

        result.Should().Be(new DateOnly(2026, 4, 1));
    }

    [Fact]
    public void GetAcontoPeriodEnd_weekly_returns_next_monday()
    {
        // Feb 15 2026 is a Sunday
        var date = new DateOnly(2026, 2, 15);

        var result = InvoicingService.GetAcontoPeriodEnd(date, "weekly");

        result.Should().Be(new DateOnly(2026, 2, 16)); // Monday
        result.DayOfWeek.Should().Be(DayOfWeek.Monday);
    }

    [Fact]
    public void GetAcontoPeriodEnd_chained_quarterly_gives_successive_quarters()
    {
        // Simulates the aconto flow: first period boundary → next period boundary
        var start = new DateOnly(2026, 1, 15);
        var firstEnd = InvoicingService.GetAcontoPeriodEnd(start, "quarterly");
        var secondEnd = InvoicingService.GetAcontoPeriodEnd(firstEnd, "quarterly");

        firstEnd.Should().Be(new DateOnly(2026, 4, 1));
        secondEnd.Should().Be(new DateOnly(2026, 7, 1));
    }

    [Fact]
    public void GetAcontoPeriodEnd_chained_monthly_gives_successive_months()
    {
        var start = new DateOnly(2026, 1, 15);
        var firstEnd = InvoicingService.GetAcontoPeriodEnd(start, "monthly");
        var secondEnd = InvoicingService.GetAcontoPeriodEnd(firstEnd, "monthly");

        firstEnd.Should().Be(new DateOnly(2026, 2, 1));
        secondEnd.Should().Be(new DateOnly(2026, 3, 1));
    }

    [Fact]
    public void GetAcontoPeriodEnd_chained_weekly_gives_successive_weeks()
    {
        var start = new DateOnly(2026, 2, 16); // Monday
        var firstEnd = InvoicingService.GetAcontoPeriodEnd(start, "weekly");
        var secondEnd = InvoicingService.GetAcontoPeriodEnd(firstEnd, "weekly");

        firstEnd.Should().Be(new DateOnly(2026, 2, 23)); // next Monday
        secondEnd.Should().Be(new DateOnly(2026, 3, 2)); // Monday after that
    }

    // ── UninvoicedRun record no longer has AcontoFrequency field ──

    [Fact]
    public void UninvoicedRun_uses_BillingFrequency_for_all_fields()
    {
        // Verify the record shape — no AcontoFrequency parameter
        var run = new InvoicingService.UninvoicedRun(
            Guid.NewGuid(), Guid.NewGuid(), "571313100000012345",
            new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1),
            Guid.NewGuid(), null, Guid.NewGuid(),
            "quarterly", "aconto");

        run.BillingFrequency.Should().Be("quarterly");
        run.PaymentModel.Should().Be("aconto");
    }
}
