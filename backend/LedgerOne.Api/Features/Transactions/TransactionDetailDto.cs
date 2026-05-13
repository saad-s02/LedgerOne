using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record TransactionDetailDto(
    int Id,
    DateTime TransactionDate,
    string AccountId,
    string AdvisorName,
    TransactionType Type,
    string? SecuritySymbol,
    decimal Amount,
    Currency Currency,
    TransactionStatus Status,
    string? Notes,
    DateTime CreatedAt);
