using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace LedgerOne.Api.Infrastructure.OpenApi;

/// <summary>
/// Decorates the generated OpenAPI document with the API's identity, narrative,
/// server URL, and tag descriptions. The transformer runs once per document
/// generation; per-operation metadata (summaries, response types) lives on the
/// controllers themselves.
/// </summary>
internal sealed class LedgerOneDocumentTransformer(IHostEnvironment env) : IOpenApiDocumentTransformer
{
    private const string Description = """
        REST API for the LedgerOne investment transactions dashboard.

        Built as a PriceMetrix take-home to demonstrate clean API design on the
        .NET stack: thin controllers + feature handlers, EF Core with explicit
        indexes, RFC 7807 problem details on every error path, structured
        Serilog logging with per-request correlation IDs, and an honest
        OpenAPI surface generated directly from the code that serves it.

        The frontend at /docs renders this spec alongside the design decisions,
        scale considerations, and observability story that informed each
        endpoint.
        """;

    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Info = new OpenApiInfo
        {
            Title = "LedgerOne API",
            Version = "v1",
            Description = Description,
            Contact = new OpenApiContact
            {
                Name = "Saad Siddiqui",
                Email = "saadsidd2002@gmail.com",
            },
        };

        document.Servers =
        [
            new OpenApiServer
            {
                Url = "http://localhost:5000",
                Description = $"{env.EnvironmentName} (local)",
            },
        ];

        document.Tags = new HashSet<OpenApiTag>
        {
            new OpenApiTag
            {
                Name = "Transactions",
                Description = "Paginated read access to the transactions ledger. The primary surface for the dashboard.",
            },
            new OpenApiTag
            {
                Name = "Chat",
                Description = "Natural-language agent layer. Scaffolded but returns 501 until sub-project 3 lands the ReAct loop and tool implementations.",
            },
            new OpenApiTag
            {
                Name = "Health",
                Description = "Liveness probe. Always responds 200 OK with a static body.",
            },
            new OpenApiTag
            {
                Name = "Testing",
                Description = "Endpoints gated to the Testing environment only — used by Playwright fixtures to seed and clear deterministic data. Returns 404 in Development and Production.",
            },
        };

        return Task.CompletedTask;
    }
}
