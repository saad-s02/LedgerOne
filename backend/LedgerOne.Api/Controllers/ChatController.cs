using FluentValidation;
using LedgerOne.Api.Features.Chat;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

/// <summary>
/// Natural-language agent surface. The contract is fully designed and the
/// validation pipeline is wired up; the ReAct loop and tool implementations
/// ship in sub-project 3. Until then the endpoint validates the request and
/// returns 501 Not Implemented so callers see an honest signal.
/// </summary>
[ApiController]
[Route("api/chat")]
[Tags("Chat")]
[Produces("application/json")]
public class ChatController(IValidator<ChatRequest> validator) : ControllerBase
{
    /// <summary>Send a user message and (eventually) receive a tool-augmented agent response.</summary>
    /// <remarks>
    /// Request validation runs against <see cref="ChatRequestValidator"/>. Once
    /// the agent ships, this endpoint will execute a ReAct loop capped at five
    /// iterations, calling <c>search_transactions</c> / <c>get_transaction</c>
    /// tools that re-use the same handlers as the REST endpoints — keeping the
    /// agent's view of the world identical to the dashboard's.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(ChatResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public async Task<IActionResult> Post(
        [FromBody] ChatRequest request,
        CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(request, ct);
        return StatusCode(StatusCodes.Status501NotImplemented);
    }
}
