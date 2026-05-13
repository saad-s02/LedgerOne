using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

/// <summary>Query parameters for the list transactions endpoint.</summary>
public record ListTransactionsRequest
{
    /// <summary>1-indexed page number. Defaults to 1.</summary>
    public int Page { get; init; } = 1;

    /// <summary>Rows per page. Server-side cap of 100.</summary>
    public int PageSize { get; init; } = 25;

    /// <summary>Inclusive lower bound on TransactionDate (ISO 8601).</summary>
    public DateTime? FromDate { get; init; }

    /// <summary>Inclusive upper bound on TransactionDate (ISO 8601).</summary>
    public DateTime? ToDate { get; init; }

    /// <summary>Filter to a single transaction type.</summary>
    public TransactionType? Type { get; init; }

    /// <summary>Filter to a single settlement status.</summary>
    public TransactionStatus? Status { get; init; }

    /// <summary>Case-insensitive contains-match against AccountId, SecuritySymbol, and AdvisorName.</summary>
    public string? Search { get; init; }

    /// <summary>Inclusive lower bound on Amount.</summary>
    public decimal? MinAmount { get; init; }

    /// <summary>Inclusive upper bound on Amount.</summary>
    public decimal? MaxAmount { get; init; }

    /// <summary>Sort column (date or amount). Defaults to date.</summary>
    public SortField SortBy { get; init; } = SortField.Date;

    /// <summary>Sort direction (asc or desc). Defaults to desc.</summary>
    public SortDirection SortDir { get; init; } = SortDirection.Desc;
}
