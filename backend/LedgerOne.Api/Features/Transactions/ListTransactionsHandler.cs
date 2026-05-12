using LedgerOne.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(AppDbContext db)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        var total = await db.Transactions.CountAsync(ct);
        var data = await db.Transactions
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.Id)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(t => new TransactionDto(
                t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
                t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status))
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / req.PageSize);
        return new ListTransactionsResponse(data, total, req.Page, req.PageSize, totalPages);
    }
}
