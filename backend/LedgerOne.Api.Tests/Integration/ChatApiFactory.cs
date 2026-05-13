using LedgerOne.Api.Features.Chat;
using LedgerOne.Api.Tests.Unit.Fakes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LedgerOne.Api.Tests.Integration;

public class ChatApiFactory : ApiFactory
{
    private readonly FakeChatAgent _fake = new();

    public FakeChatAgent Agent => _fake;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IChatAgent>();
            services.AddSingleton<IChatAgent>(_fake);
        });
    }
}
