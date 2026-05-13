namespace LedgerOne.Api.Features.Transactions;

/// <summary>Page envelope returned by the list transactions endpoint.</summary>
/// <param name="Data">The current page of transaction rows, in sort order.</param>
/// <param name="Total">Total matching rows across all pages.</param>
/// <param name="Page">1-indexed current page.</param>
/// <param name="PageSize">Rows requested per page.</param>
/// <param name="TotalPages">Total page count, derived from <c>ceil(Total / PageSize)</c>.</param>
public record ListTransactionsResponse(
    IReadOnlyList<TransactionDto> Data,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);
