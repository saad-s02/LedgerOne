using System.Text.Json;
using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using LedgerOne.Api.Features.Chat;
using LedgerOne.Api.Features.Transactions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LedgerOne.Api.Tests.Unit;

public class TransactionToolsTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly AppDbContext _db;
    private readonly TransactionTools _sut;

    public TransactionToolsTests()
    {
        _conn = new SqliteConnection("Data Source=:memory:");
        _conn.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options;
        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();

        var listHandler = new ListTransactionsHandler(_db, new ListTransactionsValidator());
        var getHandler = new GetTransactionHandler(_db);
        _sut = new TransactionTools(listHandler, getHandler,
            NullLogger<TransactionTools>.Instance);
    }

    public void Dispose() { _db.Dispose(); _conn.Dispose(); }

    private int SeedOne(int amount = 100)
    {
        var t = new Transaction
        {
            TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            AccountId = "ACCT-00001",
            AdvisorName = "Sarah Chen",
            Type = TransactionType.Buy,
            SecuritySymbol = "AAPL",
            Amount = amount,
            Currency = Currency.CAD,
            Status = TransactionStatus.Settled,
            Notes = "Test note",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Transactions.Add(t);
        _db.SaveChanges();
        return t.Id;
    }

    [Fact]
    public async Task SearchTransactions_ValidArgs_ReturnsSerializedEnvelope()
    {
        var ct = TestContext.Current.CancellationToken;
        SeedOne();

        var result = await _sut.SearchTransactionsAsync(
            new SearchTransactionsArgs { Type = TransactionType.Buy }, ct);

        result.GetProperty("total").GetInt32().Should().Be(1);
        result.GetProperty("data").GetArrayLength().Should().Be(1);
        result.TryGetProperty("error", out _).Should().BeFalse();
    }

    [Fact]
    public async Task SearchTransactions_PageSizeAbove20_SilentlyClampsTo20()
    {
        var ct = TestContext.Current.CancellationToken;
        for (var i = 0; i < 30; i++) SeedOne();

        var result = await _sut.SearchTransactionsAsync(
            new SearchTransactionsArgs { PageSize = 999 }, ct);

        result.GetProperty("pageSize").GetInt32().Should().Be(20);
        result.GetProperty("data").GetArrayLength().Should().Be(20);
        result.GetProperty("total").GetInt32().Should().Be(30);
    }

    [Fact]
    public async Task SearchTransactions_InvalidDateRange_ReturnsErrorElement()
    {
        var ct = TestContext.Current.CancellationToken;
        var result = await _sut.SearchTransactionsAsync(
            new SearchTransactionsArgs
            {
                FromDate = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            }, ct);

        result.TryGetProperty("error", out var err).Should().BeTrue();
        err.GetString().Should().Contain("fromDate");
    }

    [Fact]
    public async Task GetTransaction_ExistingId_ReturnsDetail()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = SeedOne();

        var result = await _sut.GetTransactionAsync(new GetTransactionArgs(id), ct);

        result.GetProperty("id").GetInt32().Should().Be(id);
        result.GetProperty("notes").GetString().Should().Be("Test note");
        result.TryGetProperty("error", out _).Should().BeFalse();
    }

    [Fact]
    public async Task GetTransaction_MissingId_ReturnsErrorElement()
    {
        var ct = TestContext.Current.CancellationToken;
        var result = await _sut.GetTransactionAsync(new GetTransactionArgs(999999), ct);

        result.TryGetProperty("error", out var err).Should().BeTrue();
        err.GetString().Should().Contain("999999");
    }
}
