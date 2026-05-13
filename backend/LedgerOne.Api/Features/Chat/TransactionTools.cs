using System.Text.Json;
using System.Text.Json.Serialization;
using LedgerOne.Api.Features.Transactions;
using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.Extensions.Logging;
using ValidationException = LedgerOne.Api.Infrastructure.Validation.ValidationException;

namespace LedgerOne.Api.Features.Chat;

public class TransactionTools(
    ListTransactionsHandler listHandler,
    GetTransactionHandler getHandler,
    ILogger<TransactionTools> logger) : ITransactionTools
{
    public const int MaxPageSize = 20;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
    };

    public async Task<JsonElement> SearchTransactionsAsync(SearchTransactionsArgs args, CancellationToken ct)
    {
        try
        {
            var req = args.ToListRequest(MaxPageSize);
            var resp = await listHandler.Handle(req, ct);
            return JsonSerializer.SerializeToElement(resp, JsonOpts);
        }
        catch (ValidationException ex)
        {
            logger.LogWarning("search_transactions validation failed: {Errors}",
                string.Join(", ", ex.Errors.SelectMany(kv => kv.Value)));
            return ErrorElement(string.Join("; ", ex.Errors.SelectMany(kv => kv.Value)));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "search_transactions failed unexpectedly");
            return ErrorElement("This tool failed.");
        }
    }

    public async Task<JsonElement> GetTransactionAsync(GetTransactionArgs args, CancellationToken ct)
    {
        try
        {
            var dto = await getHandler.Handle(args.Id, ct);
            return JsonSerializer.SerializeToElement(dto, JsonOpts);
        }
        catch (NotFoundException)
        {
            return ErrorElement($"Transaction {args.Id} not found.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "get_transaction failed unexpectedly");
            return ErrorElement("This tool failed.");
        }
    }

    private static JsonElement ErrorElement(string message) =>
        JsonSerializer.SerializeToElement(new { error = message });
}
