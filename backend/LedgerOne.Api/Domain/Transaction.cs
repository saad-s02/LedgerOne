namespace LedgerOne.Api.Domain;

public class Transaction
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string AccountId { get; set; } = default!;
    public string AdvisorName { get; set; } = default!;
    public TransactionType Type { get; set; }
    public string? SecuritySymbol { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public TransactionStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
