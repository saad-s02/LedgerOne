using LedgerOne.Api.Infrastructure.Errors;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LedgerOne.Api.Infrastructure.ProblemDetails;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ValidationException ve)
        {
            var problem = new ValidationProblemDetails(
                ve.Errors.ToDictionary(kv => kv.Key, kv => kv.Value))
            {
                Type = "about:blank",
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status400BadRequest,
            };
            return await WriteProblem(httpContext, problem, StatusCodes.Status400BadRequest, cancellationToken);
        }

        if (exception is NotFoundException nf)
        {
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Type = "about:blank",
                Title = "Resource not found.",
                Status = StatusCodes.Status404NotFound,
                Detail = nf.Message,
            };
            return await WriteProblem(httpContext, problem, StatusCodes.Status404NotFound, cancellationToken);
        }

        if (exception is ChatNotConfiguredException cnc)
        {
            logger.LogError(cnc, "Chat invoked but ANTHROPIC_API_KEY is not configured (traceId: {TraceId})",
                httpContext.TraceIdentifier);
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Type = "about:blank",
                Title = "Chat is not configured.",
                Status = StatusCodes.Status503ServiceUnavailable,
                Detail = cnc.Message,
            };
            return await WriteProblem(httpContext, problem, StatusCodes.Status503ServiceUnavailable, cancellationToken);
        }

        if (exception is ChatBackendException cbe)
        {
            logger.LogError(cbe, "Chat backend failure (traceId: {TraceId})", httpContext.TraceIdentifier);
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Type = "about:blank",
                Title = "Chat service is unavailable.",
                Status = StatusCodes.Status502BadGateway,
                Detail = cbe.Message,
            };
            return await WriteProblem(httpContext, problem, StatusCodes.Status502BadGateway, cancellationToken);
        }

        if (exception is ChatTimeoutException cte)
        {
            logger.LogWarning(cte, "Chat request timed out (traceId: {TraceId})", httpContext.TraceIdentifier);
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Type = "about:blank",
                Title = "Chat request timed out.",
                Status = StatusCodes.Status504GatewayTimeout,
                Detail = cte.Message,
            };
            return await WriteProblem(httpContext, problem, StatusCodes.Status504GatewayTimeout, cancellationToken);
        }

        logger.LogError(exception, "Unhandled exception (traceId: {TraceId})", httpContext.TraceIdentifier);

        var serverProblem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "about:blank",
            Title = "An unexpected error occurred.",
            Status = StatusCodes.Status500InternalServerError,
        };
        return await WriteProblem(httpContext, serverProblem, StatusCodes.Status500InternalServerError, cancellationToken);
    }

    private static async ValueTask<bool> WriteProblem(
        HttpContext ctx, Microsoft.AspNetCore.Mvc.ProblemDetails problem, int status, CancellationToken ct)
    {
        problem.Extensions["traceId"] = ctx.TraceIdentifier;
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/problem+json";
        // Serialize using the runtime type so ValidationProblemDetails.Errors is included.
        await ctx.Response.WriteAsJsonAsync(problem, problem.GetType(), options: null, contentType: null, ct);
        return true;
    }
}
