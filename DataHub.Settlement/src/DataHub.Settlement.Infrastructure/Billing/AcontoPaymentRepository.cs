using Dapper;
using DataHub.Settlement.Application.Billing;
using Npgsql;

namespace DataHub.Settlement.Infrastructure.Billing;

public sealed class AcontoPaymentRepository : IAcontoPaymentRepository
{
    private readonly string _connectionString;

    static AcontoPaymentRepository()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
        Database.DapperTypeHandlers.Register();
    }

    public AcontoPaymentRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<AcontoPayment> RecordPaymentAsync(string gsrn, DateOnly periodStart, DateOnly periodEnd, decimal amount, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO billing.aconto_payment (gsrn, period_start, period_end, amount)
            VALUES (@Gsrn, @PeriodStart, @PeriodEnd, @Amount)
            RETURNING id, gsrn, period_start, period_end, amount
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        return await conn.QuerySingleAsync<AcontoPayment>(
            new CommandDefinition(sql,
                new { Gsrn = gsrn, PeriodStart = periodStart, PeriodEnd = periodEnd, Amount = amount },
                cancellationToken: ct));
    }

    public async Task<IReadOnlyList<AcontoPayment>> GetPaymentsAsync(string gsrn, DateOnly from, DateOnly to, CancellationToken ct)
    {
        const string sql = """
            SELECT id, gsrn, period_start, period_end, amount
            FROM billing.aconto_payment
            WHERE gsrn = @Gsrn AND period_start >= @From AND period_end <= @To
            ORDER BY period_start
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        var result = await conn.QueryAsync<AcontoPayment>(
            new CommandDefinition(sql, new { Gsrn = gsrn, From = from, To = to }, cancellationToken: ct));
        return result.ToList();
    }

    public async Task<decimal> GetTotalPaidAsync(string gsrn, DateOnly from, DateOnly to, CancellationToken ct)
    {
        const string sql = """
            SELECT COALESCE(SUM(amount), 0)
            FROM billing.aconto_payment
            WHERE gsrn = @Gsrn AND period_start >= @From AND period_end <= @To
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        return await conn.QuerySingleAsync<decimal>(
            new CommandDefinition(sql, new { Gsrn = gsrn, From = from, To = to }, cancellationToken: ct));
    }
}
