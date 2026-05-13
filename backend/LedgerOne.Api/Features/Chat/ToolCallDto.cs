using System.Text.Json;

namespace LedgerOne.Api.Features.Chat;

public record ToolCallDto(string Tool, JsonElement Args, JsonElement Result, bool IsError);
