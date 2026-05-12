using System.Runtime.CompilerServices;

namespace LedgerOne.Api.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.AddScrubber(text => text.Replace("\r\n", "\n"));
    }
}
