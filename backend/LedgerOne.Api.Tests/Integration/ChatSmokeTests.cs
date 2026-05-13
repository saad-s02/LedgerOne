using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using LedgerOne.Api.Features.Chat;

namespace LedgerOne.Api.Tests.Integration;

public class ChatSmokeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    [RequiresApiKeyFact]
    public async Task Smoke_ChatAgent_AnswersCancelledOverThresholdQuery()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var resp = await client.PostAsJsonAsync(
            "/api/chat",
            new
            {
                message = "Find any cancelled transactions over 50,000 dollars.",
                conversationHistory = Array.Empty<object>(),
            },
            JsonOptions,
            ct);

        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<ChatResponse>(JsonOptions, ct);
        body.Should().NotBeNull();
        body!.ToolCalls.Should().NotBeEmpty();
        body.ToolCalls[0].Tool.Should().Be("search_transactions");
        body.Response.Should().NotBeNullOrWhiteSpace();
    }
}
