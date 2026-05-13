using Serilog.Core;
using Serilog.Events;

namespace LedgerOne.Api.Infrastructure.Logging;

/// <summary>
/// Thread-safe ring-buffer Serilog sink. Retains the most recent
/// <see cref="Capacity"/> log events in memory so they can be served by the
/// /api/logs endpoint and rendered in the dashboard. Older entries are dropped
/// when the buffer is full.
/// </summary>
public sealed class InMemoryLogSink : ILogEventSink
{
    public const int Capacity = 500;

    private readonly object _lock = new();
    private readonly LinkedList<CapturedLogEntry> _entries = new();
    private long _nextId;

    public void Emit(LogEvent logEvent)
    {
        if (logEvent is null) return;

        var entry = new CapturedLogEntry(
            Id: Interlocked.Increment(ref _nextId),
            Timestamp: logEvent.Timestamp.UtcDateTime,
            Level: logEvent.Level.ToString(),
            Message: logEvent.RenderMessage(),
            CorrelationId: ReadScalarString(logEvent, "CorrelationId"),
            SourceContext: ReadScalarString(logEvent, "SourceContext"),
            Exception: logEvent.Exception?.ToString());

        lock (_lock)
        {
            _entries.AddLast(entry);
            while (_entries.Count > Capacity)
            {
                _entries.RemoveFirst();
            }
        }
    }

    /// <summary>
    /// Returns entries with <c>Id &gt; sinceId</c> matching the optional
    /// minimum-level filter, oldest first, capped at <paramref name="limit"/>.
    /// </summary>
    public LogSnapshot Snapshot(long sinceId, int limit, LogEventLevel? minLevel)
    {
        CapturedLogEntry[] copy;
        long bufferStartId;
        lock (_lock)
        {
            copy = _entries.ToArray();
            bufferStartId = copy.Length > 0 ? copy[0].Id : 0;
        }

        var filtered = new List<CapturedLogEntry>(copy.Length);
        foreach (var e in copy)
        {
            if (e.Id <= sinceId) continue;
            if (minLevel.HasValue && Enum.TryParse<LogEventLevel>(e.Level, out var lvl) && lvl < minLevel.Value)
            {
                continue;
            }
            filtered.Add(e);
            if (filtered.Count >= limit) break;
        }

        return new LogSnapshot(filtered, bufferStartId);
    }

    private static string? ReadScalarString(LogEvent logEvent, string propertyName)
    {
        if (!logEvent.Properties.TryGetValue(propertyName, out var value)) return null;
        return value is ScalarValue { Value: string s } ? s : null;
    }
}

public sealed record CapturedLogEntry(
    long Id,
    DateTime Timestamp,
    string Level,
    string Message,
    string? CorrelationId,
    string? SourceContext,
    string? Exception);

public sealed record LogSnapshot(IReadOnlyList<CapturedLogEntry> Entries, long BufferStartId);
