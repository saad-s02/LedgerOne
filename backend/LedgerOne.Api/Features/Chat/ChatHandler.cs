using FluentValidation;
using LedgerOne.Api.Infrastructure.Errors;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LedgerOne.Api.Features.Chat;

public class ChatHandler(
    IChatAgent agent,
    ITransactionTools tools,
    IValidator<ChatRequest> validator,
    IConfiguration config,
    ILogger<ChatHandler> logger)
{
    public async Task<ChatResponse> Handle(ChatRequest req, CancellationToken outerCt)
    {
        await validator.ValidateOrThrowAsync(req, outerCt);

        var timeoutSeconds = config.GetValue<int>("Chat:TimeoutSeconds", 60);
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(outerCt);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        try
        {
            var start = DateTime.UtcNow;
            var result = await agent.RunAsync(req.Message, req.ConversationHistory, tools, cts.Token);
            logger.LogInformation(
                "Chat completed: turns={ToolCallCount} duration={DurationMs}ms stoppedAtCap={StoppedAtCap}",
                result.ToolCalls.Count,
                (DateTime.UtcNow - start).TotalMilliseconds,
                result.StoppedAtCap);

            return new ChatResponse(result.FinalText, result.ToolCalls);
        }
        catch (OperationCanceledException) when (!outerCt.IsCancellationRequested)
        {
            // Our 60-second timeout fired (linked token cancelled but outer didn't).
            throw new ChatTimeoutException(
                $"Chat request exceeded {timeoutSeconds}-second timeout.");
        }
    }
}
