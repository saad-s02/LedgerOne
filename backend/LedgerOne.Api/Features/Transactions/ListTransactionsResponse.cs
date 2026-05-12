namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsResponse(
    IReadOnlyList<TransactionDto> Data,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);
