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

    [Fact]
    public async Task Get_TransactionById_ExistingId_Returns200WithDetail()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var list = await client.GetFromJsonAsync<ListTransactionsResponse>(
            "/api/transactions?page=1&pageSize=1", JsonOptions, ct);
        list.Should().NotBeNull();
        var existingId = list!.Data.Single().Id;

        var response = await client.GetAsync($"/api/transactions/{existingId}", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await response.Content.ReadFromJsonAsync<TransactionDetailDto>(JsonOptions, ct);
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(existingId);
        dto.CreatedAt.Should().NotBe(default);
    }

    [Fact]
    public async Task Get_TransactionById_MissingId_Returns404ProblemDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions/999999", ct);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await response.Content.ReadAsStringAsync(ct);
        body.Should().Contain("traceId");
        body.Should().Contain("Resource not found");
    }

    [Fact]
    public async Task Get_Transactions_SearchByAccountId_ReturnsMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?search=ACCT-00001", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().NotBeEmpty();
        envelope.Data.Should().AllSatisfy(d => d.AccountId.Should().Contain("ACCT-00001"));
    }

    [Fact]
    public async Task Get_Transactions_FromDateAfterToDate_Returns400ProblemDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/api/transactions?fromDate=2026-05-01T00:00:00Z&toDate=2026-04-01T00:00:00Z",
            ct);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync(ct);
        body.Should().Contain("dateRange");
    }

    [Fact]
    public async Task Get_Transactions_FilterByStatus_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?status=Pending", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Total.Should().Be(20);
        envelope.Data.Should().AllSatisfy(d => d.Status.Should().Be(LedgerOne.Api.Domain.TransactionStatus.Pending));
    }

    [Fact]
    public async Task Get_Transactions_FilterByType_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?type=Buy", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Total.Should().Be(12);
        envelope.Data.Should().AllSatisfy(d => d.Type.Should().Be(LedgerOne.Api.Domain.TransactionType.Buy));
    }

    [Fact]
    public async Task Get_Transactions_SortByAmountDesc_ReturnsLargestFirst()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?sortBy=amount&sortDir=desc", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().HaveCountGreaterThan(1);
        envelope.Data
            .Zip(envelope.Data.Skip(1), (a, b) => a.Amount >= b.Amount)
            .Should().AllSatisfy(ordered => ordered.Should().BeTrue());
    }

    [Fact]
    public async Task Get_Transactions_MinAmount_FiltersBelowBound()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        // Seeded amounts: 100 + i*137.5 for i=0..59, max ≈ 8212.
        // minAmount=5000 selects rows where i>=36 (amount ≥ 5050), giving non-empty results.
        var envelope = await client.GetFromJsonAsync<ListTransactionsResponse>(
            "/api/transactions?minAmount=5000", JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().NotBeEmpty();
        envelope.Data.Should().OnlyContain(t => t.Amount >= 5000m);
    }

    [Fact]
    public async Task Get_Transactions_MinAndMaxAmount_ReturnsIntersection()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var envelope = await client.GetFromJsonAsync<ListTransactionsResponse>(
            "/api/transactions?minAmount=5000&maxAmount=20000", JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().OnlyContain(t => t.Amount >= 5000m && t.Amount <= 20000m);
    }

    [Fact]
    public async Task Get_Transactions_MaxLessThanMin_Returns400ProblemDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/transactions?minAmount=100&maxAmount=50", ct);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync(ct);
        body.Should().Contain("amountRange");
    }

    [Fact]
    public async Task Get_Transactions_SearchMatchesAdvisorName()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        // Pull one row to discover an advisor name in the fixture
        var list = await client.GetFromJsonAsync<ListTransactionsResponse>(
            "/api/transactions?page=1&pageSize=1", JsonOptions, ct);
        list.Should().NotBeNull();
        var advisor = list!.Data.Single().AdvisorName;
        var firstWord = advisor.Split(' ')[0];

        var envelope = await client.GetFromJsonAsync<ListTransactionsResponse>(
            $"/api/transactions?search={Uri.EscapeDataString(firstWord)}", JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().NotBeEmpty();
        envelope.Data.Should().OnlyContain(t => t.AdvisorName.Contains(firstWord, StringComparison.OrdinalIgnoreCase));
    }
}
