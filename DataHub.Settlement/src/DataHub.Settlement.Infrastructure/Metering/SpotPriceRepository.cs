using Dapper;
using DataHub.Settlement.Application.Metering;
using Npgsql;

namespace DataHub.Settlement.Infrastructure.Metering;

public sealed class SpotPriceRepository : ISpotPriceRepository
{
    private readonly string _connectionString;

    public SpotPriceRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task StorePricesAsync(IReadOnlyList<SpotPriceRow> prices, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO metering.spot_price (price_area, "timestamp", price_per_kwh, resolution)
            VALUES (@PriceArea, @Timestamp, @PricePerKwh, @Resolution)
            ON CONFLICT (price_area, "timestamp") DO UPDATE SET
                price_per_kwh = EXCLUDED.price_per_kwh,
                resolution = EXCLUDED.resolution,
                fetched_at = now()
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        await conn.ExecuteAsync(new CommandDefinition(sql, prices, cancellationToken: ct));
    }

    public async Task<decimal> GetPriceAsync(string priceArea, DateTime hour, CancellationToken ct)
    {
        const string sql = """
            SELECT price_per_kwh
            FROM metering.spot_price
            WHERE price_area = @PriceArea AND "timestamp" = @Timestamp
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        return await conn.QuerySingleAsync<decimal>(
            new CommandDefinition(sql, new { PriceArea = priceArea, Timestamp = hour }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<SpotPriceRow>> GetPricesAsync(
        string priceArea, DateTime from, DateTime to, CancellationToken ct)
    {
        const string sql = """
            SELECT price_area AS PriceArea, "timestamp" AS Timestamp, price_per_kwh AS PricePerKwh, resolution AS Resolution
            FROM metering.spot_price
            WHERE price_area = @PriceArea AND "timestamp" >= @From AND "timestamp" < @To
            ORDER BY "timestamp"
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<SpotPriceRow>(
            new CommandDefinition(sql, new { PriceArea = priceArea, From = from, To = to }, cancellationToken: ct));

        return rows.ToList();
    }

    public async Task<SpotPricePagedResult> GetPricesPagedAsync(
        string priceArea, DateTime from, DateTime to, int page, int pageSize, CancellationToken ct)
    {
        const string statsSql = """
            SELECT COUNT(*) AS TotalCount,
                   COALESCE(AVG(price_per_kwh), 0) AS AvgPrice,
                   COALESCE(MIN(price_per_kwh), 0) AS MinPrice,
                   COALESCE(MAX(price_per_kwh), 0) AS MaxPrice
            FROM metering.spot_price
            WHERE price_area = @PriceArea AND "timestamp" >= @From AND "timestamp" < @To
            """;

        const string dataSql = """
            SELECT price_area AS PriceArea, "timestamp" AS Timestamp, price_per_kwh AS PricePerKwh, resolution AS Resolution
            FROM metering.spot_price
            WHERE price_area = @PriceArea AND "timestamp" >= @From AND "timestamp" < @To
            ORDER BY "timestamp"
            LIMIT @Limit OFFSET @Offset
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var args = new { PriceArea = priceArea, From = from, To = to };
        var stats = await conn.QuerySingleAsync<(int TotalCount, decimal AvgPrice, decimal MinPrice, decimal MaxPrice)>(
            new CommandDefinition(statsSql, args, cancellationToken: ct));

        var offset = (page - 1) * pageSize;
        var rows = await conn.QueryAsync<SpotPriceRow>(
            new CommandDefinition(dataSql, new { PriceArea = priceArea, From = from, To = to, Limit = pageSize, Offset = offset }, cancellationToken: ct));

        return new SpotPricePagedResult(rows.ToList(), stats.TotalCount, stats.AvgPrice, stats.MinPrice, stats.MaxPrice);
    }

    public async Task<SpotPriceDualResult> GetPricesByDateAsync(DateOnly date, CancellationToken ct)
    {
        var from = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var to = date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        const string dataSql = """
            SELECT
                "timestamp" AS Timestamp,
                MAX(CASE WHEN price_area = 'DK1' THEN price_per_kwh END) AS PriceDk1,
                MAX(CASE WHEN price_area = 'DK2' THEN price_per_kwh END) AS PriceDk2,
                MAX(resolution) AS Resolution
            FROM metering.spot_price
            WHERE "timestamp" >= @From AND "timestamp" < @To
            GROUP BY "timestamp"
            ORDER BY "timestamp"
            """;

        const string statsSql = """
            SELECT
                COALESCE(AVG(CASE WHEN price_area = 'DK1' THEN price_per_kwh END), 0) AS AvgPriceDk1,
                COALESCE(MIN(CASE WHEN price_area = 'DK1' THEN price_per_kwh END), 0) AS MinPriceDk1,
                COALESCE(MAX(CASE WHEN price_area = 'DK1' THEN price_per_kwh END), 0) AS MaxPriceDk1,
                COALESCE(AVG(CASE WHEN price_area = 'DK2' THEN price_per_kwh END), 0) AS AvgPriceDk2,
                COALESCE(MIN(CASE WHEN price_area = 'DK2' THEN price_per_kwh END), 0) AS MinPriceDk2,
                COALESCE(MAX(CASE WHEN price_area = 'DK2' THEN price_per_kwh END), 0) AS MaxPriceDk2
            FROM metering.spot_price
            WHERE "timestamp" >= @From AND "timestamp" < @To
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var args = new { From = from, To = to };
        var rows = (await conn.QueryAsync<SpotPriceDualRow>(
            new CommandDefinition(dataSql, args, cancellationToken: ct))).ToList();

        var stats = await conn.QuerySingleAsync<(decimal AvgPriceDk1, decimal MinPriceDk1, decimal MaxPriceDk1,
            decimal AvgPriceDk2, decimal MinPriceDk2, decimal MaxPriceDk2)>(
            new CommandDefinition(statsSql, args, cancellationToken: ct));

        return new SpotPriceDualResult(rows, rows.Count,
            stats.AvgPriceDk1, stats.MinPriceDk1, stats.MaxPriceDk1,
            stats.AvgPriceDk2, stats.MinPriceDk2, stats.MaxPriceDk2);
    }

    public async Task<DateOnly?> GetLatestPriceDateAsync(string priceArea, CancellationToken ct)
    {
        const string sql = """
            SELECT MAX("timestamp")
            FROM metering.spot_price
            WHERE price_area = @PriceArea
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var result = await conn.QuerySingleOrDefaultAsync<DateTime?>(
            new CommandDefinition(sql, new { PriceArea = priceArea }, cancellationToken: ct));

        return result.HasValue ? DateOnly.FromDateTime(result.Value) : null;
    }

    public async Task<DateOnly?> GetEarliestPriceDateAsync(string priceArea, CancellationToken ct)
    {
        const string sql = """
            SELECT MIN("timestamp")
            FROM metering.spot_price
            WHERE price_area = @PriceArea
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var result = await conn.QuerySingleOrDefaultAsync<DateTime?>(
            new CommandDefinition(sql, new { PriceArea = priceArea }, cancellationToken: ct));

        return result.HasValue ? DateOnly.FromDateTime(result.Value) : null;
    }

    public async Task<SpotPriceStatus> GetStatusAsync(CancellationToken ct)
    {
        const string sql = """
            SELECT
                MAX("timestamp") AS LatestTs,
                MAX(fetched_at) AS LastFetchedAt
            FROM metering.spot_price
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var row = await conn.QuerySingleAsync<(DateTime? LatestTs, DateTime? LastFetchedAt)>(
            new CommandDefinition(sql, cancellationToken: ct));

        var danishZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Copenhagen");
        var nowDanish = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, danishZone);
        var tomorrow = DateOnly.FromDateTime(nowDanish).AddDays(1);
        var latestDate = row.LatestTs.HasValue ? DateOnly.FromDateTime(row.LatestTs.Value) : (DateOnly?)null;
        var hasTomorrow = latestDate.HasValue && latestDate.Value >= tomorrow;

        var danishTime = TimeOnly.FromDateTime(nowDanish);
        var status = hasTomorrow
            ? "ok"
            : danishTime >= new TimeOnly(14, 0)
                ? "alert"
                : danishTime >= new TimeOnly(13, 15)
                    ? "warning"
                    : "ok";

        return new SpotPriceStatus(latestDate, row.LastFetchedAt, hasTomorrow, status);
    }
}
