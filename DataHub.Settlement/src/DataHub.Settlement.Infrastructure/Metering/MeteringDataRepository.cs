using Dapper;
using DataHub.Settlement.Application.Metering;
using Npgsql;

namespace DataHub.Settlement.Infrastructure.Metering;

public sealed class MeteringDataRepository : IMeteringDataRepository
{
    private readonly string _connectionString;

    static MeteringDataRepository()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    public MeteringDataRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task StoreTimeSeriesAsync(string meteringPointId, IReadOnlyList<MeteringDataRow> rows, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO metering.metering_data (metering_point_id, timestamp, resolution, quantity_kwh, quality_code, source_message_id, registration_timestamp)
            VALUES (@MeteringPointId, @Timestamp, @Resolution, @QuantityKwh, @QualityCode, @SourceMessageId, @RegistrationTimestamp)
            ON CONFLICT (metering_point_id, timestamp) DO UPDATE SET
                quantity_kwh = EXCLUDED.quantity_kwh,
                quality_code = EXCLUDED.quality_code,
                source_message_id = EXCLUDED.source_message_id,
                registration_timestamp = EXCLUDED.registration_timestamp,
                received_at = now()
            WHERE EXCLUDED.registration_timestamp IS NULL
               OR metering.metering_data.registration_timestamp IS NULL
               OR EXCLUDED.registration_timestamp >= metering.metering_data.registration_timestamp
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var parameters = rows.Select(r => new
        {
            MeteringPointId = meteringPointId,
            r.Timestamp,
            r.Resolution,
            r.QuantityKwh,
            r.QualityCode,
            r.SourceMessageId,
            r.RegistrationTimestamp,
        });

        await conn.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: ct));
    }

    public async Task<int> StoreTimeSeriesWithHistoryAsync(string meteringPointId, IReadOnlyList<MeteringDataRow> rows, CancellationToken ct)
    {
        // First, fetch existing values for timestamps that we're about to overwrite
        const string fetchSql = """
            SELECT timestamp, quantity_kwh, source_message_id, registration_timestamp
            FROM metering.metering_data
            WHERE metering_point_id = @MeteringPointId AND timestamp = ANY(@Timestamps)
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var timestamps = rows.Select(r => r.Timestamp).ToArray();
        var existing = (await conn.QueryAsync<ExistingRow>(
            new CommandDefinition(fetchSql, new { MeteringPointId = meteringPointId, Timestamps = timestamps }, cancellationToken: ct)))
            .ToDictionary(r => r.Timestamp);

        // Insert/update the metering data (only if registration timestamp is newer)
        const string upsertSql = """
            INSERT INTO metering.metering_data (metering_point_id, timestamp, resolution, quantity_kwh, quality_code, source_message_id, registration_timestamp)
            VALUES (@MeteringPointId, @Timestamp, @Resolution, @QuantityKwh, @QualityCode, @SourceMessageId, @RegistrationTimestamp)
            ON CONFLICT (metering_point_id, timestamp) DO UPDATE SET
                quantity_kwh = EXCLUDED.quantity_kwh,
                quality_code = EXCLUDED.quality_code,
                source_message_id = EXCLUDED.source_message_id,
                registration_timestamp = EXCLUDED.registration_timestamp,
                received_at = now()
            WHERE EXCLUDED.registration_timestamp IS NULL
               OR metering.metering_data.registration_timestamp IS NULL
               OR EXCLUDED.registration_timestamp >= metering.metering_data.registration_timestamp
            """;

        var parameters = rows.Select(r => new
        {
            MeteringPointId = meteringPointId,
            r.Timestamp,
            r.Resolution,
            r.QuantityKwh,
            r.QualityCode,
            r.SourceMessageId,
            r.RegistrationTimestamp,
        });

        await conn.ExecuteAsync(new CommandDefinition(upsertSql, parameters, cancellationToken: ct));

        // Write history rows for any values that actually changed
        // (only if the new registration timestamp is newer, matching upsert logic)
        const string historySql = """
            INSERT INTO metering.metering_data_history (metering_point_id, timestamp, previous_kwh, new_kwh, previous_message_id, new_message_id)
            VALUES (@MeteringPointId, @Timestamp, @PreviousKwh, @NewKwh, @PreviousMessageId, @NewMessageId)
            """;

        var changes = new List<object>();
        foreach (var row in rows)
        {
            if (existing.TryGetValue(row.Timestamp, out var prev) && prev.QuantityKwh != row.QuantityKwh)
            {
                // Only record change if the new registration timestamp would actually win the upsert
                if (prev.RegistrationTimestamp is null || row.RegistrationTimestamp >= prev.RegistrationTimestamp)
                {
                    changes.Add(new
                    {
                        MeteringPointId = meteringPointId,
                        row.Timestamp,
                        PreviousKwh = prev.QuantityKwh,
                        NewKwh = row.QuantityKwh,
                        PreviousMessageId = prev.SourceMessageId,
                        NewMessageId = row.SourceMessageId,
                    });
                }
            }
        }

        if (changes.Count > 0)
            await conn.ExecuteAsync(new CommandDefinition(historySql, changes, cancellationToken: ct));

        return changes.Count;
    }

    public async Task<IReadOnlyList<MeteringDataChange>> GetChangesAsync(
        string meteringPointId, DateTime from, DateTime to, CancellationToken ct)
    {
        const string sql = """
            SELECT metering_point_id, timestamp, previous_kwh, new_kwh, previous_message_id, new_message_id, changed_at
            FROM metering.metering_data_history
            WHERE metering_point_id = @MeteringPointId AND timestamp >= @From AND timestamp < @To
            ORDER BY timestamp
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<MeteringDataChange>(
            new CommandDefinition(sql, new { MeteringPointId = meteringPointId, From = from, To = to }, cancellationToken: ct));

        return rows.ToList();
    }

    private record ExistingRow(DateTime Timestamp, decimal QuantityKwh, string? SourceMessageId, DateTime? RegistrationTimestamp);

    public async Task<IReadOnlyList<MeteringDataRow>> GetConsumptionAsync(
        string meteringPointId, DateTime from, DateTime to, CancellationToken ct)
    {
        const string sql = """
            SELECT timestamp, resolution, quantity_kwh, quality_code, source_message_id, registration_timestamp
            FROM metering.metering_data
            WHERE metering_point_id = @MeteringPointId AND timestamp >= @From AND timestamp < @To
            ORDER BY timestamp
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var rows = await conn.QueryAsync<MeteringDataRow>(
            new CommandDefinition(sql, new { MeteringPointId = meteringPointId, From = from, To = to }, cancellationToken: ct));

        return rows.ToList();
    }
}
