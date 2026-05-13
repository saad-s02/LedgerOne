namespace LedgerOne.Api.Features.Chat;

/// <summary>Agent response after the ReAct loop terminates.</summary>
/// <param name="Response">Final assistant message to render to the user.</param>
/// <param name="ToolCalls">Every tool invocation made during the loop, in order, with args and result. Surfaced inline in the chat UI as collapsible cards.</param>
public record ChatResponse(string Response, IReadOnlyList<ToolCallDto> ToolCalls);
