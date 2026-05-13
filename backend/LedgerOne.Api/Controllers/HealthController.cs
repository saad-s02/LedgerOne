using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>Liveness probe. Intentionally cheap so it can be polled aggressively without DB load.</summary>
[ApiController]
[Route("health")]
[Tags("Health")]
[Produces("application/json")]
public class HealthController : ControllerBase
{
    /// <summary>Returns 200 OK as long as the process is running.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new HealthResponse("Healthy"));
}

/// <summary>The health-check response body.</summary>
/// <param name="Status">Always <c>"Healthy"</c> when the endpoint is reachable.</param>
public record HealthResponse(string Status);
