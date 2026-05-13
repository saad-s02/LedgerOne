using System.Text.Json;
using FluentAssertions;
using LedgerOne.Api.Features.Chat;
using LedgerOne.Api.Infrastructure.Errors;
using LedgerOne.Api.Tests.Unit.Fakes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace LedgerOne.Api.Tests.Unit;

public class ChatHandlerTests
{
    private static IConfiguration BuildConfig(int? timeoutSeconds = null) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Chat:TimeoutSeconds"] = (timeoutSeconds ?? 60).ToString(),
            })
            .Build();

    private static ChatHandler Build(FakeChatAgent agent, ITransactionTools? tools = null, IConfiguration? config = null) =>
        new(
            agent,
            tools ?? new FakeTransactionTools(),
            new ChatRequestValidator(),
            config ?? BuildConfig(),
            NullLogger<ChatHandler>.Instance);

    [Fact]
    public async Task Handle_HappyPath_ReturnsAgentEnvelope()
    {
        var ct = TestContext.Current.CancellationToken;
        var fake = new FakeChatAgent();
        fake.Script((tools, _) => Task.FromResult(new ChatAgentResult(
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

        var resp = await Build(fake).Handle(
            new ChatRequest { Message = "Show me buys" }, ct);

        resp.Response.Should().Be("Found 3 transactions.");
        resp.ToolCalls.Should().HaveCount(1);
        resp.ToolCalls[0].Tool.Should().Be("search_transactions");
        resp.ToolCalls[0].IsError.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_PassesUserMessageAndHistoryToAgent()
    {
        var ct = TestContext.Current.CancellationToken;
        var fake = new FakeChatAgent();
        fake.Script((tools, _) => Task.FromResult(new ChatAgentResult("ok", [], false)));

        await Build(fake).Handle(new ChatRequest
        {
            Message = "Question 2",
            ConversationHistory = new[]
            {
                new ChatMessageDto("user", "Question 1"),
                new ChatMessageDto("assistant", "Answer 1"),
            },
        }, ct);

        fake.Calls.Should().HaveCount(1);
        fake.Calls[0].UserMessage.Should().Be("Question 2");
        fake.Calls[0].History.Should().HaveCount(2);
        fake.Calls[0].History[1].Content.Should().Be("Answer 1");
    }

    [Fact]
    public async Task Handle_AgentReturnsStoppedAtCap_BubblesUpAsOkResponse()
    {
        var ct = TestContext.Current.CancellationToken;
        var fake = new FakeChatAgent();
        fake.Script((tools, _) => Task.FromResult(new ChatAgentResult(
            ChatPrompts.IterationCapMessage, [], true)));

        var resp = await Build(fake).Handle(new ChatRequest { Message = "Loop forever" }, ct);

        resp.Response.Should().Contain("got stuck");
    }

    [Fact]
    public async Task Handle_AgentThrows_TimeoutWhenCancelled_RaisesChatTimeoutException()
    {
        var ct = TestContext.Current.CancellationToken;
        var fake = new FakeChatAgent();
        fake.Script(async (tools, innerCt) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(2), innerCt);
            return new ChatAgentResult("never reaches here", [], false);
        });

        var handler = Build(fake, config: BuildConfig(timeoutSeconds: 1));
        var act = async () => await handler.Handle(new ChatRequest { Message = "slow" }, ct);

        await act.Should().ThrowAsync<ChatTimeoutException>();
    }

    [Fact]
    public async Task Handle_PreviouslyCancelledOuterToken_PropagatesOperationCanceled()
    {
        // Outer cancel — caller disconnect — should not become ChatTimeoutException.
        var fake = new FakeChatAgent();
        fake.Script((tools, ct) => Task.FromResult(new ChatAgentResult("ok", [], false)));

        var outer = new CancellationTokenSource();
        outer.Cancel();

        var act = async () => await Build(fake).Handle(new ChatRequest { Message = "x" }, outer.Token);
        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task Handle_EmptyMessage_ThrowsValidationException()
    {
        var ct = TestContext.Current.CancellationToken;
        var fake = new FakeChatAgent();
        var act = async () => await Build(fake).Handle(new ChatRequest { Message = "" }, ct);
        var ex = await act.Should().ThrowAsync<LedgerOne.Api.Infrastructure.Validation.ValidationException>();
        ex.Which.Errors.Should().ContainKey("message");
    }
}

internal sealed class FakeTransactionTools : ITransactionTools
{
    public Task<JsonElement> SearchTransactionsAsync(SearchTransactionsArgs args, CancellationToken ct) =>
        Task.FromResult(JsonSerializer.SerializeToElement(new { total = 0, data = Array.Empty<object>() }));

    public Task<JsonElement> GetTransactionAsync(GetTransactionArgs args, CancellationToken ct) =>
        Task.FromResult(JsonSerializer.SerializeToElement(new { error = "stub" }));
}
