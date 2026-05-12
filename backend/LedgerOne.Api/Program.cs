using LedgerOne.Api.Controllers;
using LedgerOne.Api.Data;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=ledgerone.db";
    opts.UseSqlite(cs);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
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
