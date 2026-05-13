using LedgerOne.Api.Features.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionsController(
    ListTransactionsHandler listHandler,
    GetTransactionHandler getHandler) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ListTransactionsResponse>> List(
        [FromQuery] ListTransactionsRequest request,
        CancellationToken ct)
    {
        var response = await listHandler.Handle(request, ct);
        return Ok(response);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TransactionDetailDto>> Get(int id, CancellationToken ct)
    {
        var dto = await getHandler.Handle(id, ct);
        return Ok(dto);
    }
}
