using System.Runtime.CompilerServices;

namespace LedgerOne.Api.Tests.Integration;

/// <summary>
/// Marks a test that requires a live Anthropic API key. Skipped automatically
/// when ANTHROPIC_API_KEY is unset. Run locally with:
///   ANTHROPIC_API_KEY=sk-ant-... dotnet test --filter "FullyQualifiedName~Smoke"
/// Never enabled in CI; opt-in only.
/// </summary>
public sealed class RequiresApiKeyFactAttribute : FactAttribute
{
    public RequiresApiKeyFactAttribute(
        [CallerFilePath] string sourceFilePath = "",
        [CallerLineNumber] int sourceLineNumber = 0)
        : base(sourceFilePath, sourceLineNumber)
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")))
        {
            Skip = "ANTHROPIC_API_KEY not set — skipping live smoke test.";
        }
    }
}
