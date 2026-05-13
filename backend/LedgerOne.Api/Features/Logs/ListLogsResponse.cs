namespace LedgerOne.Api.Features.Logs;

/// <summary>Response envelope for the list logs endpoint.</summary>
/// <param name="Data">The entries returned, oldest first.</param>
/// <param name="LastId">The largest entry id in this batch — pass back as <c>since</c> to poll for new entries.</param>
/// <param name="BufferStartId">The smallest id still in the ring buffer. If <c>since &lt; BufferStartId</c> the caller missed entries.</param>
/// <param name="Capacity">The configured ring-buffer capacity.</param>
public record ListLogsResponse(
    IReadOnlyList<LogEntryDto> Data,
    long LastId,
    long BufferStartId,
    int Capacity);
