using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>
/// Test fixtures used by the Playwright suite. Every action here returns 404
/// in any environment other than <c>Testing</c> (gated in <c>Program.cs</c>),
/// so the routes are safe to leave compiled in for documentation purposes.
/// </summary>
[ApiController]
[Route("api/test")]
[Tags("Testing")]
[Produces("application/json")]
public class TestController(AppDbContext db) : ControllerBase
{
    /// <summary>Wipe and re-seed the database with a deterministic 60-row fixture.</summary>
    [HttpPost("seed")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Seed(CancellationToken ct)
    {
        await TestSeeder.ResetAndSeedAsync(db, ct);
        return NoContent();
    }

    /// <summary>Wipe all transactions without re-seeding.</summary>
    [HttpPost("clear")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Clear(CancellationToken ct)
    {
        await TestSeeder.ClearAsync(db, ct);
        return NoContent();
    }

    /// <summary>Deliberately throws — used by integration tests to assert the global exception handler emits problem details.</summary>
    [HttpGet("boom")]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Boom() => throw new InvalidOperationException("boom for tests");
}
