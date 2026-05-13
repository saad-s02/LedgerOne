using LedgerOne.Api.Data;
using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class GetTransactionHandler(AppDbContext db)
{
    public async Task<TransactionDetailDto> Handle(int id, CancellationToken ct)
    {
        var t = await db.Transactions.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) throw new NotFoundException("Transaction", id);

        return new TransactionDetailDto(
            t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
            t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status,
            t.Notes, t.CreatedAt);
    }
}
