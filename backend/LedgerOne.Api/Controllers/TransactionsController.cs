using LedgerOne.Api.Features.Transactions;
using LedgerOne.Api.Infrastructure.ProblemDetails;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>
/// Read access to the transactions ledger. All endpoints return data in the
/// account currency without conversion; status enums serialize as their name.
/// </summary>
[ApiController]
[Route("api/transactions")]
[Tags("Transactions")]
[Produces("application/json")]
public class TransactionsController(
    ListTransactionsHandler listHandler,
    GetTransactionHandler getHandler) : ControllerBase
{
    /// <summary>List transactions with filtering, sorting, and offset pagination.</summary>
    /// <remarks>
    /// Backed by the composite index <c>(Status, TransactionDate DESC)</c> so the
    /// common "recent pending" and "recent settled" access patterns are served
    /// from the index without a sort step. The search clause matches on
    /// <c>AccountId</c>, <c>SecuritySymbol</c>, or <c>AdvisorName</c> (case-
    /// insensitive contains). PageSize is capped server-side at 100.
    /// </remarks>
    /// <returns>An envelope with the page of results plus total/page metadata.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(ListTransactionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ListTransactionsResponse>> List(
        [FromQuery] ListTransactionsRequest request,
        CancellationToken ct)
    {
        var response = await listHandler.Handle(request, ct);
        return Ok(response);
    }

    /// <summary>Get a single transaction by id, including notes and audit timestamp.</summary>
    /// <param name="id">The transaction id (positive integer).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The full transaction detail, or 404 problem details if not found.</returns>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TransactionDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransactionDetailDto>> Get(int id, CancellationToken ct)
    {
        var dto = await getHandler.Handle(id, ct);
        return Ok(dto);
    }
}
