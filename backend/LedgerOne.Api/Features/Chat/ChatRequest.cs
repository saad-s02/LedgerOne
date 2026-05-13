namespace LedgerOne.Api.Features.Chat;

public record ChatRequest
{
    public string Message { get; init; } = string.Empty;
    public IReadOnlyList<ChatMessageDto> ConversationHistory { get; init; } = [];
}
