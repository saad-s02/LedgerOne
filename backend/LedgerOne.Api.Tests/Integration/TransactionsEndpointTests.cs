using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using LedgerOne.Api.Features.Transactions;

namespace LedgerOne.Api.Tests.Integration;

public class TransactionsEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public async Task Get_Transactions_Default_Returns200WithEnvelope()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Page.Should().Be(1);
        envelope.PageSize.Should().Be(25);
        envelope.Total.Should().Be(60);
        envelope.TotalPages.Should().Be(3);
        envelope.Data.Should().HaveCount(25);
    }

    [Fact]
    public async Task Get_Transactions_Default_MatchesSnapshot()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var json = await client.GetStringAsync("/api/transactions", ct);
        await Verify(json).UseDirectory("Snapshots");
    }
}
