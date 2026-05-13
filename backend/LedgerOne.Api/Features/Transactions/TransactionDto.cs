using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

/// <summary>A single transaction row, projected for the list endpoint.</summary>
/// <param name="Id">Primary key.</param>
/// <param name="TransactionDate">When the transaction occurred (ISO 8601, UTC).</param>
/// <param name="AccountId">Account identifier in the form <c>ACCT-NNNNN</c>.</param>
/// <param name="AdvisorName">Advisor full name. Denormalized — see design decision on AdvisorName denormalization.</param>
/// <param name="Type">Transaction type (Buy, Sell, Fee, Transfer, Dividend).</param>
/// <param name="SecuritySymbol">Ticker symbol; null for Fee and Transfer rows.</param>
/// <param name="Amount">Amount in the account's currency, always positive.</param>
/// <param name="Currency">Account currency (CAD or USD).</param>
/// <param name="Status">Settlement status (Pending, Settled, Cancelled).</param>
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
