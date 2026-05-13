using LedgerOne.Api.Domain;
using LedgerOne.Api.Features.Transactions;

namespace LedgerOne.Api.Features.Chat;

public record SearchTransactionsArgs
{
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public TransactionType? Type { get; init; }
    public TransactionStatus? Status { get; init; }
    public string? Search { get; init; }
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public SortField? SortBy { get; init; }
    public SortDirection? SortDir { get; init; }
    public int? Page { get; init; }
    public int? PageSize { get; init; }

    public ListTransactionsRequest ToListRequest(int maxPageSize)
    {
        var requestedPageSize = PageSize ?? 20;
        var clampedPageSize = Math.Min(requestedPageSize, maxPageSize);
        return new ListTransactionsRequest
        {
            FromDate = FromDate,
            ToDate = ToDate,
            Type = Type,
            Status = Status,
            Search = Search,
            MinAmount = MinAmount,
            MaxAmount = MaxAmount,
            SortBy = SortBy ?? SortField.Date,
            SortDir = SortDir ?? SortDirection.Desc,
            Page = Page ?? 1,
            PageSize = clampedPageSize,
        };
    }
}
