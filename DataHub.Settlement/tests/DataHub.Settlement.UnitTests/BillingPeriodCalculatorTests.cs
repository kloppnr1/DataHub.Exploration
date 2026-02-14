using DataHub.Settlement.Infrastructure.Billing;
using DataHub.Settlement.Infrastructure.Settlement;
using FluentAssertions;
using Xunit;

namespace DataHub.Settlement.UnitTests;

public class BillingPeriodCalculatorTests
{
    // ── Weekly: Monday–Sunday alignment ──

    [Fact]
    public void Weekly_sunday_movein_first_period_ends_same_day()
    {
        // Move-in on Sunday Feb 15 2026 — that's the last day of the Mon–Sun week,
        // so the first billing period is just that single Sunday.
        var moveIn = new DateOnly(2026, 2, 15); // Sunday
        moveIn.DayOfWeek.Should().Be(DayOfWeek.Sunday, "test assumes Sunday");

        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        periodEnd.Should().Be(moveIn, "Sunday is already the end of a Mon–Sun week");
    }

    [Fact]
    public void Weekly_sunday_movein_invoice_is_due_immediately()
    {
        // The period ends on Sunday itself. IsPeriodDue says periodEnd <= today,
        // so the invoice is due on that same Sunday (or any day after).
        var moveIn = new DateOnly(2026, 2, 15); // Sunday
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        InvoicingService.IsPeriodDue("weekly", periodEnd, moveIn)
            .Should().BeTrue("period ends on move-in day — invoice due immediately");
    }

    [Fact]
    public void Weekly_monday_movein_first_period_ends_on_sunday()
    {
        // Monday Feb 16 2026 — full week ahead, period ends Sunday Feb 22
        var moveIn = new DateOnly(2026, 2, 16); // Monday
        moveIn.DayOfWeek.Should().Be(DayOfWeek.Monday);

        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        periodEnd.Should().Be(new DateOnly(2026, 2, 22));
        periodEnd.DayOfWeek.Should().Be(DayOfWeek.Sunday);
    }

    [Fact]
    public void Weekly_wednesday_movein_first_period_ends_on_sunday()
    {
        // Wednesday Feb 18 2026 — period ends Sunday Feb 22
        var moveIn = new DateOnly(2026, 2, 18); // Wednesday
        moveIn.DayOfWeek.Should().Be(DayOfWeek.Wednesday);

        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        periodEnd.Should().Be(new DateOnly(2026, 2, 22));
        periodEnd.DayOfWeek.Should().Be(DayOfWeek.Sunday);
    }

    [Fact]
    public void Weekly_saturday_movein_first_period_ends_next_day()
    {
        // Saturday Feb 14 2026 — period ends Sunday Feb 15
        var moveIn = new DateOnly(2026, 2, 14); // Saturday
        moveIn.DayOfWeek.Should().Be(DayOfWeek.Saturday);

        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        periodEnd.Should().Be(new DateOnly(2026, 2, 15));
        periodEnd.DayOfWeek.Should().Be(DayOfWeek.Sunday);
    }

    [Fact]
    public void Weekly_monday_movein_invoice_not_due_until_sunday()
    {
        var moveIn = new DateOnly(2026, 2, 16); // Monday
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "weekly");

        // Friday during the week — not due yet
        InvoicingService.IsPeriodDue("weekly", periodEnd, new DateOnly(2026, 2, 20))
            .Should().BeFalse("period hasn't ended yet");

        // Sunday — due
        InvoicingService.IsPeriodDue("weekly", periodEnd, new DateOnly(2026, 2, 22))
            .Should().BeTrue("period ends on Sunday");
    }

    // ── Monthly ──

    [Fact]
    public void Monthly_mid_month_movein_first_period_ends_at_month_end()
    {
        var moveIn = new DateOnly(2026, 2, 15); // Sunday Feb 15
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "monthly");

        periodEnd.Should().Be(new DateOnly(2026, 2, 28));
    }

    [Fact]
    public void Monthly_first_day_first_period_ends_at_month_end()
    {
        var moveIn = new DateOnly(2026, 3, 1);
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "monthly");

        periodEnd.Should().Be(new DateOnly(2026, 3, 31));
    }

    // ── Quarterly ──

    [Fact]
    public void Quarterly_mid_quarter_movein_first_period_ends_at_quarter_end()
    {
        var moveIn = new DateOnly(2026, 2, 15);
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "quarterly");

        periodEnd.Should().Be(new DateOnly(2026, 3, 31), "Q1 ends March 31");
    }

    [Fact]
    public void Quarterly_q2_movein_first_period_ends_june_30()
    {
        var moveIn = new DateOnly(2026, 5, 10);
        var periodEnd = BillingPeriodCalculator.GetFirstPeriodEnd(moveIn, "quarterly");

        periodEnd.Should().Be(new DateOnly(2026, 6, 30));
    }

    // ── Invalid frequency ──

    [Fact]
    public void Throws_on_unknown_frequency()
    {
        var act = () => BillingPeriodCalculator.GetFirstPeriodEnd(new DateOnly(2026, 1, 1), "daily");

        act.Should().Throw<ArgumentException>().WithMessage("*daily*");
    }
}
