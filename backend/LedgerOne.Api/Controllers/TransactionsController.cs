using LedgerOne.Api.Features.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionsController(ListTransactionsHandler handler) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ListTransactionsResponse>> List(
        [FromQuery] ListTransactionsRequest request,
        CancellationToken ct)
    {
        var response = await handler.Handle(request, ct);
        return Ok(response);
    }
}
