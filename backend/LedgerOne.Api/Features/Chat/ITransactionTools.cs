using System.Text.Json;

namespace LedgerOne.Api.Features.Chat;

public interface ITransactionTools
{
    Task<JsonElement> SearchTransactionsAsync(SearchTransactionsArgs args, CancellationToken ct);
    Task<JsonElement> GetTransactionAsync(GetTransactionArgs args, CancellationToken ct);
}
