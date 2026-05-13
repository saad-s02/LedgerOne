using FluentValidation;
using LedgerOne.Api.Features.Chat;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController(IValidator<ChatRequest> validator) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post(
        [FromBody] ChatRequest request,
        CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(request, ct);
        return StatusCode(StatusCodes.Status501NotImplemented);
    }
}
