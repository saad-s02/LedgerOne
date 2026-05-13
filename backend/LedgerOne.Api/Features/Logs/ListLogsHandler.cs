using LedgerOne.Api.Infrastructure.Logging;
using LedgerOne.Api.Infrastructure.Validation;
using Serilog.Events;

namespace LedgerOne.Api.Features.Logs;

public class ListLogsHandler(InMemoryLogSink sink)
{
    private const int MaxLimit = InMemoryLogSink.Capacity;
    private const int MinLimit = 1;

    public ListLogsResponse Handle(ListLogsRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        if (req.Limit is < MinLimit or > MaxLimit)
        {
            errors["limit"] = [$"Limit must be between {MinLimit} and {MaxLimit}."];
        }
        if (req.Since < 0)
        {
            errors["since"] = ["Since must be non-negative."];
        }

        LogEventLevel? minLevel = null;
        if (!string.IsNullOrWhiteSpace(req.Level))
        {
            if (Enum.TryParse<LogEventLevel>(req.Level, ignoreCase: true, out var parsed))
            {
                minLevel = parsed;
            }
            else
            {
                errors["level"] =
                    ["Level must be one of: Verbose, Debug, Information, Warning, Error, Fatal."];
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }

        var snapshot = sink.Snapshot(req.Since, req.Limit, minLevel);
        var data = snapshot.Entries
            .Select(e => new LogEntryDto(
                e.Id, e.Timestamp, e.Level, e.Message,
                e.CorrelationId, e.SourceContext, e.Exception))
            .ToList();

        var lastId = data.Count > 0 ? data[^1].Id : req.Since;
        return new ListLogsResponse(data, lastId, snapshot.BufferStartId, InMemoryLogSink.Capacity);
    }
}
