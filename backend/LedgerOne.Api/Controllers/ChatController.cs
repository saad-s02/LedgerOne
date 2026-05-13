using LedgerOne.Api.Features.Chat;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>
/// Natural-language agent surface. Validates the request, then runs a
/// Claude-backed ReAct loop over read-only transaction tools and returns the
/// final assistant message together with the tool calls made along the way.
/// </summary>
[ApiController]
[Route("api/chat")]
[Tags("Chat")]
[Produces("application/json")]
public class ChatController(ChatHandler handler) : ControllerBase
{
    /// <summary>Send a user message and receive a tool-augmented agent response.</summary>
    /// <remarks>
    /// Request validation runs against <see cref="ChatRequestValidator"/>. The
    /// agent executes a ReAct loop capped at five iterations, calling
    /// <c>search_transactions</c> / <c>get_transaction</c> tools that re-use
    /// the same handlers as the REST endpoints — keeping the agent's view of
    /// the world identical to the dashboard's.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(ChatResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<ActionResult<ChatResponse>> Post(
        [FromBody] ChatRequest request,
        CancellationToken ct)
    {
        var response = await handler.Handle(request, ct);
        return Ok(response);
    }
}
