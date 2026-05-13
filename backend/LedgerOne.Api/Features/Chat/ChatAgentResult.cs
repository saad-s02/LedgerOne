namespace LedgerOne.Api.Features.Chat;

public record ChatAgentResult(
    string FinalText,
    IReadOnlyList<ToolCallDto> ToolCalls,
    bool StoppedAtCap);
