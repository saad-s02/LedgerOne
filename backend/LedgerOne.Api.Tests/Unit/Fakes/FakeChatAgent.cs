using LedgerOne.Api.Features.Chat;

namespace LedgerOne.Api.Tests.Unit.Fakes;

/// <summary>
/// Scripted IChatAgent for unit + integration tests.
///
/// Usage:
///   var fake = new FakeChatAgent();
///   fake.Script(async (tools, ct) =>
///   {
///       var search = await tools.SearchTransactionsAsync(new SearchTransactionsArgs(), ct);
///       return new ChatAgentResult("Found 3 results.",
///           new[] { new ToolCallDto("search_transactions", JsonElement, search, false) }, false);
///   });
/// </summary>
public class FakeChatAgent : IChatAgent
{
    private readonly Queue<Func<string, IReadOnlyList<ChatMessageDto>, ITransactionTools, CancellationToken, Task<ChatAgentResult>>>
        _scenarios = new();

    public List<RecordedCall> Calls { get; } = new();

    public void Script(Func<ITransactionTools, CancellationToken, Task<ChatAgentResult>> scenario)
    {
        _scenarios.Enqueue((_, _, tools, ct) => scenario(tools, ct));
    }

    public void Script(Func<string, IReadOnlyList<ChatMessageDto>, ITransactionTools, CancellationToken, Task<ChatAgentResult>> scenario)
    {
        _scenarios.Enqueue(scenario);
    }

    public Task<ChatAgentResult> RunAsync(
        string userMessage,
        IReadOnlyList<ChatMessageDto> history,
        ITransactionTools tools,
        CancellationToken ct)
    {
        Calls.Add(new RecordedCall(userMessage, history.ToArray()));
        if (_scenarios.Count == 0)
            throw new InvalidOperationException(
                "FakeChatAgent invoked with no scripted scenario. Call .Script(...) first.");
        return _scenarios.Dequeue()(userMessage, history, tools, ct);
    }

    public record RecordedCall(string UserMessage, IReadOnlyList<ChatMessageDto> History);
}
