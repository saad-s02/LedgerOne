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
            problem.Extensions["traceId"] = httpContext.TraceIdentifier;
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
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
            problem.Extensions["traceId"] = httpContext.TraceIdentifier;
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }

        logger.LogError(exception, "Unhandled exception (traceId: {TraceId})", httpContext.TraceIdentifier);

        var serverProblem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "about:blank",
            Title = "An unexpected error occurred.",
            Status = StatusCodes.Status500InternalServerError,
        };
        serverProblem.Extensions["traceId"] = httpContext.TraceIdentifier;
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(serverProblem, cancellationToken);
        return true;
    }
}
