using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LedgerOne.Api.Tests.Integration;

public class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task Get_Health_Returns200WithHealthyStatus()
    {
        var client = _factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;
        var response = await client.GetAsync("/health", ct);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>(ct);
        body.Should().ContainKey("status").WhoseValue.Should().Be("Healthy");
    }
}
