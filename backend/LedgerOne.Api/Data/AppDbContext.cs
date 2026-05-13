using LedgerOne.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var tx = modelBuilder.Entity<Transaction>();
        tx.Property(t => t.Amount).HasPrecision(18, 2);
        tx.Property(t => t.AccountId).IsRequired().HasMaxLength(32);
        tx.Property(t => t.AdvisorName).IsRequired().HasMaxLength(128);
        tx.Property(t => t.SecuritySymbol).HasMaxLength(16);
        tx.Property(t => t.Notes).HasMaxLength(2000);

        tx.HasIndex(t => new { t.Status, t.TransactionDate })
            .HasDatabaseName("IX_Transactions_Status_TransactionDate")
            .IsDescending(false, true);
        tx.HasIndex(t => t.AccountId)
            .HasDatabaseName("IX_Transactions_AccountId");
    }
}
