using FluentValidation;
using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using LedgerOne.Api.Infrastructure.Logging;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}"));

var mvc = builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<LedgerOne.Api.Infrastructure.ProblemDetails.GlobalExceptionHandler>();

builder.Services.AddOpenApi("v1", opts =>
{
    opts.AddDocumentTransformer<LedgerOne.Api.Infrastructure.OpenApi.LedgerOneDocumentTransformer>();
    opts.AddOperationTransformer<LedgerOne.Api.Infrastructure.OpenApi.OperationIdTransformer>();
});

const string CorsPolicy = "DefaultCorsPolicy";
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var devDefaultOrigins = (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing"))
    ? new[] { "http://localhost:5173" }
    : Array.Empty<string>();
var allowedOrigins = configuredOrigins.Length > 0 ? configuredOrigins : devDefaultOrigins;
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(opts =>
    {
        opts.AddPolicy(CorsPolicy, p => p
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("X-Correlation-Id"));
    });
}

builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.ListTransactionsHandler>();
builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.GetTransactionHandler>();
builder.Services.AddScoped<LedgerOne.Api.Features.Chat.ITransactionTools, LedgerOne.Api.Features.Chat.TransactionTools>();
builder.Services.AddScoped<LedgerOne.Api.Features.Chat.ChatHandler>();
builder.Services.AddSingleton<LedgerOne.Api.Features.Chat.IChatAgent, LedgerOne.Api.Features.Chat.AnthropicChatAgent>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=ledgerone.db";
    opts.UseSqlite(cs);
});

var app = builder.Build();

if (allowedOrigins.Length > 0)
{
    app.UseCors(CorsPolicy);
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsEnvironment("Testing"))
    {
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Transactions");
    }
    else
    {
        var seedOnStartup = app.Configuration.GetValue<bool?>("Seed:OnStartup")
            ?? app.Environment.IsDevelopment();
        if (seedOnStartup && !await db.Transactions.AnyAsync())
        {
            await DevSeeder.SeedAsync(db, CancellationToken.None);
        }
    }
}

// Gate test endpoints: return 404 for /api/test/* in any env except Testing.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/test"))
    {
        var env = context.RequestServices.GetRequiredService<IHostEnvironment>();
        if (!env.IsEnvironment("Testing"))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }
    }
    await next(context);
});

app.MapOpenApi();
app.MapControllers();
app.Run();

public partial class Program;
