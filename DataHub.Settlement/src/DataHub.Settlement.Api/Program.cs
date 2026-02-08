using DataHub.Settlement.Application.AddressLookup;
using DataHub.Settlement.Application.Lifecycle;
using DataHub.Settlement.Application.Onboarding;
using DataHub.Settlement.Application.Portfolio;
using DataHub.Settlement.Domain;
using DataHub.Settlement.Infrastructure;
using DataHub.Settlement.Infrastructure.AddressLookup;
using DataHub.Settlement.Infrastructure.Database;
using DataHub.Settlement.Infrastructure.Lifecycle;
using DataHub.Settlement.Infrastructure.Onboarding;
using DataHub.Settlement.Infrastructure.Portfolio;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SettlementDb")
    ?? "Host=localhost;Port=5432;Database=datahub_settlement;Username=settlement;Password=settlement";

// Core services
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IAddressLookupClient, StubAddressLookupClient>();
builder.Services.AddSingleton<IPortfolioRepository>(new PortfolioRepository(connectionString));
builder.Services.AddSingleton<IProcessRepository>(new ProcessRepository(connectionString));
builder.Services.AddSingleton<ISignupRepository>(new SignupRepository(connectionString));
builder.Services.AddSingleton<IOnboardingService, OnboardingService>();

var app = builder.Build();

// Run database migrations
var migrationLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseMigrator");
DatabaseMigrator.Migrate(connectionString, migrationLogger);

// Health
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// GET /api/products — list active products
app.MapGet("/api/products", async (IPortfolioRepository repo, CancellationToken ct) =>
{
    var products = await repo.GetActiveProductsAsync(ct);
    return Results.Ok(products.Select(p => new
    {
        p.Id,
        p.Name,
        p.EnergyModel,
        margin_ore_per_kwh = p.MarginOrePerKwh,
        supplement_ore_per_kwh = p.SupplementOrePerKwh,
        subscription_kr_per_month = p.SubscriptionKrPerMonth,
        p.Description,
        green_energy = p.GreenEnergy,
    }));
});

// POST /api/signup — create a new signup
app.MapPost("/api/signup", async (SignupRequest request, IOnboardingService service, CancellationToken ct) =>
{
    try
    {
        var response = await service.CreateSignupAsync(request, ct);
        return Results.Created($"/api/signup/{response.SignupId}/status", response);
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// GET /api/signup/{id}/status — check signup progress
app.MapGet("/api/signup/{id}/status", async (string id, IOnboardingService service, CancellationToken ct) =>
{
    var status = await service.GetStatusAsync(id, ct);
    return status is not null ? Results.Ok(status) : Results.NotFound();
});

// POST /api/signup/{id}/cancel — cancel before activation
app.MapPost("/api/signup/{id}/cancel", async (string id, IOnboardingService service, CancellationToken ct) =>
{
    try
    {
        await service.CancelAsync(id, ct);
        return Results.Ok(new { message = "Signup cancelled." });
    }
    catch (ValidationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (ConflictException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
});

app.Run();
