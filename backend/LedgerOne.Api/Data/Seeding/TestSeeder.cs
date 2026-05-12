using LedgerOne.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Data.Seeding;

public static class TestSeeder
{
    public static async Task ResetAndSeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Transactions", ct);
        var rows = BuildFixture().ToList();
        db.Transactions.AddRange(rows);
        await db.SaveChangesAsync(ct);
    }

    public static async Task ClearAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Transactions", ct);
    }

    private static IEnumerable<Transaction> BuildFixture()
    {
        var baseDate = new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc);
        var accounts = new[]
        {
            "ACCT-00001", "ACCT-00002", "ACCT-00003", "ACCT-00004", "ACCT-00005",
            "ACCT-00006", "ACCT-00007", "ACCT-00008",
        };
        var advisors = new[] { "Sarah Chen", "Marcus Lee", "Priya Patel", "James OHara", "Anika Singh" };
        var symbols = new[] { "AAPL", "MSFT", "TSLA", "GOOGL", "RY.TO", "TD.TO" };

        var types = new[]
        {
            TransactionType.Buy, TransactionType.Sell, TransactionType.Dividend,
            TransactionType.Fee, TransactionType.Transfer,
        };
        var statuses = new[]
        {
            TransactionStatus.Settled, TransactionStatus.Pending, TransactionStatus.Cancelled,
        };

        // 60 deterministic rows
        for (var i = 0; i < 60; i++)
        {
            var type = types[i % types.Length];
            var hasSymbol = type is not (TransactionType.Fee or TransactionType.Transfer);
            yield return new Transaction
            {
                TransactionDate = baseDate.AddDays(-i),
                AccountId = accounts[i % accounts.Length],
                AdvisorName = advisors[i % advisors.Length],
                Type = type,
                SecuritySymbol = hasSymbol ? symbols[i % symbols.Length] : null,
                Amount = 100m + i * 137.5m,
                Currency = i % 3 == 0 ? Currency.USD : Currency.CAD,
                Status = statuses[i % statuses.Length],
                Notes = i % 4 == 0 ? $"Fixture note {i}" : null,
                CreatedAt = baseDate.AddDays(-i),
            };
        }
    }
}
