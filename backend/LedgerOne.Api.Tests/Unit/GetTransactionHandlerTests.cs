using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using LedgerOne.Api.Features.Transactions;
using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Tests.Unit;

public class GetTransactionHandlerTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly AppDbContext _db;
    private readonly GetTransactionHandler _sut;

    public GetTransactionHandlerTests()
    {
        _conn = new SqliteConnection("Data Source=:memory:");
        _conn.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options;
        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();
        _sut = new GetTransactionHandler(_db);
    }

    public void Dispose() { _db.Dispose(); _conn.Dispose(); }

    [Fact]
    public async Task Handle_ExistingId_ReturnsDetailWithNotesAndCreatedAt()
    {
        var ct = TestContext.Current.CancellationToken;
        var entity = new Transaction
        {
            TransactionDate = new DateTime(2026, 4, 15, 10, 23, 0, DateTimeKind.Utc),
            AccountId = "ACCT-12345",
            AdvisorName = "Sarah Chen",
            Type = TransactionType.Buy,
            SecuritySymbol = "AAPL",
            Amount = 12500m,
            Currency = Currency.CAD,
            Status = TransactionStatus.Settled,
            Notes = "Detail notes",
            CreatedAt = new DateTime(2026, 4, 15, 10, 23, 5, DateTimeKind.Utc),
        };
        _db.Transactions.Add(entity);
        _db.SaveChanges();

        var dto = await _sut.Handle(entity.Id, ct);

        dto.Id.Should().Be(entity.Id);
        dto.AccountId.Should().Be("ACCT-12345");
        dto.AdvisorName.Should().Be("Sarah Chen");
        dto.Notes.Should().Be("Detail notes");
        dto.CreatedAt.Should().Be(new DateTime(2026, 4, 15, 10, 23, 5, DateTimeKind.Utc));
    }

    [Fact]
    public async Task Handle_MissingId_ThrowsNotFoundException()
    {
        var ct = TestContext.Current.CancellationToken;

        var act = () => _sut.Handle(999999, ct);

        var ex = await act.Should().ThrowAsync<NotFoundException>();
        ex.Which.Resource.Should().Be("Transaction");
        ex.Which.Key.Should().Be(999999);
    }
}
