using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LedgerOne.Api.Features.Chat;

public class AnthropicChatAgent(
    IConfiguration config,
    ILogger<AnthropicChatAgent> logger) : IChatAgent
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<ChatAgentResult> RunAsync(
        string userMessage,
        IReadOnlyList<ChatMessageDto> history,
        ITransactionTools tools,
        CancellationToken ct)
    {
        var modelId = config.GetValue<string>("Chat:Model", "claude-haiku-4-5")!;
        var maxTokens = config.GetValue<int>("Chat:MaxTokens", 4096);
        var maxIterations = config.GetValue<int>("Chat:MaxIterations", 5);

        var client = CreateClientOrThrow();

        var systemPrompt = ChatPrompts.Render(DateOnly.FromDateTime(DateTime.UtcNow));
        var toolDefs = BuildToolDefinitions();

        var messages = new List<MessageParam>();
        foreach (var h in history)
        {
            var role = h.Role == "assistant" ? Role.Assistant : Role.User;
            messages.Add(new MessageParam { Role = role, Content = h.Content });
        }
        messages.Add(new MessageParam { Role = Role.User, Content = userMessage });

        var collected = new List<ToolCallDto>();

        for (var turn = 1; turn <= maxIterations; turn++)
        {
            logger.LogInformation("Chat turn {Turn} of {Max}", turn, maxIterations);

            Message resp;
            try
            {
                resp = await client.Messages.Create(new MessageCreateParams
                {
                    Model = modelId,
                    MaxTokens = maxTokens,
                    System = systemPrompt,
                    Tools = toolDefs,
                    Messages = messages,
                }, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Anthropic API call failed on turn {Turn}", turn);
                throw new ChatBackendException("Failed to call the chat model.", ex);
            }

            var toolUses = new List<ToolUseBlock>();
            foreach (var block in resp.Content)
            {
                if (block.TryPickToolUse(out var tu))
                    toolUses.Add(tu);
            }

            if (toolUses.Count == 0)
            {
                var finalText = string.Concat(
                    resp.Content
                        .Select(b => b.TryPickText(out var t) ? t.Text : null)
                        .Where(t => t != null));
                logger.LogInformation(
                    "Chat completed in {Turns} turn(s), {ToolCallCount} tool call(s).",
                    turn, collected.Count);
                return new ChatAgentResult(finalText, collected, StoppedAtCap: false);
            }

            // Append the assistant turn with all its content blocks
            var assistantContent = new List<ContentBlockParam>();
            foreach (var block in resp.Content)
            {
                if (block.TryPickText(out var textBlock))
                {
                    assistantContent.Add(new TextBlockParam { Text = textBlock.Text });
                }
                else if (block.TryPickToolUse(out var tuBlock))
                {
                    assistantContent.Add(new ToolUseBlockParam
                    {
                        ID = tuBlock.ID,
                        Name = tuBlock.Name,
                        Input = tuBlock.Input,
                    });
                }
            }
            messages.Add(new MessageParam { Role = Role.Assistant, Content = assistantContent });

            // Dispatch each tool call and collect results
            var toolResults = new List<ContentBlockParam>();
            foreach (var tu in toolUses)
            {
                var (resultJson, isError) = await DispatchToolAsync(tools, tu, ct);
                toolResults.Add(new ToolResultBlockParam
                {
                    ToolUseID = tu.ID,
                    Content = resultJson.GetRawText(),
                    IsError = isError,
                });

                collected.Add(new ToolCallDto(
                    tu.Name,
                    JsonSerializer.SerializeToElement(tu.Input, JsonOpts),
                    resultJson,
                    isError));

                logger.LogInformation(
                    "Tool call: {Tool} (turn {Turn}) isError={IsError}",
                    tu.Name, turn, isError);
            }
            messages.Add(new MessageParam { Role = Role.User, Content = toolResults });
        }

        logger.LogWarning("Chat hit iteration cap of {Cap}", maxIterations);
        return new ChatAgentResult(ChatPrompts.IterationCapMessage, collected, StoppedAtCap: true);
    }

    private static AnthropicClient CreateClientOrThrow()
    {
        var key = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ChatNotConfiguredException(
                "ANTHROPIC_API_KEY environment variable is not set. " +
                "Configure it in your environment or via dotnet user-secrets / fly secrets.");
        }
        return new AnthropicClient { ApiKey = key };
    }

    private async Task<(JsonElement resultJson, bool isError)> DispatchToolAsync(
        ITransactionTools tools, ToolUseBlock tu, CancellationToken ct)
    {
        try
        {
            JsonElement result;
            switch (tu.Name)
            {
                case "search_transactions":
                    {
                        var args = ParseArgs<SearchTransactionsArgs>(tu.Input);
                        result = await tools.SearchTransactionsAsync(args, ct);
                        break;
                    }
                case "get_transaction":
                    {
                        var args = ParseArgs<GetTransactionArgs>(tu.Input);
                        result = await tools.GetTransactionAsync(args, ct);
                        break;
                    }
                default:
                    {
                        logger.LogWarning("Unknown tool requested: {Tool}", tu.Name);
                        result = JsonSerializer.SerializeToElement(
                            new { error = $"Unknown tool: {tu.Name}." });
                        break;
                    }
            }
            var isError = result.TryGetProperty("error", out _);
            return (result, isError);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Tool dispatch failed for {Tool}", tu.Name);
            return (JsonSerializer.SerializeToElement(new { error = "Tool dispatch failed." }), true);
        }
    }

    private static T ParseArgs<T>(IReadOnlyDictionary<string, JsonElement> raw)
    {
        var json = JsonSerializer.Serialize(raw);
        return JsonSerializer.Deserialize<T>(json, JsonOpts)
               ?? throw new InvalidOperationException($"Failed to parse args for {typeof(T).Name}");
    }

    private static List<ToolUnion> BuildToolDefinitions()
    {
        var searchSchema = new InputSchema
        {
            Properties = new Dictionary<string, JsonElement>
            {
                ["fromDate"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    format = "date-time",
                    description = "Inclusive lower bound on TransactionDate (ISO 8601)."
                }),
                ["toDate"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    format = "date-time",
                    description = "Inclusive upper bound on TransactionDate (ISO 8601)."
                }),
                ["type"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    @enum = new[] { "Buy", "Sell", "Fee", "Transfer", "Dividend" },
                    description = "Transaction type."
                }),
                ["status"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    @enum = new[] { "Pending", "Settled", "Cancelled" },
                    description = "Transaction status."
                }),
                ["search"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    description = "Contains match (case-insensitive) on AccountId, SecuritySymbol, or AdvisorName."
                }),
                ["minAmount"] = JsonSerializer.SerializeToElement(new
                {
                    type = "number",
                    description = "Inclusive lower bound on Amount."
                }),
                ["maxAmount"] = JsonSerializer.SerializeToElement(new
                {
                    type = "number",
                    description = "Inclusive upper bound on Amount."
                }),
                ["sortBy"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    @enum = new[] { "Date", "Amount" },
                    description = "Sort field. Use \"Amount\" with sortDir=\"Desc\" and pageSize=1 for \"largest\" questions."
                }),
                ["sortDir"] = JsonSerializer.SerializeToElement(new
                {
                    type = "string",
                    @enum = new[] { "Asc", "Desc" },
                    description = "Sort direction. Defaults to Desc."
                }),
                ["page"] = JsonSerializer.SerializeToElement(new
                {
                    type = "integer",
                    minimum = 1,
                    description = "1-indexed page number."
                }),
                ["pageSize"] = JsonSerializer.SerializeToElement(new
                {
                    type = "integer",
                    minimum = 1,
                    maximum = 20,
                    description = "Max rows returned. Server-capped at 20 even if higher is requested."
                }),
            },
        };

        var getSchema = new InputSchema
        {
            Properties = new Dictionary<string, JsonElement>
            {
                ["id"] = JsonSerializer.SerializeToElement(new
                {
                    type = "integer",
                    description = "Transaction id."
                }),
            },
            Required = new List<string> { "id" },
        };

        return new List<ToolUnion>
        {
            new Tool
            {
                Name = "search_transactions",
                Description =
                    "Search investment transactions with optional filters. " +
                    "Returns a paginated envelope { data, total, page, pageSize, totalPages }. " +
                    "For \"largest\"/\"smallest\" questions, use sortBy=Amount + sortDir + pageSize=1.",
                InputSchema = searchSchema,
            },
            new Tool
            {
                Name = "get_transaction",
                Description = "Fetch the full detail (including Notes) for one transaction by id.",
                InputSchema = getSchema,
            },
        };
    }
}
