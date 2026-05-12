using LedgerOne.Api.Data;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(AppDbContext db)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        Validate(req);

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

    private static void Validate(ListTransactionsRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        if (req.Page < 1) errors["page"] = new[] { "Must be greater than or equal to 1." };
        if (req.PageSize < 1 || req.PageSize > 100)
            errors["pageSize"] = new[] { "Must be between 1 and 100." };
        if (errors.Count > 0) throw new ValidationException(errors);
    }
}
