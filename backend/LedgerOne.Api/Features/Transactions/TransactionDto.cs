using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record TransactionDto(
    int Id,
    DateTime TransactionDate,
    string AccountId,
    string AdvisorName,
    TransactionType Type,
    string? SecuritySymbol,
    decimal Amount,
    Currency Currency,
    TransactionStatus Status);
