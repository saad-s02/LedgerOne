using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace LedgerOne.Api.Tests.Integration;

public class ProblemDetailsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Theory]
    [InlineData("/api/transactions?page=0", "page")]
    [InlineData("/api/transactions?page=-1", "page")]
    [InlineData("/api/transactions?pageSize=0", "pageSize")]
    [InlineData("/api/transactions?pageSize=101", "pageSize")]
    public async Task InvalidQuery_Returns400ProblemDetails(string path, string expectedErrorKey)
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        var response = await client.GetAsync(path, ct);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType
            .Should().BeOneOf("application/problem+json", "application/json");

        var rawBody = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(ct);
        rawBody.Should().NotBeNull();
        var body = rawBody!;
        body.Should().ContainKey("title");
        body.Should().ContainKey("status");
        body.Should().ContainKey("traceId");
        body.Should().ContainKey("errors");
        var errorsJson = body["errors"].ToString() ?? "{}";
        var errors = JsonSerializer.Deserialize<Dictionary<string, string[]>>(errorsJson);
        errors.Should().NotBeNull();
        errors!.Should().ContainKey(expectedErrorKey);
    }

    [Fact]
    public async Task UnhandledException_Returns500ProblemDetailsWithTraceId()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/test/boom", ct);

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        var rawBody = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(ct);
        rawBody.Should().NotBeNull();
        var body = rawBody!;
        body.Should().ContainKey("title");
        body.Should().ContainKey("traceId");
        var statusStr = body["status"].ToString() ?? "";
        statusStr.Should().Be("500");
    }
}
