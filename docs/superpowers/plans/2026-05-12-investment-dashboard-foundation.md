# Investment Dashboard — Sub-project 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up both runtimes, the data layer, and one paginated end-to-end vertical slice (`GET /api/transactions` + a React table at `/`) so every integration point is proven before sub-project 2 layers features on top.

**Architecture:** Monorepo with `backend/` (.NET 10, controllers + handler classes, EF Core + SQLite, real migrations) and `frontend/` (Vite + React 19 + TypeScript + Tailwind v4 + TanStack Router + TanStack Query). The thin `TransactionsController` delegates to `ListTransactionsHandler`, which owns query + validation + DTO projection; this same handler is reusable by sub-project 3's agent tools without HTTP. Full TDD discipline overrides the PRD's "minimal tests" non-goal: every behavior gets a failing test first (xUnit for backend, Playwright for frontend e2e).

**Tech Stack:** .NET 10, ASP.NET Core, EF Core 10, SQLite, Serilog, xUnit v3, FluentAssertions, Verify; React 19, TypeScript, Vite, Tailwind v4, TanStack Router, TanStack Query, Playwright (Chromium); Bogus for dev seed.

**Reference spec:** `docs/superpowers/specs/2026-05-12-investment-dashboard-foundation-design.md`

---

## File Structure

This is the target layout — every task maps to one or more files in this tree.

```
LedgerOne/
├── PRD.md
├── docs/superpowers/specs/2026-05-12-investment-dashboard-foundation-design.md
├── docs/superpowers/plans/2026-05-12-investment-dashboard-foundation.md
├── Makefile
├── .gitignore
├── global.json
├── backend/
│   ├── LedgerOne.slnx
│   ├── Directory.Build.props
│   ├── Directory.Packages.props
│   ├── LedgerOne.Api/
│   │   ├── LedgerOne.Api.csproj
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── appsettings.Testing.json
│   │   ├── Controllers/
│   │   │   ├── TransactionsController.cs
│   │   │   ├── HealthController.cs
│   │   │   └── TestController.cs
│   │   ├── Features/Transactions/
│   │   │   ├── ListTransactionsHandler.cs
│   │   │   ├── ListTransactionsRequest.cs
│   │   │   ├── ListTransactionsResponse.cs
│   │   │   └── TransactionDto.cs
│   │   ├── Domain/
│   │   │   ├── Transaction.cs
│   │   │   ├── TransactionType.cs
│   │   │   ├── TransactionStatus.cs
│   │   │   └── Currency.cs
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Migrations/                  (generated)
│   │   │   └── Seeding/
│   │   │       ├── DevSeeder.cs
│   │   │       └── TestSeeder.cs
│   │   └── Infrastructure/
│   │       ├── Validation/
│   │       │   └── ValidationException.cs
│   │       ├── ProblemDetails/
│   │       │   └── GlobalExceptionHandler.cs
│   │       └── Logging/
│   │           └── CorrelationIdMiddleware.cs
│   └── LedgerOne.Api.Tests/
│       ├── LedgerOne.Api.Tests.csproj
│       ├── Unit/
│       │   └── ListTransactionsHandlerTests.cs
│       ├── Integration/
│       │   ├── ApiFactory.cs
│       │   ├── HealthEndpointTests.cs
│       │   ├── TestEndpointTests.cs
│       │   ├── TransactionsEndpointTests.cs
│       │   └── ProblemDetailsTests.cs
│       └── Snapshots/                       (generated)
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── playwright.config.ts
    ├── eslint.config.js
    ├── prettier.config.cjs
    ├── index.html
    ├── .env.development
    ├── src/
    │   ├── main.tsx
    │   ├── styles.css
    │   ├── routes/
    │   │   ├── __root.tsx
    │   │   └── index.tsx
    │   ├── api/
    │   │   ├── client.ts
    │   │   └── transactions.ts
    │   └── lib/
    │       └── queryClient.ts
    └── e2e/
        ├── list.spec.ts
        └── helpers/
            └── api.ts
```

---

## Task 1: Pre-flight — install .NET 10 SDK

**Files:**
- Create: `global.json`

- [ ] **Step 1: Check whether dotnet is already installed**

Run: `dotnet --version 2>/dev/null || echo "NOT INSTALLED"`

Expected: either a version like `10.0.x` (skip rest of task) or `NOT INSTALLED` (continue).

- [ ] **Step 2: Install .NET 10 SDK via official installer (if not installed)**

Run:

```bash
curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
bash /tmp/dotnet-install.sh --channel 10.0 --install-dir /opt/dotnet
sudo ln -sf /opt/dotnet/dotnet /usr/local/bin/dotnet 2>/dev/null || ln -sf /opt/dotnet/dotnet ~/.local/bin/dotnet
export PATH="/opt/dotnet:$PATH"
echo 'export PATH="/opt/dotnet:$PATH"' >> ~/.bashrc
```

Expected: `dotnet --version` prints `10.0.x`.

- [ ] **Step 3: Pin SDK with global.json at repo root**

Create `global.json`:

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestFeature"
  }
}
```

Replace `10.0.100` with the exact output of `dotnet --version`.

- [ ] **Step 4: Commit**

```bash
git add global.json
git commit -m "Pin .NET 10 SDK via global.json"
```

---

## Task 2: Repo scaffolding — Makefile, .gitignore, dirs

**Files:**
- Create: `.gitignore`
- Create: `Makefile`
- Create: `backend/` directory
- Create: `frontend/` directory

- [ ] **Step 1: Write `.gitignore`**

```
# .NET
bin/
obj/
*.user
*.suo
*.pdb

# EF Core / SQLite
*.db
*.db-shm
*.db-wal

# Node / Vite
node_modules/
dist/
.vite/

# Playwright
.playwright/
playwright-report/
test-results/

# Editor
.vs/
.vscode/
.idea/
.DS_Store

# Env
.env
.env.local
.env.*.local

# Verify
*.received.txt
```

- [ ] **Step 2: Write the Makefile**

```makefile
.PHONY: dev test check check-backend check-frontend backend-dev frontend-dev clean

dev:
	@echo "Starting backend and frontend (Ctrl+C exits both)..."
	@(trap 'kill 0' SIGINT; \
	  (cd backend && dotnet run --project LedgerOne.Api) & \
	  (cd frontend && npm run dev) & \
	  wait)

backend-dev:
	cd backend && dotnet run --project LedgerOne.Api

frontend-dev:
	cd frontend && npm run dev

test: check-backend check-frontend

check-backend:
	cd backend && dotnet test

check-frontend:
	cd frontend && npx playwright test

check:
	cd backend && dotnet format --verify-no-changes
	cd frontend && npx eslint . && npx prettier --check . && npx tsc --noEmit
	$(MAKE) test

clean:
	cd backend && dotnet clean
	rm -rf backend/**/bin backend/**/obj
	rm -rf frontend/node_modules frontend/dist
```

- [ ] **Step 3: Create directories**

```bash
mkdir -p backend frontend
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore Makefile
git commit -m "Add Makefile and .gitignore for monorepo"
```

---

## Task 3: Backend solution + Directory.* files

**Files:**
- Create: `backend/LedgerOne.slnx`
- Create: `backend/Directory.Build.props`
- Create: `backend/Directory.Packages.props`
- Create: `backend/LedgerOne.Api/` (via `dotnet new`)
- Create: `backend/LedgerOne.Api.Tests/` (via `dotnet new`)

- [ ] **Step 1: Create the .slnx solution and projects**

```bash
cd backend
dotnet new sln -n LedgerOne --format slnx
dotnet new webapi -n LedgerOne.Api --use-controllers --use-minimal-apis false -o LedgerOne.Api
dotnet new xunit3 -n LedgerOne.Api.Tests -o LedgerOne.Api.Tests
dotnet sln add LedgerOne.Api/LedgerOne.Api.csproj LedgerOne.Api.Tests/LedgerOne.Api.Tests.csproj
dotnet add LedgerOne.Api.Tests/LedgerOne.Api.Tests.csproj reference LedgerOne.Api/LedgerOne.Api.csproj
cd ..
```

If `dotnet new webapi` doesn't accept `--use-minimal-apis false`, use `dotnet new webapi --controllers -n LedgerOne.Api -o LedgerOne.Api` (.NET 10 SDK uses the `--controllers` short form).

- [ ] **Step 2: Write `backend/Directory.Build.props`**

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>
```

- [ ] **Step 3: Write `backend/Directory.Packages.props` (enables CPM)**

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <!-- Versions populated by `dotnet add package` in later tasks -->
  </ItemGroup>
</Project>
```

- [ ] **Step 4: Remove default template noise**

Delete the auto-generated `WeatherForecast.cs` and `Controllers/WeatherForecastController.cs` from `LedgerOne.Api`:

```bash
rm -f backend/LedgerOne.Api/WeatherForecast.cs backend/LedgerOne.Api/Controllers/WeatherForecastController.cs
```

Delete the auto-generated `UnitTest1.cs` from the test project:

```bash
rm -f backend/LedgerOne.Api.Tests/UnitTest1.cs
```

- [ ] **Step 5: Verify build**

Run: `cd backend && dotnet build`
Expected: build succeeds, 0 warnings, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "Scaffold backend solution (.slnx) with Api and Tests projects"
```

---

## Task 4: Backend test infrastructure (xUnit packages + ApiFactory base)

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/LedgerOne.Api.Tests.csproj` (via dotnet add)
- Create: `backend/LedgerOne.Api.Tests/Integration/ApiFactory.cs`

- [ ] **Step 1: Add test packages via `dotnet add`**

```bash
cd backend
dotnet add LedgerOne.Api.Tests package Microsoft.AspNetCore.Mvc.Testing
dotnet add LedgerOne.Api.Tests package FluentAssertions
dotnet add LedgerOne.Api.Tests package Verify.Xunit
dotnet add LedgerOne.Api.Tests package Microsoft.Data.Sqlite
cd ..
```

- [ ] **Step 2: Create `ApiFactory.cs`**

Path: `backend/LedgerOne.Api.Tests/Integration/ApiFactory.cs`

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace LedgerOne.Api.Tests.Integration;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public string DbPath { get; } =
        Path.Combine(Path.GetTempPath(), $"ledgerone_test_{Guid.NewGuid():N}.db");

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        return base.CreateHost(builder);
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (File.Exists(DbPath)) File.Delete(DbPath);
    }
}
```

(`Program` will become accessible to tests after we make `Program` partial in Task 5.)

- [ ] **Step 3: Verify build**

Run: `cd backend && dotnet build`
Expected: build succeeds. (Tests may not yet reference `Program`; ignore the type warning by adding a placeholder later — for now, the test project should build because `ApiFactory` references `Program` which the SDK generates from `Program.cs`.)

If build fails because `Program` is internal and not visible to the test project, leave the error; Task 5 makes it visible.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "Add xUnit + WebApplicationFactory + Verify test packages and ApiFactory base"
```

---

## Task 5: TDD — `GET /health` endpoint

**Files:**
- Create: `backend/LedgerOne.Api.Tests/Integration/HealthEndpointTests.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Create: `backend/LedgerOne.Api/Controllers/HealthController.cs`

- [ ] **Step 1: Write the failing test**

Path: `backend/LedgerOne.Api.Tests/Integration/HealthEndpointTests.cs`

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LedgerOne.Api.Tests.Integration;

public class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task Get_Health_Returns200WithHealthyStatus()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        body.Should().ContainKey("status").WhoseValue.Should().Be("Healthy");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~HealthEndpointTests"`
Expected: FAIL with 404 Not Found (or `Program` not accessible).

- [ ] **Step 3: Make `Program` accessible + implement the endpoint**

Replace contents of `backend/LedgerOne.Api/Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();

public partial class Program;
```

Create `backend/LedgerOne.Api/Controllers/HealthController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "Healthy" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~HealthEndpointTests"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "Add GET /health endpoint with integration test"
```

---

## Task 6: Domain — Transaction entity + enums

**Files:**
- Create: `backend/LedgerOne.Api/Domain/TransactionType.cs`
- Create: `backend/LedgerOne.Api/Domain/TransactionStatus.cs`
- Create: `backend/LedgerOne.Api/Domain/Currency.cs`
- Create: `backend/LedgerOne.Api/Domain/Transaction.cs`

No test in this task — the entity is exercised by Task 7's DbContext test.

- [ ] **Step 1: Create the enums**

`backend/LedgerOne.Api/Domain/TransactionType.cs`:

```csharp
namespace LedgerOne.Api.Domain;

public enum TransactionType
{
    Buy,
    Sell,
    Fee,
    Transfer,
    Dividend,
}
```

`backend/LedgerOne.Api/Domain/TransactionStatus.cs`:

```csharp
namespace LedgerOne.Api.Domain;

public enum TransactionStatus
{
    Pending,
    Settled,
    Cancelled,
}
```

`backend/LedgerOne.Api/Domain/Currency.cs`:

```csharp
namespace LedgerOne.Api.Domain;

public enum Currency
{
    CAD,
    USD,
}
```

- [ ] **Step 2: Create the entity**

`backend/LedgerOne.Api/Domain/Transaction.cs`:

```csharp
namespace LedgerOne.Api.Domain;

public class Transaction
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string AccountId { get; set; } = default!;
    public string AdvisorName { get; set; } = default!;
    public TransactionType Type { get; set; }
    public string? SecuritySymbol { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public TransactionStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

- [ ] **Step 3: Verify build**

Run: `cd backend && dotnet build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/LedgerOne.Api/Domain/
git commit -m "Add Transaction entity and enums (Type, Status, Currency)"
```

---

## Task 7: TDD — AppDbContext + first migration with indexes

**Files:**
- Modify: `backend/LedgerOne.Api/LedgerOne.Api.csproj` (via `dotnet add`)
- Modify: `backend/LedgerOne.Api.Tests/LedgerOne.Api.Tests.csproj` (via `dotnet add`)
- Create: `backend/LedgerOne.Api/Data/AppDbContext.cs`
- Create: `backend/LedgerOne.Api/Data/Migrations/` (generated)
- Modify: `backend/LedgerOne.Api/Program.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/ApiFactory.cs` (run migrations)
- Create: `backend/LedgerOne.Api.Tests/Integration/DbContextPersistenceTests.cs`

- [ ] **Step 1: Add EF Core packages**

```bash
cd backend
dotnet add LedgerOne.Api package Microsoft.EntityFrameworkCore.Sqlite
dotnet add LedgerOne.Api package Microsoft.EntityFrameworkCore.Design
dotnet new tool-manifest --force
dotnet tool install dotnet-ef
cd ..
```

- [ ] **Step 2: Write the failing test**

`backend/LedgerOne.Api.Tests/Integration/DbContextPersistenceTests.cs`:

```csharp
using FluentAssertions;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
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
        await db.SaveChangesAsync();

        var fetched = await db.Transactions.FindAsync(tx.Id);
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
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Transactions'";
        var indexNames = new List<string>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) indexNames.Add(reader.GetString(0));

        indexNames.Should().Contain("IX_Transactions_Status_TransactionDate");
        indexNames.Should().Contain("IX_Transactions_AccountId");
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~DbContextPersistenceTests"`
Expected: FAIL — `AppDbContext` not found, or DI lookup fails.

- [ ] **Step 4: Create AppDbContext**

`backend/LedgerOne.Api/Data/AppDbContext.cs`:

```csharp
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

        tx.HasIndex(t => new { t.Status, t.TransactionDate })
            .HasDatabaseName("IX_Transactions_Status_TransactionDate")
            .IsDescending(false, true);
        tx.HasIndex(t => t.AccountId)
            .HasDatabaseName("IX_Transactions_AccountId");
    }
}
```

- [ ] **Step 5: Wire DbContext into Program.cs**

Replace `backend/LedgerOne.Api/Program.cs`:

```csharp
using LedgerOne.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(opts =>
{
    var cs = builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=ledgerone.db";
    opts.UseSqlite(cs);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.MapControllers();
app.Run();

public partial class Program;
```

- [ ] **Step 6: Set default connection string**

Edit `backend/LedgerOne.Api/appsettings.json` to:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "Default": "Data Source=ledgerone.db"
  }
}
```

- [ ] **Step 7: Generate the initial migration**

```bash
cd backend
dotnet ef migrations add InitialCreate --project LedgerOne.Api --output-dir Data/Migrations
cd ..
```

Expected: creates `backend/LedgerOne.Api/Data/Migrations/<timestamp>_InitialCreate.cs` containing the `Transactions` table + both indexes.

- [ ] **Step 8: Run test to verify it passes**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~DbContextPersistenceTests"`
Expected: both tests PASS.

If failure mentions "no such table" or similar, ensure `ApiFactory` runs migrations. ApiFactory inherits from `Program`'s startup which runs `Database.Migrate()`, so this should work. If not, override `ConfigureWebHost` in ApiFactory to call `db.Database.Migrate()` after `CreateHost` completes.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "Add AppDbContext with Transaction mapping, indexes, and initial migration"
```

---

## Task 8: TDD — TestSeeder + `POST /api/test/seed` (Testing env only)

**Files:**
- Create: `backend/LedgerOne.Api/Data/Seeding/TestSeeder.cs`
- Create: `backend/LedgerOne.Api/Controllers/TestController.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Create: `backend/LedgerOne.Api.Tests/Integration/TestEndpointTests.cs`

- [ ] **Step 1: Write the failing tests**

`backend/LedgerOne.Api.Tests/Integration/TestEndpointTests.cs`:

```csharp
using System.Net;
using FluentAssertions;
using LedgerOne.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LedgerOne.Api.Tests.Integration;

public class TestEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task PostTestSeed_InTestingEnv_SeedsFixtureRows()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsync("/api/test/seed", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.Transactions.CountAsync();
        count.Should().BeGreaterThanOrEqualTo(50, "test fixture seeds at least 50 rows");
    }

    [Fact]
    public async Task PostTestSeed_IsIdempotent_RowsAfterRepeatSeedAreSameSet()
    {
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null);
        using var scope1 = _factory.Services.CreateScope();
        var db1 = scope1.ServiceProvider.GetRequiredService<AppDbContext>();
        var firstCount = await db1.Transactions.CountAsync();

        await client.PostAsync("/api/test/seed", null);
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var secondCount = await db2.Transactions.CountAsync();

        secondCount.Should().Be(firstCount, "seed truncates then re-seeds");
    }
}
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TestEndpointTests"`
Expected: FAIL with 404 (endpoint doesn't exist).

- [ ] **Step 3: Implement `TestSeeder`**

`backend/LedgerOne.Api/Data/Seeding/TestSeeder.cs`:

```csharp
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
```

- [ ] **Step 4: Implement `TestController`**

`backend/LedgerOne.Api/Controllers/TestController.cs`:

```csharp
using LedgerOne.Api.Data;
using LedgerOne.Api.Data.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/test")]
public class TestController(AppDbContext db) : ControllerBase
{
    [HttpPost("seed")]
    public async Task<IActionResult> Seed(CancellationToken ct)
    {
        await TestSeeder.ResetAndSeedAsync(db, ct);
        return NoContent();
    }

    [HttpPost("clear")]
    public async Task<IActionResult> Clear(CancellationToken ct)
    {
        await TestSeeder.ClearAsync(db, ct);
        return NoContent();
    }
}
```

- [ ] **Step 5: Gate the controller to Testing env only**

In `backend/LedgerOne.Api/Program.cs`, wrap controller registration so `TestController` is only available in Testing. Replace the file with:

```csharp
using LedgerOne.Api.Controllers;
using LedgerOne.Api.Data;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var mvc = builder.Services.AddControllers();
if (!builder.Environment.IsEnvironment("Testing"))
{
    mvc.ConfigureApplicationPartManager(apm =>
    {
        var asm = typeof(TestController).Assembly;
        // Remove TestController from the controller feature outside Testing.
        apm.FeatureProviders.Add(new ExcludeTestControllersFeatureProvider());
    });
}

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    var cs = builder.Configuration.GetConnectionString("Default") ?? "Data Source=ledgerone.db";
    opts.UseSqlite(cs);
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.MapControllers();
app.Run();

public partial class Program;

internal sealed class ExcludeTestControllersFeatureProvider : Microsoft.AspNetCore.Mvc.Controllers.ControllerFeatureProvider
{
    protected override bool IsController(System.Reflection.TypeInfo typeInfo)
    {
        if (typeInfo.FullName == typeof(TestController).FullName) return false;
        return base.IsController(typeInfo);
    }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TestEndpointTests"`
Expected: PASS (both tests).

- [ ] **Step 7: Add the negative test (production env should 404)**

Append to `backend/LedgerOne.Api.Tests/Integration/TestEndpointTests.cs`:

```csharp
public class TestEndpointProductionGatingTests
{
    [Fact]
    public async Task PostTestSeed_InProductionEnv_Returns404()
    {
        await using var factory = new ProductionApiFactory();
        var client = factory.CreateClient();
        var response = await client.PostAsync("/api/test/seed", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

public class ProductionApiFactory : ApiFactory
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        return base.CreateHost(builder);
    }
}
```

(Add `using Microsoft.Extensions.Hosting;` and `using Microsoft.Extensions.Configuration;` at the top of the file.)

- [ ] **Step 8: Run all TestEndpoint tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TestEndpoint"`
Expected: 3 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "Add TestSeeder and POST /api/test/seed + /api/test/clear gated to Testing env"
```

---

## Task 9: TDD — `ListTransactionsHandler` returns total count

**Files:**
- Create: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsResponse.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/TransactionDto.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Create: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Add SQLite test dep**

(Already added in Task 4.) Skip if present.

- [ ] **Step 2: Write the failing test**

`backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`:

```csharp
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
        SeedRows(73);
        var response = await _sut.Handle(new ListTransactionsRequest(), CancellationToken.None);
        response.Total.Should().Be(73);
    }
}
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests.Handle_ReturnsTotalEqualToRowCount"`
Expected: FAIL — `ListTransactionsHandler` / `ListTransactionsRequest` / `ListTransactionsResponse` do not exist.

- [ ] **Step 4: Create the request/response/DTO types**

`backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs`:

```csharp
namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}
```

`backend/LedgerOne.Api/Features/Transactions/TransactionDto.cs`:

```csharp
using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record TransactionDto(
    int Id,
    DateTime TransactionDate,
    string AccountId,
    string AdvisorName,
    TransactionType Type,
    string? SecuritySymbol,
    decimal Amount,
    Currency Currency,
    TransactionStatus Status);
```

`backend/LedgerOne.Api/Features/Transactions/ListTransactionsResponse.cs`:

```csharp
namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsResponse(
    IReadOnlyList<TransactionDto> Data,
    int Total,
    int Page,
    int PageSize,
    int TotalPages);
```

- [ ] **Step 5: Implement the minimal handler**

`backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`:

```csharp
using LedgerOne.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(AppDbContext db)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        var total = await db.Transactions.CountAsync(ct);
        return new ListTransactionsResponse(
            Data: Array.Empty<TransactionDto>(),
            Total: total,
            Page: req.Page,
            PageSize: req.PageSize,
            TotalPages: 0);
    }
}
```

- [ ] **Step 6: Run the test, verify it passes**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests.Handle_ReturnsTotalEqualToRowCount"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "Add ListTransactionsHandler returning total row count"
```

---

## Task 10: TDD — Handler returns correct page slice

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`

- [ ] **Step 1: Add the failing test**

Append to `ListTransactionsHandlerTests`:

```csharp
[Fact]
public async Task Handle_Page2WithPageSize25_ReturnsRows26Through50()
{
    SeedRows(60);
    var response = await _sut.Handle(new ListTransactionsRequest { Page = 2, PageSize = 25 }, CancellationToken.None);
    response.Data.Should().HaveCount(25);
    // Default sort is TransactionDate DESC, so newest first.
    // Row index in seed order: 0 has earliest date, 59 has latest.
    // After DESC sort, page 1 = rows 59..35, page 2 = rows 34..10.
    response.Data.First().AccountId.Should().Be("ACCT-00034");
    response.Data.Last().AccountId.Should().Be("ACCT-00010");
}
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests.Handle_Page2"`
Expected: FAIL — Data is empty.

- [ ] **Step 3: Implement skip/take + DESC sort + projection**

Replace `ListTransactionsHandler.Handle`:

```csharp
public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
{
    var total = await db.Transactions.CountAsync(ct);
    var data = await db.Transactions
        .OrderByDescending(t => t.TransactionDate)
        .ThenByDescending(t => t.Id)
        .Skip((req.Page - 1) * req.PageSize)
        .Take(req.PageSize)
        .Select(t => new TransactionDto(
            t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
            t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status))
        .ToListAsync(ct);

    var totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / req.PageSize);
    return new ListTransactionsResponse(data, total, req.Page, req.PageSize, totalPages);
}
```

(`ThenByDescending(t => t.Id)` makes sort stable when dates collide.)

- [ ] **Step 4: Run test, verify it passes**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests"`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "Handler: implement skip/take pagination with DESC sort by date"
```

---

## Task 11: TDD — Handler computes `totalPages`

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Add the failing tests (totalPages math)**

Append to `ListTransactionsHandlerTests`:

```csharp
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
    SeedRows(rowCount);
    var response = await _sut.Handle(new ListTransactionsRequest { PageSize = pageSize }, CancellationToken.None);
    response.TotalPages.Should().Be(expectedTotalPages);
}
```

- [ ] **Step 2: Run tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests.Handle_ComputesTotalPagesCorrectly"`
Expected: PASS (the ceiling formula from Task 10 already covers these cases).

If a case fails (e.g., empty-DB expected 0 but got something else), adjust the formula. The implementation from Task 10 should already be correct.

- [ ] **Step 3: Commit (test-only commit because impl already covers)**

```bash
git add backend/
git commit -m "Handler: lock totalPages math with parameterised tests"
```

---

## Task 12: TDD — Handler default values + empty DB + over-page

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Add three failing-or-passing tests**

```csharp
[Fact]
public async Task Handle_WithDefaultRequest_UsesPage1AndPageSize25()
{
    SeedRows(10);
    var response = await _sut.Handle(new ListTransactionsRequest(), CancellationToken.None);
    response.Page.Should().Be(1);
    response.PageSize.Should().Be(25);
    response.Data.Should().HaveCount(10);
}

[Fact]
public async Task Handle_WithEmptyDb_ReturnsZeroTotalAndEmptyData()
{
    var response = await _sut.Handle(new ListTransactionsRequest(), CancellationToken.None);
    response.Total.Should().Be(0);
    response.Data.Should().BeEmpty();
    response.TotalPages.Should().Be(0);
}

[Fact]
public async Task Handle_PageExceedsTotalPages_ReturnsEmptyDataButCorrectTotal()
{
    SeedRows(10);
    var response = await _sut.Handle(new ListTransactionsRequest { Page = 99, PageSize = 25 }, CancellationToken.None);
    response.Total.Should().Be(10);
    response.Data.Should().BeEmpty();
    response.Page.Should().Be(99);
}
```

- [ ] **Step 2: Run tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests"`
Expected: all three PASS (existing implementation already handles these cases).

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "Handler: lock default/empty/over-page behavior with tests"
```

---

## Task 13: TDD — Handler default sort is `TransactionDate DESC`

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Add the failing test**

```csharp
[Fact]
public async Task Handle_DefaultsToTransactionDateDescending()
{
    // Seed three rows with explicit dates
    _db.Transactions.AddRange(
        new Transaction
        {
            TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            AccountId = "OLD", AdvisorName = "x", Type = TransactionType.Buy,
            Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled,
            CreatedAt = DateTime.UtcNow,
        },
        new Transaction
        {
            TransactionDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
            AccountId = "NEW", AdvisorName = "x", Type = TransactionType.Buy,
            Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled,
            CreatedAt = DateTime.UtcNow,
        },
        new Transaction
        {
            TransactionDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            AccountId = "MID", AdvisorName = "x", Type = TransactionType.Buy,
            Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled,
            CreatedAt = DateTime.UtcNow,
        });
    _db.SaveChanges();

    var response = await _sut.Handle(new ListTransactionsRequest(), CancellationToken.None);
    response.Data.Select(d => d.AccountId).Should().ContainInOrder("NEW", "MID", "OLD");
}
```

- [ ] **Step 2: Run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Handle_DefaultsToTransactionDateDescending"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "Handler: lock default sort (TransactionDate DESC) with test"
```

---

## Task 14: TDD — Handler validates page and pageSize

**Files:**
- Create: `backend/LedgerOne.Api/Infrastructure/Validation/ValidationException.cs`
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Write failing tests**

Append to `ListTransactionsHandlerTests`:

```csharp
[Theory]
[InlineData(0)]
[InlineData(-1)]
public async Task Handle_PageBelow1_ThrowsValidationException(int badPage)
{
    var act = () => _sut.Handle(new ListTransactionsRequest { Page = badPage }, CancellationToken.None);
    var ex = await act.Should().ThrowAsync<LedgerOne.Api.Infrastructure.Validation.ValidationException>();
    ex.Which.Errors.Should().ContainKey("page");
}

[Theory]
[InlineData(0)]
[InlineData(-5)]
[InlineData(101)]
[InlineData(1000)]
public async Task Handle_PageSizeOutOfRange_ThrowsValidationException(int badSize)
{
    var act = () => _sut.Handle(new ListTransactionsRequest { PageSize = badSize }, CancellationToken.None);
    var ex = await act.Should().ThrowAsync<LedgerOne.Api.Infrastructure.Validation.ValidationException>();
    ex.Which.Errors.Should().ContainKey("pageSize");
}

[Fact]
public async Task Handle_BothPageAndPageSizeInvalid_ThrowsWithBothErrors()
{
    var act = () => _sut.Handle(new ListTransactionsRequest { Page = 0, PageSize = 0 }, CancellationToken.None);
    var ex = await act.Should().ThrowAsync<LedgerOne.Api.Infrastructure.Validation.ValidationException>();
    ex.Which.Errors.Should().ContainKey("page");
    ex.Which.Errors.Should().ContainKey("pageSize");
}
```

- [ ] **Step 2: Run, verify fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests"`
Expected: 3 new tests FAIL (no `ValidationException` thrown).

- [ ] **Step 3: Create `ValidationException`**

`backend/LedgerOne.Api/Infrastructure/Validation/ValidationException.cs`:

```csharp
namespace LedgerOne.Api.Infrastructure.Validation;

public sealed class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }
}
```

- [ ] **Step 4: Add validation to handler**

Modify `ListTransactionsHandler.Handle` to validate before querying:

```csharp
using LedgerOne.Api.Data;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(AppDbContext db)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        Validate(req);

        var total = await db.Transactions.CountAsync(ct);
        var data = await db.Transactions
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.Id)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(t => new TransactionDto(
                t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
                t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status))
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / req.PageSize);
        return new ListTransactionsResponse(data, total, req.Page, req.PageSize, totalPages);
    }

    private static void Validate(ListTransactionsRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        if (req.Page < 1) errors["page"] = new[] { "Must be greater than or equal to 1." };
        if (req.PageSize < 1 || req.PageSize > 100)
            errors["pageSize"] = new[] { "Must be between 1 and 100." };
        if (errors.Count > 0) throw new ValidationException(errors);
    }
}
```

- [ ] **Step 5: Run all unit tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ListTransactionsHandlerTests"`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "Handler: validate page/pageSize and throw ValidationException"
```

---

## Task 15: TDD — `TransactionsController` returns 200 with response envelope (Verify snapshot)

**Files:**
- Create: `backend/LedgerOne.Api/Controllers/TransactionsController.cs`
- Modify: `backend/LedgerOne.Api/Program.cs` (register handler + JSON config)
- Create: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`
- Create: `backend/LedgerOne.Api.Tests/ModuleInitializer.cs` (Verify setup)

- [ ] **Step 1: Write the failing integration test**

`backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LedgerOne.Api.Features.Transactions;

namespace LedgerOne.Api.Tests.Integration;

public class TransactionsEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Fact]
    public async Task Get_Transactions_Default_Returns200WithEnvelope()
    {
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null);

        var response = await client.GetAsync("/api/transactions");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>();
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
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null);

        var json = await client.GetStringAsync("/api/transactions");
        await Verify(json).UseDirectory("Snapshots");
    }
}
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TransactionsEndpointTests"`
Expected: FAIL with 404 (endpoint not yet defined).

- [ ] **Step 3: Implement `TransactionsController`**

`backend/LedgerOne.Api/Controllers/TransactionsController.cs`:

```csharp
using LedgerOne.Api.Features.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionsController(ListTransactionsHandler handler) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ListTransactionsResponse>> List(
        [FromQuery] ListTransactionsRequest request,
        CancellationToken ct)
    {
        var response = await handler.Handle(request, ct);
        return Ok(response);
    }
}
```

- [ ] **Step 4: Register the handler + configure JSON enum serialization**

Replace the `AddControllers` block in `backend/LedgerOne.Api/Program.cs` with:

```csharp
var mvc = builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.ListTransactionsHandler>();
```

(Keep the existing `if (!builder.Environment.IsEnvironment("Testing"))` block right after.)

- [ ] **Step 5: Configure Verify**

`backend/LedgerOne.Api.Tests/ModuleInitializer.cs`:

```csharp
using System.Runtime.CompilerServices;

namespace LedgerOne.Api.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        VerifierSettings.AddScrubber(text => text.Replace("\r\n", "\n"));
    }
}
```

Add a `using VerifyXunit;` and `using static VerifyXunit.Verifier;` to the test file, or import via `GlobalUsings.cs`:

Create `backend/LedgerOne.Api.Tests/GlobalUsings.cs`:

```csharp
global using Xunit;
global using VerifyXunit;
global using static VerifyXunit.Verifier;
```

- [ ] **Step 6: Run tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TransactionsEndpointTests"`
Expected: first test PASS; snapshot test FAILS first run (no `.verified.txt` baseline).

- [ ] **Step 7: Approve the snapshot**

The failing run will create `Get_Transactions_Default_MatchesSnapshot.received.txt` in `backend/LedgerOne.Api.Tests/Snapshots/`. Inspect it manually to confirm it matches the PRD envelope shape. Then rename it to `.verified.txt`:

```bash
cd backend/LedgerOne.Api.Tests/Snapshots
for f in *.received.txt; do mv "$f" "${f%.received.txt}.verified.txt"; done
cd ../../..
```

- [ ] **Step 8: Re-run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~TransactionsEndpointTests"`
Expected: both tests PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "Add TransactionsController + verified envelope snapshot"
```

---

## Task 16: TDD — `GlobalExceptionHandler` maps `ValidationException` → 400 Problem Details

**Files:**
- Create: `backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Create: `backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs`

- [ ] **Step 1: Write the failing tests**

`backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LedgerOne.Api.Tests.Integration;

public class ProblemDetailsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;

    [Theory]
    [InlineData("/api/transactions?page=0", "page")]
    [InlineData("/api/transactions?page=-1", "page")]
    [InlineData("/api/transactions?pageSize=0", "pageSize")]
    [InlineData("/api/transactions?pageSize=101", "pageSize")]
    public async Task InvalidQuery_Returns400ProblemDetails(string path, string expectedErrorKey)
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType
            .Should().BeOneOf("application/problem+json", "application/json");

        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        body.Should().NotBeNull();
        body!.Should().ContainKey("title");
        body.Should().ContainKey("status");
        body.Should().ContainKey("traceId");
        body.Should().ContainKey("errors");
        var errors = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string[]>>(
            body["errors"].ToString()!);
        errors.Should().ContainKey(expectedErrorKey);
    }
}
```

- [ ] **Step 2: Run, verify failure**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ProblemDetailsTests"`
Expected: FAIL — currently a `ValidationException` thrown by the handler becomes an unhandled 500.

- [ ] **Step 3: Implement `GlobalExceptionHandler`**

`backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs`:

```csharp
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LedgerOne.Api.Infrastructure.ProblemDetails;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is ValidationException ve)
        {
            var problem = new ValidationProblemDetails(
                ve.Errors.ToDictionary(kv => kv.Key, kv => kv.Value))
            {
                Type = "https://tools.ietf.org/html/rfc7807",
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status400BadRequest,
            };
            problem.Extensions["traceId"] = httpContext.TraceIdentifier;
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }

        logger.LogError(exception, "Unhandled exception (traceId: {TraceId})", httpContext.TraceIdentifier);

        var serverProblem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "https://tools.ietf.org/html/rfc7807",
            Title = "An unexpected error occurred.",
            Status = StatusCodes.Status500InternalServerError,
        };
        serverProblem.Extensions["traceId"] = httpContext.TraceIdentifier;
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(serverProblem, cancellationToken);
        return true;
    }
}
```

- [ ] **Step 4: Wire into pipeline**

Add to `backend/LedgerOne.Api/Program.cs` (after `builder.Services.AddControllers...`):

```csharp
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<LedgerOne.Api.Infrastructure.ProblemDetails.GlobalExceptionHandler>();
```

And right after `var app = builder.Build();`:

```csharp
app.UseExceptionHandler();
```

(Place before `app.MapControllers();`.)

- [ ] **Step 5: Run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~ProblemDetailsTests"`
Expected: PASS (4 cases).

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "Map ValidationException to 400 Problem Details via GlobalExceptionHandler"
```

---

## Task 17: TDD — 500 Problem Details on unhandled exception

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Integration/ApiFactory.cs` (add boom endpoint conditionally)
- Modify: `backend/LedgerOne.Api/Controllers/TestController.cs` (add `/api/test/boom`)
- Modify: `backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs`

- [ ] **Step 1: Add a fault-injection endpoint (Testing env only)**

Append to `TestController`:

```csharp
[HttpGet("boom")]
public IActionResult Boom() => throw new InvalidOperationException("boom for tests");
```

- [ ] **Step 2: Write the failing test**

Append to `ProblemDetailsTests`:

```csharp
[Fact]
public async Task UnhandledException_Returns500ProblemDetailsWithTraceId()
{
    var client = _factory.CreateClient();
    var response = await client.GetAsync("/api/test/boom");

    response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    var body = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
    body.Should().NotBeNull();
    body!.Should().ContainKey("title");
    body.Should().ContainKey("traceId");
    body["status"].ToString().Should().Be("500");
}
```

- [ ] **Step 3: Run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~UnhandledException_Returns500"`
Expected: PASS (handler in Task 16 already covers the 500 path).

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "Test: unhandled exception maps to 500 Problem Details with traceId"
```

---

## Task 18: Serilog + correlation IDs

**Files:**
- Modify: `backend/LedgerOne.Api/LedgerOne.Api.csproj` (via `dotnet add`)
- Create: `backend/LedgerOne.Api/Infrastructure/Logging/CorrelationIdMiddleware.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs`

- [ ] **Step 1: Write the failing test**

Append to `ProblemDetailsTests`:

```csharp
[Fact]
public async Task Response_IncludesXCorrelationIdHeader()
{
    var client = _factory.CreateClient();
    var response = await client.GetAsync("/health");
    response.Headers.Contains("X-Correlation-Id").Should().BeTrue();
    var value = response.Headers.GetValues("X-Correlation-Id").First();
    value.Should().NotBeNullOrWhiteSpace();
}

[Fact]
public async Task Response_EchoesIncomingXCorrelationIdHeader()
{
    var client = _factory.CreateClient();
    var req = new HttpRequestMessage(HttpMethod.Get, "/health");
    req.Headers.Add("X-Correlation-Id", "test-correlation-123");
    var response = await client.SendAsync(req);
    response.Headers.GetValues("X-Correlation-Id").Should().ContainSingle("test-correlation-123");
}
```

- [ ] **Step 2: Run, verify fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Response_IncludesXCorrelationIdHeader"`
Expected: FAIL — header is missing.

- [ ] **Step 3: Add Serilog packages**

```bash
cd backend
dotnet add LedgerOne.Api package Serilog.AspNetCore
cd ..
```

- [ ] **Step 4: Implement middleware**

`backend/LedgerOne.Api/Infrastructure/Logging/CorrelationIdMiddleware.cs`:

```csharp
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace LedgerOne.Api.Infrastructure.Logging;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string HeaderName = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existing)
            && !string.IsNullOrWhiteSpace(existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString("N");

        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }
}
```

- [ ] **Step 5: Wire Serilog + middleware**

Modify `backend/LedgerOne.Api/Program.cs`:

Add at the very top (before `var builder = ...`):

```csharp
using Serilog;
using LedgerOne.Api.Infrastructure.Logging;
```

Right after `var builder = WebApplication.CreateBuilder(args);`:

```csharp
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] [{CorrelationId}] {Message:lj}{NewLine}{Exception}"));
```

Right after `app.UseExceptionHandler();`:

```csharp
app.UseMiddleware<CorrelationIdMiddleware>();
```

- [ ] **Step 6: Run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Response_"`
Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "Add Serilog + X-Correlation-Id middleware"
```

---

## Task 19: Dev seed via Bogus (8K rows on startup if empty)

**Files:**
- Modify: `backend/LedgerOne.Api/LedgerOne.Api.csproj` (via `dotnet add`)
- Create: `backend/LedgerOne.Api/Data/Seeding/DevSeeder.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Create: `backend/LedgerOne.Api.Tests/Integration/DevSeedTests.cs`

- [ ] **Step 1: Add Bogus**

```bash
cd backend
dotnet add LedgerOne.Api package Bogus
cd ..
```

- [ ] **Step 2: Write the failing test**

`backend/LedgerOne.Api.Tests/Integration/DevSeedTests.cs`:

```csharp
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
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn).Options;
        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        await DevSeeder.SeedAsync(db, CancellationToken.None);

        (await db.Transactions.CountAsync()).Should().Be(8000);
    }

    [Fact]
    public async Task SeedAsync_IsDeterministic()
    {
        await using var c1 = new SqliteConnection("Data Source=:memory:");
        await c1.OpenAsync();
        await using var db1 = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(c1).Options);
        await db1.Database.EnsureCreatedAsync();
        await DevSeeder.SeedAsync(db1, CancellationToken.None);
        var first = await db1.Transactions.OrderBy(t => t.Id).Take(5).Select(t => t.AccountId).ToListAsync();

        await using var c2 = new SqliteConnection("Data Source=:memory:");
        await c2.OpenAsync();
        await using var db2 = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(c2).Options);
        await db2.Database.EnsureCreatedAsync();
        await DevSeeder.SeedAsync(db2, CancellationToken.None);
        var second = await db2.Transactions.OrderBy(t => t.Id).Take(5).Select(t => t.AccountId).ToListAsync();

        first.Should().Equal(second);
    }
}
```

- [ ] **Step 3: Run, verify fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~DevSeederTests"`
Expected: FAIL — `DevSeeder` does not exist.

- [ ] **Step 4: Implement `DevSeeder`**

`backend/LedgerOne.Api/Data/Seeding/DevSeeder.cs`:

```csharp
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

        var typeWeights = new (TransactionType Type, int Pct)[]
        {
            (TransactionType.Buy, 35),
            (TransactionType.Sell, 25),
            (TransactionType.Dividend, 20),
            (TransactionType.Fee, 15),
            (TransactionType.Transfer, 5),
        };
        var statusWeights = new (TransactionStatus Status, int Pct)[]
        {
            (TransactionStatus.Settled, 80),
            (TransactionStatus.Pending, 15),
            (TransactionStatus.Cancelled, 5),
        };

        var faker = new Faker<Transaction>()
            .RuleFor(t => t.TransactionDate, f => f.Date.Between(startDate, endDate).ToUniversalTime())
            .RuleFor(t => t.AccountId, f => f.PickRandom(accounts))
            .RuleFor(t => t.AdvisorName, f => f.PickRandom(advisorNames))
            .RuleFor(t => t.Type, f => f.PickRandomWeighted(typeWeights, w => w.Pct).Type)
            .RuleFor(t => t.SecuritySymbol, (f, t) =>
                t.Type is TransactionType.Fee or TransactionType.Transfer ? null : f.PickRandom(Symbols))
            .RuleFor(t => t.Amount, f =>
            {
                var raw = (decimal)Math.Round(Math.Exp(f.Random.Double(3, 12)), 2);
                return Math.Clamp(raw, 50m, 250000m);
            })
            .RuleFor(t => t.Currency, f => f.Random.Bool(0.7f) ? Currency.CAD : Currency.USD)
            .RuleFor(t => t.Status, f => f.PickRandomWeighted(statusWeights, w => w.Pct).Status)
            .RuleFor(t => t.Notes, f => f.Random.Bool(0.3f) ? f.Lorem.Sentence() : null)
            .RuleFor(t => t.CreatedAt, (f, t) => t.TransactionDate);

        var rows = faker.Generate(RowCount);
        db.Transactions.AddRange(rows);
        await db.SaveChangesAsync(ct);
    }
}
```

`Faker<T>.PickRandomWeighted` is provided by Bogus. If the version installed does not have it, replace with:

```csharp
.RuleFor(t => t.Type, f =>
{
    var roll = f.Random.Int(0, 99);
    return roll < 35 ? TransactionType.Buy
         : roll < 60 ? TransactionType.Sell
         : roll < 80 ? TransactionType.Dividend
         : roll < 95 ? TransactionType.Fee
         : TransactionType.Transfer;
})
```

…and similarly for `Status`.

- [ ] **Step 5: Auto-run DevSeeder on startup if empty (Development only)**

Replace the migration block in `Program.cs` with:

```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsDevelopment() && !await db.Transactions.AnyAsync())
    {
        await DevSeeder.SeedAsync(db, CancellationToken.None);
    }
}
```

(Add `using LedgerOne.Api.Data.Seeding;` and `using Microsoft.EntityFrameworkCore;` if missing.)

- [ ] **Step 6: Run tests**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~DevSeederTests"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "Add deterministic DevSeeder for 8K Bogus rows (Development startup)"
```

---

## Task 20: CORS configuration for Development

**Files:**
- Modify: `backend/LedgerOne.Api/Program.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs` (or a dedicated `CorsTests.cs`)

- [ ] **Step 1: Write the failing test (in a Dev-environment factory)**

Create `backend/LedgerOne.Api.Tests/Integration/CorsTests.cs`:

```csharp
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace LedgerOne.Api.Tests.Integration;

public class CorsTests
{
    [Fact]
    public async Task DevEnvironment_PreflightFromLocalhost5173_IsAllowed()
    {
        await using var factory = new DevApiFactory();
        var client = factory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Options, "/api/transactions");
        req.Headers.Add("Origin", "http://localhost:5173");
        req.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(req);
        response.Headers.GetValues("Access-Control-Allow-Origin")
            .Should().ContainSingle("http://localhost:5173");
    }
}

public class DevApiFactory : ApiFactory
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, conf) =>
        {
            conf.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={DbPath}"
            });
        });
        return base.CreateHost(builder);
    }
}
```

- [ ] **Step 2: Run, verify fail**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~CorsTests"`
Expected: FAIL — CORS header missing.

- [ ] **Step 3: Configure CORS for Development**

In `Program.cs`, after `builder.Services.AddProblemDetails();`:

```csharp
const string DevCorsPolicy = "DevCorsPolicy";
builder.Services.AddCors(opts =>
{
    opts.AddPolicy(DevCorsPolicy, p => p
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});
```

After `var app = builder.Build();`:

```csharp
if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}
```

(Place before `app.UseExceptionHandler();`.)

- [ ] **Step 4: Run, verify pass**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~CorsTests"`
Expected: PASS.

- [ ] **Step 5: Run all backend tests**

Run: `cd backend && dotnet test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "Add CORS policy allowing localhost:5173 in Development"
```

---

## Task 21: Frontend scaffold (Vite + React + TS + Tailwind v4)

**Files:**
- Create: `frontend/package.json`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/src/main.tsx`, `frontend/src/styles.css`, `frontend/eslint.config.js`, `frontend/prettier.config.cjs`, `frontend/.env.development`

No tests yet — this task only scaffolds. Tests start in Task 23.

- [ ] **Step 1: Scaffold Vite app**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
# If the CLI prompts ("Current directory not empty. Continue?"), answer yes.
npm install
```

- [ ] **Step 2: Install Tailwind v4**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Replace `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
```

Replace `frontend/src/index.css` (or whatever default CSS file Vite generated; rename to `styles.css`):

```css
@import "tailwindcss";
```

Update `frontend/src/main.tsx` import to `./styles.css`. Delete `frontend/src/App.css` if Vite generated it.

- [ ] **Step 3: Install routing + query libs**

```bash
npm install @tanstack/react-router @tanstack/react-query zod
npm install -D @tanstack/router-plugin
```

Update `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: { port: 5173 },
});
```

- [ ] **Step 4: Set up TanStack Router root + index route**

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/queryClient';
import './styles.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router; }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
```

Create `frontend/src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
```

Create `frontend/src/routes/__root.tsx`:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">LedgerOne</h1>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  ),
});
```

Create `frontend/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <div>Hello LedgerOne</div>,
});
```

- [ ] **Step 5: Add env file + ESLint + Prettier**

`frontend/.env.development`:

```
VITE_API_BASE_URL=http://localhost:5000
```

Install ESLint + Prettier (Vite scaffold usually adds ESLint):

```bash
npm install -D prettier eslint-config-prettier
```

`frontend/prettier.config.cjs`:

```js
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100,
};
```

Ensure `frontend/eslint.config.js` ends with `prettier` config last. If not present, replace with:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'src/routeTree.gen.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  { plugins: { 'react-hooks': reactHooks }, rules: reactHooks.configs.recommended.rules },
  prettier,
);
```

Install any missing plugins as flagged.

- [ ] **Step 6: Verify dev server starts**

Run: `cd frontend && npm run build && npm run dev &`
Open `http://localhost:5173` — should show "Hello LedgerOne" with the header. Kill the dev server (`kill %1`).

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "Scaffold frontend: Vite + React + TS + Tailwind v4 + TanStack Router/Query"
```

---

## Task 22: Playwright config + first failing e2e + impl: list loads

**Files:**
- Modify: `frontend/package.json` (via `npm install`)
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/list.spec.ts`
- Create: `frontend/e2e/helpers/api.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/transactions.ts`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Install Playwright in the project**

```bash
cd frontend
npm install -D @playwright/test
```

(Playwright global CLI is already installed; this adds the test runner as a dev dep.)

- [ ] **Step 2: Configure Playwright**

`frontend/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://localhost:5000';
const webUrl = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'cd ../backend && ASPNETCORE_ENVIRONMENT=Testing ASPNETCORE_URLS=http://localhost:5000 dotnet run --project LedgerOne.Api --no-launch-profile',
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 5173',
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
```

- [ ] **Step 3: Add test helper**

`frontend/e2e/helpers/api.ts`:

```ts
export const API_BASE = 'http://localhost:5000';

export async function seedFixture(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/seed`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to seed: ${res.status}`);
}

export async function clearFixture(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/clear`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to clear: ${res.status}`);
}
```

- [ ] **Step 4: Write the failing test**

`frontend/e2e/list.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.beforeEach(async () => {
  await seedFixture();
});

test('list page loads and shows table with rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'LedgerOne' })).toBeVisible();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(7);
  await expect(table.locator('tbody tr')).toHaveCount(25);
});
```

- [ ] **Step 5: Run, verify fail**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: FAIL — table not rendered.

- [ ] **Step 6: Implement API client**

`frontend/src/api/client.ts`:

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { signal });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API error ${status}`);
  }
}
```

`frontend/src/api/transactions.ts`:

```ts
import { apiGet } from './client';

export interface TransactionDto {
  id: number;
  transactionDate: string;
  accountId: string;
  advisorName: string;
  type: 'Buy' | 'Sell' | 'Fee' | 'Transfer' | 'Dividend';
  securitySymbol: string | null;
  amount: number;
  currency: 'CAD' | 'USD';
  status: 'Pending' | 'Settled' | 'Cancelled';
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function transactionsKey(params: { page: number; pageSize: number }) {
  return ['transactions', params] as const;
}

export function fetchTransactions(
  params: { page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<ListTransactionsResponse> {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  return apiGet<ListTransactionsResponse>(`/api/transactions?${qs}`, signal);
}
```

- [ ] **Step 7: Implement list page**

Replace `frontend/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchTransactions, transactionsKey } from '../api/transactions';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute('/')({
  validateSearch: searchSchema.parse,
  component: ListPage,
});

const PAGE_SIZE = 25;

function ListPage() {
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: transactionsKey({ page, pageSize: PAGE_SIZE }),
    queryFn: ({ signal }) => fetchTransactions({ page, pageSize: PAGE_SIZE }, signal),
  });

  if (isPending) return <div className="text-gray-600">Loading…</div>;
  if (isError) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
        <div className="mb-2 font-medium">Couldn't load transactions</div>
        <button
          className="rounded bg-red-600 px-3 py-1 text-white"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }
  if (data.total === 0) return <div className="text-gray-600">No transactions</div>;

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Advisor</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((t) => (
            <tr key={t.id} className="border-b border-gray-100">
              <td className="px-3 py-2">{t.transactionDate.slice(0, 10)}</td>
              <td className="px-3 py-2">{t.accountId}</td>
              <td className="px-3 py-2">{t.advisorName}</td>
              <td className="px-3 py-2">{t.type}</td>
              <td className="px-3 py-2">{t.securitySymbol ?? '—'}</td>
              <td className="px-3 py-2">
                {t.amount.toFixed(2)} {t.currency}
              </td>
              <td className="px-3 py-2">{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-3">
        <button
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
          disabled={data.page <= 1}
          onClick={() => navigate({ search: (prev) => ({ ...prev, page: data.page - 1 }) })}
        >
          Prev
        </button>
        <span className="text-gray-700">
          Page {data.page} of {data.totalPages}
        </span>
        <button
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
          disabled={data.page >= data.totalPages}
          onClick={() => navigate({ search: (prev) => ({ ...prev, page: data.page + 1 }) })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS. (Playwright will start both servers automatically.)

If it fails because the backend doesn't pick up the in-memory test DB on first run: ensure the test seed endpoint creates rows in the `ledgerone.db` file that the `dotnet run --project LedgerOne.Api` instance uses. Add an explicit `appsettings.Testing.json` step (Task next).

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "Playwright config + first e2e: list page loads with 25 rows"
```

---

## Task 23: Configure Testing connection string for Playwright server

**Files:**
- Create: `backend/LedgerOne.Api/appsettings.Testing.json`
- Modify: `backend/LedgerOne.Api/Program.cs` (truncate-on-start in Testing)

Background: when `playwright.config.ts` runs `dotnet run` with `ASPNETCORE_ENVIRONMENT=Testing`, the API uses a real SQLite file. We want this file to be ephemeral and the table to start empty (Playwright seeds it via `/api/test/seed` before each test).

- [ ] **Step 1: Add `appsettings.Testing.json`**

```json
{
  "ConnectionStrings": {
    "Default": "Data Source=ledgerone.testing.db"
  },
  "Serilog": {
    "MinimumLevel": "Warning"
  }
}
```

- [ ] **Step 2: On Testing env startup, ensure table is empty**

In `Program.cs`, replace the migration block with:

```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsEnvironment("Testing"))
    {
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Transactions");
    }
    else if (app.Environment.IsDevelopment() && !await db.Transactions.AnyAsync())
    {
        await DevSeeder.SeedAsync(db, CancellationToken.None);
    }
}
```

- [ ] **Step 3: Add `ledgerone.testing.db*` to .gitignore**

Already covered by `*.db` in Task 2.

- [ ] **Step 4: Re-run Playwright**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "Add appsettings.Testing.json and clear-on-startup for Testing env"
```

---

## Task 24: TDD — e2e: Next button advances URL and rows

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Add the failing test**

Append to `list.spec.ts`:

```ts
test('Next button advances to page 2 and updates URL', async ({ page }) => {
  await page.goto('/');
  const firstRowAccount = await page.locator('tbody tr').first().locator('td').nth(1).textContent();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/[?&]page=2(&|$)/);

  const newFirstRowAccount = await page.locator('tbody tr').first().locator('td').nth(1).textContent();
  expect(newFirstRowAccount).not.toBe(firstRowAccount);
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
});

test('Prev button returns to page 1', async ({ page }) => {
  await page.goto('/?page=2');
  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page).toHaveURL(/^[^?]*\/?$|[?&]page=1(&|$)/);
  await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
});
```

- [ ] **Step 2: Run, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS (the implementation already handles this).

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "e2e: Next/Prev pagination advances URL and rows"
```

---

## Task 25: TDD — e2e: Prev disabled on page 1, Next disabled on last page

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
test('Prev button is disabled on page 1', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();
});

test('Next button is disabled on last page', async ({ page }) => {
  // 60 fixture rows / 25 page size = 3 pages
  await page.goto('/?page=3');
  await expect(page.getByText('Page 3 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});
```

- [ ] **Step 2: Run, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "e2e: Prev/Next disabled states on page boundaries"
```

---

## Task 26: TDD — e2e: loading state

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Add failing test**

```ts
test('shows loading state before rows appear', async ({ page }) => {
  await page.route('**/api/transactions**', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  const navigation = page.goto('/');
  await expect(page.getByText('Loading…')).toBeVisible();
  await navigation;
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
```

- [ ] **Step 2: Run, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "e2e: loading indicator before data arrives"
```

---

## Task 27: TDD — e2e: error state with Retry

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Add failing test**

```ts
test('shows error banner with Retry on 500, retry recovers', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/transactions**', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({ status: 500, body: '{"title":"boom","status":500}' });
    } else {
      await route.continue();
    }
  });

  await page.goto('/');
  await expect(page.getByText("Couldn't load transactions")).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
```

- [ ] **Step 2: Run, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "e2e: error banner with Retry recovers on success"
```

---

## Task 28: TDD — e2e: empty state

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Add failing test**

```ts
import { clearFixture } from './helpers/api';

test('shows empty-state message when no transactions', async ({ page }) => {
  await clearFixture();
  await page.goto('/');
  await expect(page.getByText('No transactions')).toBeVisible();
  await expect(page.locator('table')).not.toBeVisible();
});
```

(Note: this test must come last in the file or use `test.afterEach(seedFixture)` to restore state. Simplest fix: move the call to `seedFixture` from `test.beforeEach` to inside each test that needs data, or accept that this test always runs last via `test.describe.configure({ mode: 'serial' })`.)

Safer rewrite of the top of `list.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { seedFixture, clearFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => { await seedFixture(); });
```

- [ ] **Step 2: Run, verify pass**

Run: `cd frontend && npx playwright test list.spec.ts`
Expected: all 8 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/
git commit -m "e2e: empty-state message when transactions cleared"
```

---

## Task 29: README + final lint/format pass

**Files:**
- Create: `README.md`
- Modify: any files flagged by lint/format

- [ ] **Step 1: Run formatters**

```bash
cd backend && dotnet format
cd ../frontend && npx prettier --write . && npx eslint --fix . || true
cd ..
```

- [ ] **Step 2: Run full test suite**

Run: `make test`
Expected: backend tests PASS, Playwright tests PASS.

- [ ] **Step 3: Write minimal README**

`README.md`:

```markdown
# LedgerOne — Investment Transactions Dashboard

PriceMetrix take-home. See `PRD.md` for product spec and `docs/superpowers/specs/`
for implementation specs.

## Prerequisites

- .NET 10 SDK (`global.json` pins the version)
- Node.js 22+ and npm
- Playwright browsers: `npx playwright install chromium` (in `frontend/`)

## Run locally

```bash
make dev
```

Or in two terminals:

```bash
cd backend && dotnet run --project LedgerOne.Api    # http://localhost:5000
cd frontend && npm run dev                          # http://localhost:5173
```

The backend seeds 8,000 transactions into SQLite on first run.

## Test

```bash
make test     # backend xUnit + frontend Playwright
make check    # adds format + lint + type-check
```

## Status

This is sub-project 1 of 3 (foundation + paginated list).
Filters, detail view, and the AI agent are in subsequent sub-projects.
```

- [ ] **Step 4: Commit**

```bash
git add README.md backend/ frontend/
git commit -m "Add README and final lint/format pass"
```

---

## Task 30: Push branch

- [ ] **Step 1: Push**

```bash
git push -u origin claude/add-dashboard-prd-zPf4J
```

If network fails, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

- [ ] **Step 2: Confirm**

Run: `git status && git log --oneline -10`
Expected: working tree clean, recent commits visible.

---

## Self-Review Checklist

- [x] Every spec requirement maps to a task: scaffolding (T1-T4), `/health` (T5), entity + DbContext + migration + indexes (T6-T7), test seed/clear endpoints (T8), handler logic across all 7 unit-test cases (T9-T14), controller + snapshot (T15), Problem Details mapping for both 400 and 500 (T16-T17), Serilog + correlation IDs (T18), DevSeeder (T19), CORS (T20), frontend scaffold (T21), e2e per UI behavior (T22, T24-T28), Testing env wiring (T23), README + lint (T29), push (T30).
- [x] No placeholders: every step contains the exact code or command.
- [x] Type consistency: `ListTransactionsRequest`, `ListTransactionsResponse`, `TransactionDto`, `ValidationException` used identically across all tasks; `ApiFactory` extended (not redefined) by `DevApiFactory` / `ProductionApiFactory`.
- [x] TDD discipline: every behavior-introducing task starts with a failing test, runs it red, then implements, runs green, then commits.
- [x] No unrelated refactors.
- [x] Test data flow as specified: in-memory SQLite for unit, file-based SQLite per class for integration, ephemeral `ledgerone.testing.db` for Playwright with `/api/test/seed` + `/api/test/clear`.

## Notes on risks (from spec, surfaced for executor)

- If Bogus `PickRandomWeighted` shape differs, Task 19 Step 4 has a fallback using `f.Random.Int`.
- If Tailwind v4 PostCSS integration causes Vite issues, fall back to Tailwind v3.4 (documented as a known fallback, not changed mid-task).
- If the `dotnet new webapi` template flags change in the installed SDK, use `dotnet new webapi --controllers` (current .NET 10 SDK form).
- `make dev` uses bash trap; on systems with a different default shell, run the two `dotnet run` and `npm run dev` commands in separate terminals.
