using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LedgerOne.Api.Tests.Integration;

public class DbContextPersistenceTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task CanSaveAndRetrieveTransaction()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tx = new Transaction
        {
            TransactionDate = new DateTime(2026, 4, 15, 10, 23, 0, DateTimeKind.Utc),
            AccountId = "ACCT-00001",
            AdvisorName = "Sarah Chen",
            Type = TransactionType.Buy,
            SecuritySymbol = "AAPL",
            Amount = 12500.00m,
            Currency = Currency.CAD,
            Status = TransactionStatus.Settled,
            Notes = "Test notes",
            CreatedAt = DateTime.UtcNow,
        };
        db.Transactions.Add(tx);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var fetched = await db.Transactions.FindAsync([tx.Id], TestContext.Current.CancellationToken);
        fetched.Should().NotBeNull();
        fetched!.AccountId.Should().Be("ACCT-00001");
        fetched.Type.Should().Be(TransactionType.Buy);
        fetched.Amount.Should().Be(12500.00m);
    }

    [Fact]
    public async Task Schema_IncludesExpectedIndexes()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync(TestContext.Current.CancellationToken);
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Transactions'";
        var indexNames = new List<string>();
        using var reader = await cmd.ExecuteReaderAsync(TestContext.Current.CancellationToken);
        while (await reader.ReadAsync(TestContext.Current.CancellationToken)) indexNames.Add(reader.GetString(0));

        indexNames.Should().Contain("IX_Transactions_Status_TransactionDate");
        indexNames.Should().Contain("IX_Transactions_AccountId");
    }
}
