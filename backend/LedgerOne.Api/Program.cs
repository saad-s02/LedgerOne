using LedgerOne.Api.Controllers;
using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using LedgerOne.Api.Infrastructure.Logging;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
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

const string DevCorsPolicy = "DevCorsPolicy";
builder.Services.AddCors(opts =>
{
    opts.AddPolicy(DevCorsPolicy, p => p
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.ListTransactionsHandler>();

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=ledgerone.db";
    opts.UseSqlite(cs);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseExceptionHandler();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsDevelopment() && !await db.Transactions.AnyAsync())
    {
        await DevSeeder.SeedAsync(db, CancellationToken.None);
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

app.MapControllers();
app.Run();

public partial class Program;
