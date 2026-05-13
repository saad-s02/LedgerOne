using Bogus;
using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Data.Seeding;

public static class DevSeeder
{
    private const int RowCount = 8000;
    private const int AdvisorCount = 50;
    private const int AccountCount = 500;
    private static readonly string[] Symbols =
    {
        "AAPL","MSFT","TSLA","GOOGL","AMZN","META","NVDA","NFLX","SHOP.TO","RY.TO",
        "TD.TO","BNS.TO","BMO.TO","CM.TO","ENB.TO","CNR.TO","CP.TO","SU.TO","CNQ.TO","T.TO",
        "BCE.TO","TRP.TO","ABX.TO","MFC.TO","SLF.TO","V","JPM","BRK.B","JNJ","WMT",
    };

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct)
    {
        Randomizer.Seed = new Random(42);
        var advisorFaker = new Faker<string>().CustomInstantiator(f => f.Name.FullName());
        var advisorNames = Enumerable.Range(0, AdvisorCount)
            .Select(_ => advisorFaker.Generate()).Distinct().Take(AdvisorCount).ToArray();

        var accounts = Enumerable.Range(1, AccountCount)
            .Select(i => $"ACCT-{i:00000}").ToArray();

        var endDate = DateTime.UtcNow;
        var startDate = endDate.AddMonths(-24);

        var faker = new Faker<Transaction>()
            .RuleFor(t => t.TransactionDate, f => f.Date.Between(startDate, endDate).ToUniversalTime())
            .RuleFor(t => t.AccountId, f => f.PickRandom(accounts))
            .RuleFor(t => t.AdvisorName, f => f.PickRandom(advisorNames))
            .RuleFor(t => t.Type, f =>
            {
                var roll = f.Random.Int(0, 99);
                return roll < 35 ? TransactionType.Buy
                     : roll < 60 ? TransactionType.Sell
                     : roll < 80 ? TransactionType.Dividend
                     : roll < 95 ? TransactionType.Fee
                     : TransactionType.Transfer;
            })
            .RuleFor(t => t.SecuritySymbol, (f, t) =>
                t.Type is TransactionType.Fee or TransactionType.Transfer ? null : f.PickRandom(Symbols))
            .RuleFor(t => t.Amount, f =>
            {
                var raw = (decimal)Math.Round(Math.Exp(f.Random.Double(3, 12)), 2);
                return Math.Clamp(raw, 50m, 250000m);
            })
            .RuleFor(t => t.Currency, f => f.Random.Bool(0.7f) ? Currency.CAD : Currency.USD)
            .RuleFor(t => t.Status, f =>
            {
                var roll = f.Random.Int(0, 99);
                return roll < 80 ? TransactionStatus.Settled
                     : roll < 95 ? TransactionStatus.Pending
                     : TransactionStatus.Cancelled;
            })
            .RuleFor(t => t.Notes, f => f.Random.Bool(0.3f) ? f.Lorem.Sentence() : null)
            .RuleFor(t => t.CreatedAt, (f, t) => t.TransactionDate);

        var rows = faker.Generate(RowCount);
        db.Transactions.AddRange(rows);
        await db.SaveChangesAsync(ct);
    }
}
