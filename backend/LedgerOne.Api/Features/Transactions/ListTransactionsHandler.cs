using FluentValidation;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(
    AppDbContext db,
    IValidator<ListTransactionsRequest> validator)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);

        var query = BuildQuery(db.Transactions, req);

        var total = await query.CountAsync(ct);

        query = ApplySort(query, req);

        var data = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(t => new TransactionDto(
                t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
                t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status))
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / req.PageSize);
        return new ListTransactionsResponse(data, total, req.Page, req.PageSize, totalPages);
    }

    private static IOrderedQueryable<Transaction> ApplySort(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        return (req.SortBy, req.SortDir) switch
        {
            (SortField.Date, SortDirection.Desc) => query.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id),
            (SortField.Date, SortDirection.Asc) => query.OrderBy(t => t.TransactionDate).ThenBy(t => t.Id),
            (SortField.Amount, SortDirection.Desc) => query.OrderByDescending(t => t.Amount).ThenByDescending(t => t.Id),
            (SortField.Amount, SortDirection.Asc) => query.OrderBy(t => t.Amount).ThenBy(t => t.Id),
            _ => query.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id),
        };
    }

    private static IQueryable<Transaction> BuildQuery(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        if (req.Type.HasValue)     query = query.Where(t => t.Type == req.Type.Value);
        if (req.Status.HasValue)   query = query.Where(t => t.Status == req.Status.Value);
        if (req.FromDate.HasValue) query = query.Where(t => t.TransactionDate >= req.FromDate.Value);
        if (req.ToDate.HasValue)   query = query.Where(t => t.TransactionDate <= req.ToDate.Value);
        if (req.MinAmount.HasValue) query = query.Where(t => t.Amount >= req.MinAmount.Value);
        if (req.MaxAmount.HasValue) query = query.Where(t => t.Amount <= req.MaxAmount.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var pattern = $"%{req.Search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.Like(t.AccountId, pattern) ||
                (t.SecuritySymbol != null && EF.Functions.Like(t.SecuritySymbol, pattern)) ||
                EF.Functions.Like(t.AdvisorName, pattern));
        }

        return query;
    }
}
