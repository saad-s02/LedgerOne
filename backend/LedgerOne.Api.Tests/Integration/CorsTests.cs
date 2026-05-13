using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace LedgerOne.Api.Tests.Integration;

public class CorsTests
{
    [Fact]
    public async Task DevEnvironment_PreflightFromLocalhost5173_IsAllowed()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var factory = new DevApiFactory();
        var client = factory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Options, "/api/transactions");
        req.Headers.Add("Origin", "http://localhost:5173");
        req.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(req, ct);
        response.Headers.GetValues("Access-Control-Allow-Origin")
            .Should().ContainSingle("http://localhost:5173");
    }
}

public class DevApiFactory : ApiFactory
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        return CreateHostCore(builder);
    }
}
