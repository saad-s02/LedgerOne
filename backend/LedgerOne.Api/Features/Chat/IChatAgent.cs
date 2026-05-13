namespace LedgerOne.Api.Features.Chat;

public interface IChatAgent
{
    Task<ChatAgentResult> RunAsync(
        string userMessage,
        IReadOnlyList<ChatMessageDto> history,
        ITransactionTools tools,
        CancellationToken ct);
}
