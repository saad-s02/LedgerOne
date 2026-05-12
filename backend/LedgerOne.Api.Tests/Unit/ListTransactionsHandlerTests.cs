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
}
