namespace LedgerOne.Api.Features.Chat;

public record ChatResponse(string Response, IReadOnlyList<ToolCallDto> ToolCalls);
