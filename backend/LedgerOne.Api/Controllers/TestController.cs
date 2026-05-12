using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/test")]
public class TestController(AppDbContext db) : ControllerBase
{
    [HttpPost("seed")]
    public async Task<IActionResult> Seed(CancellationToken ct)
    {
        await TestSeeder.ResetAndSeedAsync(db, ct);
        return NoContent();
    }

    [HttpPost("clear")]
    public async Task<IActionResult> Clear(CancellationToken ct)
    {
        await TestSeeder.ClearAsync(db, ct);
        return NoContent();
    }
}
