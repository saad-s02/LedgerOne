namespace LedgerOne.Api.Features.Logs;

/// <summary>A single captured log entry as exposed by the /api/logs endpoint.</summary>
/// <param name="Id">Monotonic id assigned by the in-memory sink. Use for incremental polling.</param>
/// <param name="Timestamp">UTC timestamp from the underlying log event.</param>
/// <param name="Level">Serilog level name (Verbose, Debug, Information, Warning, Error, Fatal).</param>
/// <param name="Message">The fully rendered message template.</param>
/// <param name="CorrelationId">Correlation id from CorrelationIdMiddleware, when present.</param>
/// <param name="SourceContext">Logger source context (typically the class name), when present.</param>
/// <param name="Exception">Formatted exception (including stack trace), when present.</param>
public record LogEntryDto(
    long Id,
    DateTime Timestamp,
    string Level,
    string Message,
    string? CorrelationId,
    string? SourceContext,
    string? Exception);
