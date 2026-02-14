namespace DataHub.Settlement.Infrastructure.Settlement;

/// <summary>
/// Calculates billing period boundaries based on frequency.
/// Weekly periods align to Danish weeks (Monday–Sunday).
/// </summary>
public static class BillingPeriodCalculator
{
    /// <summary>
    /// Returns the end date (inclusive) of the first billing period given a start date and frequency.
    /// </summary>
    public static DateOnly GetFirstPeriodEnd(DateOnly startDate, string billingFrequency)
        => billingFrequency switch
        {
            "weekly" => GetWeekEnd(startDate),
            "monthly" => GetMonthEnd(startDate),
            "quarterly" => GetQuarterEnd(startDate),
            _ => throw new ArgumentException($"Unknown billing frequency: {billingFrequency}")
        };

    /// <summary>End of the Monday–Sunday week containing the given date.</summary>
    private static DateOnly GetWeekEnd(DateOnly date)
    {
        // DayOfWeek: Sunday=0 .. Saturday=6
        // Danish week: Monday=start, Sunday=end
        // daysUntilSunday: Monday→6, Tuesday→5, ... Saturday→1, Sunday→0
        var daysUntilSunday = ((int)DayOfWeek.Sunday - (int)date.DayOfWeek + 7) % 7;
        return date.AddDays(daysUntilSunday);
    }

    /// <summary>Last day of the calendar month containing the given date.</summary>
    private static DateOnly GetMonthEnd(DateOnly date)
        => new(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));

    /// <summary>Last day of the calendar quarter containing the given date.</summary>
    private static DateOnly GetQuarterEnd(DateOnly date)
    {
        var quarterMonth = ((date.Month - 1) / 3 + 1) * 3;
        return new DateOnly(date.Year, quarterMonth, DateTime.DaysInMonth(date.Year, quarterMonth));
    }
}
