namespace DataHub.Settlement.Application.Lifecycle;

/// <summary>
/// Defines the expected inbound messages for each process type.
/// Single source of truth — extend this dictionary when adding new process types.
/// </summary>
public static class ProcessExpectedMessages
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> ExpectedByType =
        new Dictionary<string, IReadOnlyList<string>>
        {
            ["supplier_switch"] = new[] { "RSM-001", "RSM-028", "RSM-031", "RSM-022" },
            ["move_in"]         = new[] { "RSM-001", "RSM-028", "RSM-031", "RSM-022" },
            ["end_of_supply"]   = new[] { "RSM-005" },
            ["move_out"]        = new[] { "RSM-005" },
        };

    public static IReadOnlyList<string> For(string processType)
        => ExpectedByType.TryGetValue(processType, out var list) ? list : Array.Empty<string>();
}
