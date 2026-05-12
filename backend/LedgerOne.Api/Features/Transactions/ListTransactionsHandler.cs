using LedgerOne.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(AppDbContext db)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        var total = await db.Transactions.CountAsync(ct);
        return new ListTransactionsResponse(
            Data: Array.Empty<TransactionDto>(),
            Total: total,
            Page: req.Page,
            PageSize: req.PageSize,
            TotalPages: 0);
    }
}
