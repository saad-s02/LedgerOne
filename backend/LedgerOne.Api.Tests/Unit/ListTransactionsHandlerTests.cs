using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using LedgerOne.Api.Features.Transactions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Tests.Unit;

public class ListTransactionsHandlerTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly AppDbContext _db;
    private readonly ListTransactionsHandler _sut;

    public ListTransactionsHandlerTests()
    {
        _conn = new SqliteConnection("Data Source=:memory:");
        _conn.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options;
        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();
        _sut = new ListTransactionsHandler(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    private void SeedRows(int count)
    {
        for (var i = 0; i < count; i++)
        {
            _db.Transactions.Add(new Transaction
            {
                TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(i),
                AccountId = $"ACCT-{i:00000}",
                AdvisorName = "Test Advisor",
                Type = TransactionType.Buy,
                SecuritySymbol = "AAPL",
                Amount = 100m + i,
                Currency = Currency.CAD,
                Status = TransactionStatus.Settled,
                CreatedAt = DateTime.UtcNow,
            });
        }
        _db.SaveChanges();
    }

    [Fact]
    public async Task Handle_ReturnsTotalEqualToRowCount_RegardlessOfPage()
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(73);
        var response = await _sut.Handle(new ListTransactionsRequest(), ct);
        response.Total.Should().Be(73);
    }

    [Fact]
    public async Task Handle_Page2WithPageSize25_ReturnsRows26Through50()
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(60);
        var response = await _sut.Handle(new ListTransactionsRequest { Page = 2, PageSize = 25 }, ct);
        response.Data.Should().HaveCount(25);
        // Default sort is TransactionDate DESC, so newest first.
        // Row index in seed order: 0 has earliest date, 59 has latest.
        // After DESC sort, page 1 = rows 59..35, page 2 = rows 34..10.
        response.Data.First().AccountId.Should().Be("ACCT-00034");
        response.Data.Last().AccountId.Should().Be("ACCT-00010");
    }

    [Theory]
    [InlineData(0, 25, 0)]
    [InlineData(1, 25, 1)]
    [InlineData(25, 25, 1)]
    [InlineData(26, 25, 2)]
    [InlineData(73, 25, 3)]
    [InlineData(100, 25, 4)]
    [InlineData(101, 25, 5)]
    public async Task Handle_ComputesTotalPagesCorrectly(int rowCount, int pageSize, int expectedTotalPages)
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(rowCount);
        var response = await _sut.Handle(new ListTransactionsRequest { PageSize = pageSize }, ct);
        response.TotalPages.Should().Be(expectedTotalPages);
    }

    [Fact]
    public async Task Handle_WithDefaultRequest_UsesPage1AndPageSize25()
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(10);
        var response = await _sut.Handle(new ListTransactionsRequest(), ct);
        response.Page.Should().Be(1);
        response.PageSize.Should().Be(25);
        response.Data.Should().HaveCount(10);
    }

    [Fact]
    public async Task Handle_WithEmptyDb_ReturnsZeroTotalAndEmptyData()
    {
        var ct = TestContext.Current.CancellationToken;
        var response = await _sut.Handle(new ListTransactionsRequest(), ct);
        response.Total.Should().Be(0);
        response.Data.Should().BeEmpty();
        response.TotalPages.Should().Be(0);
    }

    [Fact]
    public async Task Handle_PageExceedsTotalPages_ReturnsEmptyDataButCorrectTotal()
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(10);
        var response = await _sut.Handle(new ListTransactionsRequest { Page = 99, PageSize = 25 }, ct);
        response.Total.Should().Be(10);
        response.Data.Should().BeEmpty();
        response.Page.Should().Be(99);
    }
}
