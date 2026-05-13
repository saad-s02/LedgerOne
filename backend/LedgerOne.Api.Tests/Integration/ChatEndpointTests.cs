using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using LedgerOne.Api.Features.Chat;

namespace LedgerOne.Api.Tests.Integration;

public class ChatEndpointTests(ChatApiFactory factory) : IClassFixture<ChatApiFactory>
{
    private readonly ChatApiFactory _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
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
        body.Should().Contain("validation errors");
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
    }

    [Fact]
    public async Task Post_Chat_HappyPath_ReturnsAgentEnvelope()
    {
        var ct = TestContext.Current.CancellationToken;
        _factory.Agent.Script((tools, _) => Task.FromResult(new ChatAgentResult(
            "Found 3 transactions.",
            new[]
            {
                new ToolCallDto(
                    "search_transactions",
                    JsonSerializer.SerializeToElement(new { type = "Buy" }),
                    JsonSerializer.SerializeToElement(new { total = 3 }),
                    false),
            },
            false)));

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "Show me buys", conversationHistory = Array.Empty<object>() },
            JsonOptions,
            ct);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ChatResponse>(JsonOptions, ct);
        body.Should().NotBeNull();
        body!.Response.Should().Contain("3 transactions");
        body.ToolCalls.Should().HaveCount(1);
    }

    [Fact]
    public async Task Post_Chat_AgentThrowsBackendException_Returns502()
    {
        var ct = TestContext.Current.CancellationToken;
        _factory.Agent.Script((tools, _) =>
            throw new LedgerOne.Api.Infrastructure.Errors.ChatBackendException("upstream blew up"));

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "any", conversationHistory = Array.Empty<object>() },
            JsonOptions,
            ct);

        resp.StatusCode.Should().Be(HttpStatusCode.BadGateway);
        var body = await resp.Content.ReadAsStringAsync(ct);
        body.Should().Contain("traceId");
    }

    [Fact]
    public async Task Post_Chat_HappyPath_MatchesSnapshot()
    {
        var ct = TestContext.Current.CancellationToken;
        _factory.Agent.Script((tools, _) => Task.FromResult(new ChatAgentResult(
            "Found 3 settled buys.",
            new[]
            {
                new ToolCallDto(
                    "search_transactions",
                    JsonSerializer.SerializeToElement(new { type = "Buy", status = "Settled" }),
                    JsonSerializer.SerializeToElement(new { total = 3, page = 1, pageSize = 20 }),
                    false),
            },
            false)));

        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new { message = "Show me settled buys", conversationHistory = Array.Empty<object>() },
            JsonOptions,
            ct);
        resp.EnsureSuccessStatusCode();

        var json = await resp.Content.ReadAsStringAsync(ct);
        await Verify(json).UseDirectory("Snapshots");
    }
}
