using LedgerOne.Api.Features.Logs;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>
/// In-process log viewer. Reads from the in-memory Serilog sink that mirrors
/// the console output, capped at the most recent 500 entries. Intended for
/// dashboard rendering and short-window diagnostics, not durable log storage.
/// </summary>
[ApiController]
[Route("api/logs")]
[Tags("Diagnostics")]
[Produces("application/json")]
public class LogsController(ListLogsHandler listHandler) : ControllerBase
{
    /// <summary>List recent log entries with incremental polling support.</summary>
    /// <remarks>
    /// Pass <c>since</c> = the previous response's <c>lastId</c> to fetch only
    /// new entries. If <c>since</c> falls behind <c>bufferStartId</c> the
    /// caller missed entries and should treat the next batch as a partial
    /// recovery. <c>level</c> filters out anything strictly below the named
    /// Serilog level.
    /// </remarks>
    /// <returns>An envelope with the entries plus polling metadata.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(ListLogsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<ListLogsResponse> List([FromQuery] ListLogsRequest request)
    {
        return Ok(listHandler.Handle(request));
    }
}
