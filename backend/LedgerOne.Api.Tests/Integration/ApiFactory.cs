using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace LedgerOne.Api.Tests.Integration;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public string DbPath { get; } =
        Path.Combine(Path.GetTempPath(), $"ledgerone_test_{Guid.NewGuid():N}.db");

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        return base.CreateHost(builder);
    }

    // Exposed so subclasses can call WebApplicationFactory<Program>.CreateHost directly,
    // bypassing the Testing-env override in this class.
    protected IHost CreateHostCore(IHostBuilder builder) => base.CreateHost(builder);

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public new async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        // Release pooled SQLite connections so the file handle is closed before deletion.
        SqliteConnection.ClearAllPools();
        if (File.Exists(DbPath)) File.Delete(DbPath);
    }
}
