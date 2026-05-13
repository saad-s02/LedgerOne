using System.Text.Json;

namespace LedgerOne.Api.Features.Chat;

/// <summary>A single tool invocation performed by the agent during the ReAct loop.</summary>
/// <param name="Tool">Tool name (e.g. <c>search_transactions</c>, <c>get_transaction</c>).</param>
/// <param name="Args">Tool input as a JSON object, matching the tool's input schema.</param>
/// <param name="Result">Tool output as a JSON value. On error this contains an <c>{ "error": "..." }</c> object and <see cref="IsError"/> is true.</param>
/// <param name="IsError">True if the tool failed; the assistant should narrate the failure rather than guess.</param>
public record ToolCallDto(string Tool, JsonElement Args, JsonElement Result, bool IsError);
