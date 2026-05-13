namespace LedgerOne.Api.Features.Logs;

/// <summary>Query parameters for the list logs endpoint.</summary>
public record ListLogsRequest
{
    /// <summary>Only return entries with Id strictly greater than this value. Use for incremental polling.</summary>
    public long Since { get; init; }

    /// <summary>
    /// Minimum Serilog level to include (Verbose, Debug, Information, Warning, Error, Fatal).
    /// Omit to include all levels.
    /// </summary>
    public string? Level { get; init; }

    /// <summary>Maximum entries to return. Server-side cap of 500.</summary>
    public int Limit { get; init; } = 200;
}
