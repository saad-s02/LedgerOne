using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LedgerOne.Api.Features.Chat;

// Stub: replaced by the real Anthropic SDK call in Task 11.
// Existing integration tests swap this out via ChatApiFactory.
public class AnthropicChatAgent(
    IConfiguration config,
    ILogger<AnthropicChatAgent> logger) : IChatAgent
{
    // config is used in Task 11 to read the Anthropic API key.
    private readonly IConfiguration _config = config;

    public Task<ChatAgentResult> RunAsync(
        string userMessage,
        IReadOnlyList<ChatMessageDto> history,
        ITransactionTools tools,
        CancellationToken ct)
    {
        logger.LogError("AnthropicChatAgent stub invoked — replace with real implementation.");
        throw new ChatBackendException("AnthropicChatAgent not yet implemented.");
    }
}
