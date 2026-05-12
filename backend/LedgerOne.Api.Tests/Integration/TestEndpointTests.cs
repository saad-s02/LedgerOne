using System.Net;
using FluentAssertions;
using LedgerOne.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LedgerOne.Api.Tests.Integration;

public class TestEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task PostTestSeed_InTestingEnv_SeedsFixtureRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        var response = await client.PostAsync("/api/test/seed", null, ct);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.Transactions.CountAsync(ct);
        count.Should().BeGreaterThanOrEqualTo(50, "test fixture seeds at least 50 rows");
    }

    [Fact]
    public async Task PostTestSeed_IsIdempotent_RowsAfterRepeatSeedAreSameSet()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);
        using var scope1 = _factory.Services.CreateScope();
        var db1 = scope1.ServiceProvider.GetRequiredService<AppDbContext>();
        var firstCount = await db1.Transactions.CountAsync(ct);

        await client.PostAsync("/api/test/seed", null, ct);
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var secondCount = await db2.Transactions.CountAsync(ct);

        secondCount.Should().Be(firstCount, "seed truncates then re-seeds");
    }
}

public class TestEndpointProductionGatingTests
{
    [Fact]
    public async Task PostTestSeed_InProductionEnv_Returns404()
    {
        await using var factory = new ProductionApiFactory();
        var ct = TestContext.Current.CancellationToken;
        var client = factory.CreateClient();
        var response = await client.PostAsync("/api/test/seed", null, ct);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

public class ProductionApiFactory : ApiFactory
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        // Call CreateHostCore (not base.CreateHost) to bypass ApiFactory's UseEnvironment("Testing") override.
        return CreateHostCore(builder);
    }
}
