using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

/// <summary>Full transaction record returned by the detail endpoint, including notes and audit timestamp.</summary>
/// <param name="Id">Primary key.</param>
/// <param name="TransactionDate">When the transaction occurred (ISO 8601, UTC).</param>
/// <param name="AccountId">Account identifier in the form <c>ACCT-NNNNN</c>.</param>
/// <param name="AdvisorName">Advisor full name.</param>
/// <param name="Type">Transaction type.</param>
/// <param name="SecuritySymbol">Ticker symbol; null for Fee and Transfer rows.</param>
/// <param name="Amount">Amount in the account's currency, always positive.</param>
/// <param name="Currency">Account currency.</param>
/// <param name="Status">Settlement status.</param>
/// <param name="Notes">Free-text notes, may be null.</param>
/// <param name="CreatedAt">Row creation timestamp (UTC).</param>
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
