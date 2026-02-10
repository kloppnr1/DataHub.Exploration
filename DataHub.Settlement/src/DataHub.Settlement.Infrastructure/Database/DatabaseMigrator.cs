using DbUp;
using Microsoft.Extensions.Logging;

namespace DataHub.Settlement.Infrastructure.Database;

public static class DatabaseMigrator
{
    /// <summary>
    /// Runs all pending SQL migrations against the given connection string.
    /// Throws on failure so the Worker doesn't start with a broken schema.
    /// </summary>
    public static void Migrate(string connectionString, ILogger logger)
    {
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            try
            {
                EnsureDatabase.For.PostgresqlDatabase(connectionString);
                break;
            }
            catch (Exception ex) when (attempt < 10)
            {
                logger.LogWarning(ex, "Database not ready (attempt {Attempt}/10). Retrying in 3s...", attempt);
                Thread.Sleep(3000);
            }
        }

        var upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                typeof(DatabaseMigrator).Assembly,
                s => s.Contains(".Migrations."))
            .WithoutTransaction()
            .LogTo(new DbUpLogger(logger))
            .Build();

        var result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            throw new InvalidOperationException(
                "Database migration failed. See inner exception for details.",
                result.Error);
        }

        logger.LogInformation("Database migrations completed successfully. {ScriptCount} script(s) executed.",
            result.Scripts.Count());
    }
}
