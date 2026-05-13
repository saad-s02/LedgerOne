using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Tests.Integration;

public class DevSeederTests
{
    [Fact]
    public async Task SeedAsync_PopulatesEightThousandRows()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync(ct);
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options;
        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync(ct);

        await DevSeeder.SeedAsync(db, ct);

        (await db.Transactions.CountAsync(ct)).Should().Be(8000);
    }

    [Fact]
    public async Task SeedAsync_IsDeterministic()
    {
        var ct = TestContext.Current.CancellationToken;
        await using var c1 = new SqliteConnection("Data Source=:memory:");
        await c1.OpenAsync(ct);
        await using var db1 = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(c1).Options);
        await db1.Database.EnsureCreatedAsync(ct);
        await DevSeeder.SeedAsync(db1, ct);
        var first = await db1.Transactions.OrderBy(t => t.Id).Take(5).Select(t => t.AccountId).ToListAsync(ct);

        await using var c2 = new SqliteConnection("Data Source=:memory:");
        await c2.OpenAsync(ct);
        await using var db2 = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(c2).Options);
        await db2.Database.EnsureCreatedAsync(ct);
        await DevSeeder.SeedAsync(db2, ct);
        var second = await db2.Transactions.OrderBy(t => t.Id).Take(5).Select(t => t.AccountId).ToListAsync(ct);

        first.Should().Equal(second);
    }
}
