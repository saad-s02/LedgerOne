namespace LedgerOne.Api.Features.Chat;

/// <summary>One turn in a chat conversation.</summary>
/// <param name="Role">Either <c>user</c> or <c>assistant</c>.</param>
/// <param name="Content">The message text.</param>
public record ChatMessageDto(string Role, string Content);
