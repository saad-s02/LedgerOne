using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace LedgerOne.Api.Infrastructure.OpenApi;

/// <summary>
/// Stamps every operation with a stable <c>operationId</c> derived from the
/// controller and action names (<c>Controller_Action</c>). Without this, the
/// built-in generator omits <c>operationId</c> entirely, which makes the spec
/// less useful for codegen and for the docs page's per-endpoint overrides.
/// </summary>
internal sealed class OperationIdTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var routeValues = context.Description.ActionDescriptor.RouteValues;
        routeValues.TryGetValue("action", out var actionName);
        routeValues.TryGetValue("controller", out var controllerName);
        if (!string.IsNullOrEmpty(controllerName) && !string.IsNullOrEmpty(actionName))
        {
            operation.OperationId = $"{controllerName}_{actionName}";
        }
        return Task.CompletedTask;
    }
}
