namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}
