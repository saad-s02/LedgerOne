namespace LedgerOne.Api.Features.Chat;

/// <summary>Inbound message to the natural-language agent.</summary>
public record ChatRequest
{
    /// <summary>The user's new message.</summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>Prior turns in this conversation, oldest first. Empty for the first turn.</summary>
    public IReadOnlyList<ChatMessageDto> ConversationHistory { get; init; } = [];
}
