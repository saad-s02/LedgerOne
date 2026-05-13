using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using LedgerOne.Api.Features.Chat;

namespace LedgerOne.Api.Tests.Integration;

public class ChatEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Post_Chat_EmptyMessage_Returns400()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "", conversationHistory = Array.Empty<object>() },
            JsonOptions,
            ct);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await resp.Content.ReadAsStringAsync(ct);
        body.Should().Contain("message");
    }

    [Fact]
    public async Task Post_Chat_HistoryTooLong_Returns400()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var history = Enumerable.Range(0, 21)
            .Select(i => new { role = i % 2 == 0 ? "user" : "assistant", content = "msg" })
            .ToArray();

        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "Hello", conversationHistory = history },
            JsonOptions,
            ct);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await resp.Content.ReadAsStringAsync(ct);
        body.Should().Contain("conversationHistory");
    }

    [Fact]
    public async Task Post_Chat_ValidRequest_ReturnsStub501ForNow()
    {
        // Will flip to 200 once ChatHandler is wired (Task 9).
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "Hello", conversationHistory = Array.Empty<object>() },
            JsonOptions,
            ct);

        resp.StatusCode.Should().Be(HttpStatusCode.NotImplemented);
    }
}
