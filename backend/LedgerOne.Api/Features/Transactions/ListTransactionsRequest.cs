using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public TransactionType? Type { get; init; }
    public TransactionStatus? Status { get; init; }
    public string? Search { get; init; }
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public SortField SortBy { get; init; } = SortField.Date;
    public SortDirection SortDir { get; init; } = SortDirection.Desc;
}
