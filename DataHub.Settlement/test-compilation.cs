using System;
using System.Threading;
using System.Threading.Tasks;
using DataHub.Settlement.Application.Settlement;

// Simple compilation test for the new method
public class CompilationTest
{
    public async Task TestStoreFailedRunAsync(ISettlementResultStore store)
    {
        await store.StoreFailedRunAsync("TEST_GSRN", "DK1", DateOnly.FromDateTime(DateTime.Today), DateOnly.FromDateTime(DateTime.Today.AddDays(30)), "Test error", CancellationToken.None);
    }
}