using System.Text.Json;
using DataHub.Settlement.Simulator;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<SimulatorState>();

var app = builder.Build();
var state = app.Services.GetRequiredService<SimulatorState>();

// ── OAuth2 token endpoint (fake) ──
app.MapPost("/oauth2/v2.0/token", () =>
{
    return Results.Ok(new
    {
        access_token = $"sim-token-{Guid.NewGuid():N}",
        token_type = "Bearer",
        expires_in = 3600,
    });
});

// ── CIM Queue endpoints ──
app.MapGet("/v1.0/cim/{queue}", (string queue) =>
{
    var msg = state.Peek(queue);
    if (msg is null)
        return Results.NoContent();

    return Results.Ok(new
    {
        MessageId = msg.MessageId,
        MessageType = msg.MessageType,
        CorrelationId = msg.CorrelationId,
        Content = msg.Payload,
    });
});

app.MapDelete("/v1.0/cim/dequeue/{messageId}", (string messageId) =>
{
    return state.Dequeue(messageId)
        ? Results.Ok()
        : Results.NotFound();
});

// ── BRS request endpoints ──
app.MapPost("/v1.0/cim/requestchangeofsupplier", async (HttpRequest request) =>
{
    var body = await new StreamReader(request.Body).ReadToEndAsync();
    state.RecordRequest("requestchangeofsupplier", "/v1.0/cim/requestchangeofsupplier", body);
    return Results.Ok(new
    {
        CorrelationId = Guid.NewGuid().ToString(),
        Accepted = true,
    });
});

app.MapPost("/v1.0/cim/requestendofsupply", async (HttpRequest request) =>
{
    var body = await new StreamReader(request.Body).ReadToEndAsync();
    state.RecordRequest("requestendofsupply", "/v1.0/cim/requestendofsupply", body);
    return Results.Ok(new
    {
        CorrelationId = Guid.NewGuid().ToString(),
        Accepted = true,
    });
});

app.MapPost("/v1.0/cim/requestcancelchangeofsupplier", async (HttpRequest request) =>
{
    var body = await new StreamReader(request.Body).ReadToEndAsync();
    state.RecordRequest("requestcancelchangeofsupplier", "/v1.0/cim/requestcancelchangeofsupplier", body);
    return Results.Ok(new
    {
        CorrelationId = Guid.NewGuid().ToString(),
        Accepted = true,
    });
});

// ── Admin endpoints ──
app.MapPost("/admin/enqueue", async (HttpRequest request) =>
{
    var body = await JsonSerializer.DeserializeAsync<EnqueueRequest>(request.Body);
    if (body is null)
        return Results.BadRequest("Invalid request body");

    var messageId = state.EnqueueMessage(body.Queue, body.MessageType, body.CorrelationId, body.Payload);
    return Results.Ok(new { MessageId = messageId });
});

app.MapPost("/admin/scenario/{name}", (string name) =>
{
    try
    {
        ScenarioLoader.Load(state, name);
        return Results.Ok(new { Scenario = name, Status = "loaded" });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { Error = ex.Message });
    }
});

app.MapPost("/admin/reset", () =>
{
    state.Reset();
    return Results.Ok(new { Status = "reset" });
});

app.MapGet("/admin/requests", () =>
{
    return Results.Ok(state.GetRequests());
});

app.MapGet("/", () => "DataHub Settlement Simulator");

app.Run();

record EnqueueRequest(string Queue, string MessageType, string? CorrelationId, string Payload);

// Make Program accessible for integration tests via WebApplicationFactory
public partial class Program;
