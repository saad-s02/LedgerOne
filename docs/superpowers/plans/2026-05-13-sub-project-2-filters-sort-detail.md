# Sub-project 2 Implementation Plan — Filters, Sort, Detail, Pills, Debouncing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the non-AI surface of the PRD. Add full filter set, sort selector, page-size selector, debounced search, detail page, status pills, skeleton rows, and FluentValidation — all backed by xUnit + Playwright tests written test-first.

**Architecture:** Extend the existing `ListTransactionsHandler` in place with conditional `IQueryable<Transaction>` `.Where(...)` clauses per filter and a small sort switch. Detail surface is a separate `GetTransactionHandler` + 404-mapped `NotFoundException`. Frontend keeps URL search params as single source of truth, validated by an extended Zod schema; new `FilterBar`, `StatusPill`, `SkeletonRows` components and a new `transactions.$id.tsx` route. FluentValidation adopted via a thin adapter that re-throws as the existing `ValidationException` so the Problem Details envelope is unchanged.

**Tech Stack:** .NET 10 + ASP.NET Core controllers, EF Core + SQLite, FluentValidation 12, xUnit v3 + FluentAssertions + Verify. Vite + React 19 + TypeScript strict, Tailwind v4, TanStack Router (file-based), TanStack Query, Zod 4, Playwright (Chromium).

**Spec:** `docs/superpowers/specs/2026-05-13-sub-project-2-filters-sort-detail-design.md`.

---

## File Plan

**Backend new files:**
- `backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs`
- `backend/LedgerOne.Api/Features/Transactions/GetTransactionHandler.cs`
- `backend/LedgerOne.Api/Features/Transactions/TransactionDetailDto.cs`
- `backend/LedgerOne.Api/Features/Transactions/SortField.cs`
- `backend/LedgerOne.Api/Features/Transactions/SortDirection.cs`
- `backend/LedgerOne.Api/Infrastructure/Validation/FluentValidationExtensions.cs`
- `backend/LedgerOne.Api/Infrastructure/Errors/NotFoundException.cs`
- `backend/LedgerOne.Api.Tests/Unit/GetTransactionHandlerTests.cs`

**Backend modified files:**
- `backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs`
- `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- `backend/LedgerOne.Api/Controllers/TransactionsController.cs`
- `backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs`
- `backend/LedgerOne.Api/Program.cs`
- `backend/Directory.Packages.props`
- `backend/LedgerOne.Api/LedgerOne.Api.csproj`
- `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`
- `backend/LedgerOne.Api.Tests/Integration/Snapshots/` (new `.verified.txt` snapshots added)

**Frontend new files:**
- `frontend/src/components/StatusPill.tsx`
- `frontend/src/components/SkeletonRows.tsx`
- `frontend/src/components/FilterBar.tsx`
- `frontend/src/lib/useDebouncedValue.ts`
- `frontend/src/lib/listSearch.ts` (shared search-param Zod schema + defaults helper)
- `frontend/src/routes/transactions.$id.tsx`
- `frontend/e2e/detail.spec.ts`

**Frontend modified files:**
- `frontend/src/api/transactions.ts`
- `frontend/src/routes/index.tsx`
- `frontend/e2e/list.spec.ts`

---

## Conventions used in this plan

- Every task is **one commit** = one behavior. Tests + implementation in the same commit.
- Run commands are PowerShell-friendly: prefer `dotnet test --filter` and `npx playwright test -g`.
- After every commit, run `make check` only at phase boundaries (marked with **CHECKPOINT**).
- Co-authored trailer included on every commit:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

---

# Phase 1 — Adopt FluentValidation (no behavior change)

### Task 1: Add FluentValidation packages and registration

**Files:**
- Modify: `backend/Directory.Packages.props`
- Modify: `backend/LedgerOne.Api/LedgerOne.Api.csproj`
- Modify: `backend/LedgerOne.Api/Program.cs`

- [ ] **Step 1: Pin FluentValidation versions in central package management**

Append two `<PackageVersion>` lines inside the existing `<ItemGroup>` in `backend/Directory.Packages.props`:

```xml
    <PackageVersion Include="FluentValidation" Version="12.0.0" />
    <PackageVersion Include="FluentValidation.DependencyInjectionExtensions" Version="12.0.0" />
```

- [ ] **Step 2: Reference both packages in the API project**

Add the references inside the existing `<ItemGroup>` of `backend/LedgerOne.Api/LedgerOne.Api.csproj`:

```xml
    <PackageReference Include="FluentValidation" />
    <PackageReference Include="FluentValidation.DependencyInjectionExtensions" />
```

- [ ] **Step 3: Wire DI registration in `Program.cs`**

After the line `builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.ListTransactionsHandler>();`, add:

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
```

- [ ] **Step 4: Build to confirm packages restored**

Run: `cd backend && dotnet build`
Expected: 0 errors. Warnings only acceptable if pre-existing.

- [ ] **Step 5: Commit**

```bash
git add backend/Directory.Packages.props backend/LedgerOne.Api/LedgerOne.Api.csproj backend/LedgerOne.Api/Program.cs
git commit -m "$(cat <<'EOF'
Add FluentValidation packages and DI registration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Introduce the FluentValidation adapter and refactor the handler to use it (behavior preserved)

**Files:**
- Create: `backend/LedgerOne.Api/Infrastructure/Validation/FluentValidationExtensions.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs`
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`

This task changes how validation is reached but not the externally observed shape — the existing handler tests (`Handle_PageBelow1_ThrowsValidationException`, etc.) continue to pass without modification.

- [ ] **Step 1: Create the adapter**

Create `backend/LedgerOne.Api/Infrastructure/Validation/FluentValidationExtensions.cs`:

```csharp
using FluentValidation;

namespace LedgerOne.Api.Infrastructure.Validation;

public static class FluentValidationExtensions
{
    public static async Task ValidateOrThrowAsync<T>(
        this IValidator<T> validator, T instance, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(instance, ct);
        if (result.IsValid) return;

        var errors = result.Errors
            .GroupBy(e => ToCamel(e.PropertyName))
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        throw new ValidationException(errors);
    }

    private static string ToCamel(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToLowerInvariant(s[0]) + s[1..];
}
```

- [ ] **Step 2: Create the validator with the current rules**

Create `backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs`:

```csharp
using FluentValidation;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsValidator : AbstractValidator<ListTransactionsRequest>
{
    public ListTransactionsValidator()
    {
        RuleFor(r => r.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Must be greater than or equal to 1.");

        RuleFor(r => r.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Must be between 1 and 100.");
    }
}
```

- [ ] **Step 3: Refactor the handler to depend on `IValidator<ListTransactionsRequest>`**

Replace `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs` with:

```csharp
using FluentValidation;
using LedgerOne.Api.Data;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(
    AppDbContext db,
    IValidator<ListTransactionsRequest> validator)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);

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
}
```

- [ ] **Step 4: Update the unit-test fixtures to inject the validator**

Open `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`. In the constructor where `_sut` is built, replace:

```csharp
_sut = new ListTransactionsHandler(_db);
```

with:

```csharp
_sut = new ListTransactionsHandler(_db, new ListTransactionsValidator());
```

Add `using LedgerOne.Api.Features.Transactions;` if not already present (the file already has `using LedgerOne.Api.Features.Transactions;`).

- [ ] **Step 5: Run all backend tests — everything still green**

Run: `cd backend && dotnet test`
Expected: All previously passing tests still pass (unit + integration). 0 failures.

- [ ] **Step 6: Commit**

```bash
git add backend/LedgerOne.Api/Infrastructure/Validation/FluentValidationExtensions.cs backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs
git commit -m "$(cat <<'EOF'
Refactor: route ListTransactionsRequest validation through FluentValidation

Same wire-level 400 Problem Details shape; manual Validate() replaced by
ListTransactionsValidator + a FV-to-ValidationException adapter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 1):** Run `cd backend && dotnet test` — expect green. Run `make check` if convenient.

---

# Phase 2 — Sort

### Task 3: Add `SortField` and `SortDirection` enums and bind them on the request (defaults preserve behavior)

**Files:**
- Create: `backend/LedgerOne.Api/Features/Transactions/SortField.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/SortDirection.cs`
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs`

- [ ] **Step 1: Create the `SortField` enum**

Create `backend/LedgerOne.Api/Features/Transactions/SortField.cs`:

```csharp
namespace LedgerOne.Api.Features.Transactions;

public enum SortField
{
    Date,
    Amount,
}
```

- [ ] **Step 2: Create the `SortDirection` enum**

Create `backend/LedgerOne.Api/Features/Transactions/SortDirection.cs`:

```csharp
namespace LedgerOne.Api.Features.Transactions;

public enum SortDirection
{
    Asc,
    Desc,
}
```

- [ ] **Step 3: Expand the request record**

Replace `backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs`:

```csharp
using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record ListTransactionsRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public TransactionType? Type { get; init; }
    public TransactionStatus? Status { get; init; }
    public string? Search { get; init; }
    public SortField SortBy { get; init; } = SortField.Date;
    public SortDirection SortDir { get; init; } = SortDirection.Desc;
}
```

- [ ] **Step 4: Run all backend tests — still green**

Run: `cd backend && dotnet test`
Expected: green. Existing behavior unchanged (handler still hard-codes Date Desc).

- [ ] **Step 5: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/SortField.cs backend/LedgerOne.Api/Features/Transactions/SortDirection.cs backend/LedgerOne.Api/Features/Transactions/ListTransactionsRequest.cs
git commit -m "$(cat <<'EOF'
Extend ListTransactionsRequest with filter and sort properties (unused so far)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Implement sort switch in the handler — `Date Asc`, `Amount Desc`, `Amount Asc`

**Files:**
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Test: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`

- [ ] **Step 1: Write three failing unit tests for the new sort cases**

Append to `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs` (above the closing brace):

```csharp
    [Fact]
    public async Task Handle_SortByDateAscending_ReturnsOldestFirst()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "OLD", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "NEW", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "MID", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { SortBy = SortField.Date, SortDir = SortDirection.Asc },
            ct);

        response.Data.Select(d => d.AccountId).Should().ContainInOrder("OLD", "MID", "NEW");
    }

    [Fact]
    public async Task Handle_SortByAmountDescending_ReturnsLargestFirst()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "SMALL", AdvisorName = "x", Type = TransactionType.Buy, Amount = 10m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "BIG", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1000m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc), AccountId = "MID", AdvisorName = "x", Type = TransactionType.Buy, Amount = 100m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { SortBy = SortField.Amount, SortDir = SortDirection.Desc },
            ct);

        response.Data.Select(d => d.AccountId).Should().ContainInOrder("BIG", "MID", "SMALL");
    }

    [Fact]
    public async Task Handle_SortByAmountAscending_ReturnsSmallestFirst()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "SMALL", AdvisorName = "x", Type = TransactionType.Buy, Amount = 10m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "BIG", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1000m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc), AccountId = "MID", AdvisorName = "x", Type = TransactionType.Buy, Amount = 100m, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { SortBy = SortField.Amount, SortDir = SortDirection.Asc },
            ct);

        response.Data.Select(d => d.AccountId).Should().ContainInOrder("SMALL", "MID", "BIG");
    }
```

- [ ] **Step 2: Run the three new tests — confirm RED**

Run:
```
cd backend && dotnet test --filter "FullyQualifiedName~Handle_SortByDateAscending|FullyQualifiedName~Handle_SortByAmount"
```
Expected: 3 failures. (Handler still hard-codes Date Desc, so SortDir=Asc and SortBy=Amount don't apply.)

- [ ] **Step 3: Implement the sort switch**

Replace the body of `Handle` in `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs` so the file becomes:

```csharp
using FluentValidation;
using LedgerOne.Api.Data;
using LedgerOne.Api.Domain;
using LedgerOne.Api.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsHandler(
    AppDbContext db,
    IValidator<ListTransactionsRequest> validator)
{
    public async Task<ListTransactionsResponse> Handle(ListTransactionsRequest req, CancellationToken ct)
    {
        await validator.ValidateOrThrowAsync(req, ct);

        IQueryable<Transaction> query = db.Transactions;

        var total = await query.CountAsync(ct);

        query = ApplySort(query, req);

        var data = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(t => new TransactionDto(
                t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
                t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status))
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / req.PageSize);
        return new ListTransactionsResponse(data, total, req.Page, req.PageSize, totalPages);
    }

    private static IOrderedQueryable<Transaction> ApplySort(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        return (req.SortBy, req.SortDir) switch
        {
            (SortField.Date,   SortDirection.Desc) => query.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id),
            (SortField.Date,   SortDirection.Asc ) => query.OrderBy(t => t.TransactionDate).ThenBy(t => t.Id),
            (SortField.Amount, SortDirection.Desc) => query.OrderByDescending(t => t.Amount).ThenByDescending(t => t.Id),
            (SortField.Amount, SortDirection.Asc ) => query.OrderBy(t => t.Amount).ThenBy(t => t.Id),
            _ => query.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id),
        };
    }
}
```

- [ ] **Step 4: Run all backend tests — green**

Run: `cd backend && dotnet test`
Expected: all green, including the three new sort tests AND the existing `Handle_DefaultsToTransactionDateDescending` test.

- [ ] **Step 5: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs
git commit -m "$(cat <<'EOF'
Handler: sort by date/amount, asc/desc with Id tiebreaker

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Integration test — `?sortBy=amount&sortDir=desc` returns rows ordered by amount

**Files:**
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Add the failing test**

Append (above the closing brace) in `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_Transactions_SortByAmountDesc_ReturnsLargestFirst()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?sortBy=amount&sortDir=desc", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().HaveCountGreaterThan(1);
        envelope.Data
            .Zip(envelope.Data.Skip(1), (a, b) => a.Amount >= b.Amount)
            .Should().AllSatisfy(ordered => ordered.Should().BeTrue());
    }
```

- [ ] **Step 2: Run the test — green (Task 4 already implemented sort)**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Get_Transactions_SortByAmountDesc"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Integration: ?sortBy=amount&sortDir=desc orders rows by descending amount

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 2):** `cd backend && dotnet test` green.

---

# Phase 3 — Filters

### Task 6: `Type` filter

**Files:**
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Write the failing unit test**

Append to `ListTransactionsHandlerTests.cs`:

```csharp
    [Fact]
    public async Task Handle_FilterByType_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "A", AdvisorName = "x", Type = TransactionType.Buy,  Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "B", AdvisorName = "x", Type = TransactionType.Sell, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc), AccountId = "C", AdvisorName = "x", Type = TransactionType.Buy,  Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { Type = TransactionType.Buy },
            ct);

        response.Total.Should().Be(2);
        response.Data.Select(d => d.Type).Should().AllSatisfy(t => t.Should().Be(TransactionType.Buy));
    }
```

- [ ] **Step 2: Run — RED**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Handle_FilterByType"`
Expected: FAIL — total is 3, not 2.

- [ ] **Step 3: Implement — add `.Where` clauses before the count and before sort**

In `ListTransactionsHandler.cs`, replace the lines

```csharp
        IQueryable<Transaction> query = db.Transactions;

        var total = await query.CountAsync(ct);

        query = ApplySort(query, req);
```

with:

```csharp
        var query = BuildQuery(db.Transactions, req);

        var total = await query.CountAsync(ct);

        query = ApplySort(query, req);
```

Then add this method to the class (after `ApplySort`):

```csharp
    private static IQueryable<Transaction> BuildQuery(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        if (req.Type.HasValue) query = query.Where(t => t.Type == req.Type.Value);
        return query;
    }
```

(Subsequent filter tasks extend this method.)

- [ ] **Step 4: Run all tests — green**

Run: `cd backend && dotnet test`
Expected: all green.

- [ ] **Step 5: Add the integration test**

Append to `TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_Transactions_FilterByType_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?type=Buy", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Total.Should().Be(12);  // fixture has 60 rows cycling 5 types → 12 of each
        envelope.Data.Should().AllSatisfy(d => d.Type.Should().Be(LedgerOne.Api.Domain.TransactionType.Buy));
    }
```

- [ ] **Step 6: Run the integration test — green**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Get_Transactions_FilterByType"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Handler: filter by Type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `Status` filter

**Files:**
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Failing unit test**

Append to `ListTransactionsHandlerTests.cs`:

```csharp
    [Fact]
    public async Task Handle_FilterByStatus_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "A", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Pending,   CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "B", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled,   CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc), AccountId = "C", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Pending,   CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { Status = TransactionStatus.Pending },
            ct);

        response.Total.Should().Be(2);
        response.Data.Select(d => d.Status).Should().AllSatisfy(s => s.Should().Be(TransactionStatus.Pending));
    }
```

- [ ] **Step 2: Run — RED**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Handle_FilterByStatus"`
Expected: FAIL.

- [ ] **Step 3: Extend `BuildQuery`**

In `ListTransactionsHandler.cs`, modify `BuildQuery` to:

```csharp
    private static IQueryable<Transaction> BuildQuery(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        if (req.Type.HasValue)   query = query.Where(t => t.Type == req.Type.Value);
        if (req.Status.HasValue) query = query.Where(t => t.Status == req.Status.Value);
        return query;
    }
```

- [ ] **Step 4: Add the integration test**

Append to `TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_Transactions_FilterByStatus_ReturnsOnlyMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?status=Pending", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Total.Should().Be(20);  // fixture has 60 rows cycling 3 statuses → 20 of each
        envelope.Data.Should().AllSatisfy(d => d.Status.Should().Be(LedgerOne.Api.Domain.TransactionStatus.Pending));
    }
```

- [ ] **Step 5: Run all backend tests — green**

Run: `cd backend && dotnet test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Handler: filter by Status

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Date range filter — `FromDate`, `ToDate`, and the `dateRange` validation rule

**Files:**
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs`
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Failing unit tests — FromDate, ToDate, and the inverted-range exception**

Append to `ListTransactionsHandlerTests.cs`:

```csharp
    [Fact]
    public async Task Handle_FilterByFromDate_ReturnsOnlyRowsOnOrAfterCutoff()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "OLD", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "NEW", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { FromDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) },
            ct);

        response.Total.Should().Be(1);
        response.Data.Single().AccountId.Should().Be("NEW");
    }

    [Fact]
    public async Task Handle_FilterByToDate_ReturnsOnlyRowsOnOrBeforeCutoff()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "OLD", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "NEW", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { ToDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc) },
            ct);

        response.Total.Should().Be(1);
        response.Data.Single().AccountId.Should().Be("OLD");
    }

    [Fact]
    public async Task Handle_FromDateAfterToDate_ThrowsValidationException_WithDateRangeKey()
    {
        var ct = TestContext.Current.CancellationToken;
        var act = () => _sut.Handle(
            new ListTransactionsRequest
            {
                FromDate = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate   = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            },
            ct);

        var ex = await act.Should().ThrowAsync<LedgerOne.Api.Infrastructure.Validation.ValidationException>();
        ex.Which.Errors.Should().ContainKey("dateRange");
    }
```

- [ ] **Step 2: Run — RED (3 failures)**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Handle_FilterByFromDate|FullyQualifiedName~Handle_FilterByToDate|FullyQualifiedName~Handle_FromDateAfterToDate"`
Expected: 3 failures.

- [ ] **Step 3: Extend the validator with the date-range rule**

Replace `ListTransactionsValidator.cs`:

```csharp
using FluentValidation;

namespace LedgerOne.Api.Features.Transactions;

public class ListTransactionsValidator : AbstractValidator<ListTransactionsRequest>
{
    public ListTransactionsValidator()
    {
        RuleFor(r => r.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("Must be greater than or equal to 1.");

        RuleFor(r => r.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Must be between 1 and 100.");

        RuleFor(r => r)
            .Must(r => !(r.FromDate.HasValue && r.ToDate.HasValue) || r.FromDate <= r.ToDate)
            .OverridePropertyName("dateRange")
            .WithMessage("fromDate must be on or before toDate.");
    }
}
```

- [ ] **Step 4: Extend `BuildQuery` with the date filters**

In `ListTransactionsHandler.cs`, modify `BuildQuery`:

```csharp
    private static IQueryable<Transaction> BuildQuery(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        if (req.Type.HasValue)   query = query.Where(t => t.Type == req.Type.Value);
        if (req.Status.HasValue) query = query.Where(t => t.Status == req.Status.Value);
        if (req.FromDate.HasValue) query = query.Where(t => t.TransactionDate >= req.FromDate.Value);
        if (req.ToDate.HasValue)   query = query.Where(t => t.TransactionDate <= req.ToDate.Value);
        return query;
    }
```

- [ ] **Step 5: Run all backend tests — green**

Run: `cd backend && dotnet test`
Expected: green.

- [ ] **Step 6: Integration test — 400 on inverted date range**

Append to `TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_Transactions_FromDateAfterToDate_Returns400ProblemDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();

        var response = await client.GetAsync(
            "/api/transactions?fromDate=2026-05-01T00:00:00Z&toDate=2026-04-01T00:00:00Z",
            ct);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync(ct);
        body.Should().Contain("dateRange");
    }
```

- [ ] **Step 7: Run the new integration test — green**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Get_Transactions_FromDateAfterToDate"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api/Features/Transactions/ListTransactionsValidator.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Handler: FromDate/ToDate filters and dateRange validation rule

Inverted range returns 400 Problem Details with errors.dateRange.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `Search` filter (substring on AccountId OR SecuritySymbol)

**Files:**
- Modify: `backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs`
- Modify: `backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Failing unit tests — account match, symbol match, case-insensitive, empty/whitespace = no-op**

Append to `ListTransactionsHandlerTests.cs`:

```csharp
    [Fact]
    public async Task Handle_FilterBySearch_MatchesAccountIdSubstring_CaseInsensitive()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "ACCT-12345", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "ACCT-99999", AdvisorName = "x", Type = TransactionType.Buy, Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { Search = "acct-12" },  // lowercase
            ct);

        response.Total.Should().Be(1);
        response.Data.Single().AccountId.Should().Be("ACCT-12345");
    }

    [Fact]
    public async Task Handle_FilterBySearch_MatchesSecuritySymbolSubstring()
    {
        var ct = TestContext.Current.CancellationToken;
        _db.Transactions.AddRange(
            new Transaction { TransactionDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc), AccountId = "X", AdvisorName = "x", Type = TransactionType.Buy, SecuritySymbol = "AAPL", Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow },
            new Transaction { TransactionDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc), AccountId = "Y", AdvisorName = "x", Type = TransactionType.Buy, SecuritySymbol = "MSFT", Amount = 1, Currency = Currency.CAD, Status = TransactionStatus.Settled, CreatedAt = DateTime.UtcNow });
        _db.SaveChanges();

        var response = await _sut.Handle(
            new ListTransactionsRequest { Search = "AAPL" },
            ct);

        response.Total.Should().Be(1);
        response.Data.Single().SecuritySymbol.Should().Be("AAPL");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Handle_FilterBySearch_EmptyOrWhitespace_TreatedAsNoFilter(string? search)
    {
        var ct = TestContext.Current.CancellationToken;
        SeedRows(5);

        var response = await _sut.Handle(
            new ListTransactionsRequest { Search = search },
            ct);

        response.Total.Should().Be(5);
    }
```

- [ ] **Step 2: Run — RED**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Handle_FilterBySearch"`
Expected: failures.

- [ ] **Step 3: Extend `BuildQuery` with the search clause**

In `ListTransactionsHandler.cs`, modify `BuildQuery`:

```csharp
    private static IQueryable<Transaction> BuildQuery(IQueryable<Transaction> query, ListTransactionsRequest req)
    {
        if (req.Type.HasValue)     query = query.Where(t => t.Type == req.Type.Value);
        if (req.Status.HasValue)   query = query.Where(t => t.Status == req.Status.Value);
        if (req.FromDate.HasValue) query = query.Where(t => t.TransactionDate >= req.FromDate.Value);
        if (req.ToDate.HasValue)   query = query.Where(t => t.TransactionDate <= req.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var pattern = $"%{req.Search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.Like(t.AccountId, pattern) ||
                (t.SecuritySymbol != null && EF.Functions.Like(t.SecuritySymbol, pattern)));
        }

        return query;
    }
```

- [ ] **Step 4: Run all backend tests — green**

Run: `cd backend && dotnet test`
Expected: green.

- [ ] **Step 5: Add the integration test**

Append to `TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_Transactions_SearchByAccountId_ReturnsMatchingRows()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions?search=ACCT-00001", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var envelope = await response.Content.ReadFromJsonAsync<ListTransactionsResponse>(JsonOptions, ct);
        envelope.Should().NotBeNull();
        envelope!.Data.Should().NotBeEmpty();
        envelope.Data.Should().AllSatisfy(d => d.AccountId.Should().Contain("ACCT-00001"));
    }
```

- [ ] **Step 6: Run new integration test — green**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Get_Transactions_SearchByAccountId"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/ListTransactionsHandler.cs backend/LedgerOne.Api.Tests/Unit/ListTransactionsHandlerTests.cs backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Handler: Search filter (substring match on AccountId OR SecuritySymbol)

SQLite LIKE is ASCII case-insensitive. Whitespace-only search is treated
as no filter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 3):** `cd backend && dotnet test` green.

---

# Phase 4 — Detail endpoint

### Task 10: Add `NotFoundException` and map it to 404 Problem Details

**Files:**
- Create: `backend/LedgerOne.Api/Infrastructure/Errors/NotFoundException.cs`
- Modify: `backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs`
- Test: `backend/LedgerOne.Api.Tests/Integration/ProblemDetailsTests.cs` (existing — extend if it already covers 400/500)

- [ ] **Step 1: Create the exception**

Create `backend/LedgerOne.Api/Infrastructure/Errors/NotFoundException.cs`:

```csharp
namespace LedgerOne.Api.Infrastructure.Errors;

public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} with id {key} was not found.")
{
    public string Resource { get; } = resource;
    public object Key { get; } = key;
}
```

- [ ] **Step 2: Extend `GlobalExceptionHandler` to handle it**

Replace `backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs`:

```csharp
using LedgerOne.Api.Infrastructure.Errors;
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
                Type = "about:blank",
                Title = "One or more validation errors occurred.",
                Status = StatusCodes.Status400BadRequest,
            };
            problem.Extensions["traceId"] = httpContext.TraceIdentifier;
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }

        if (exception is NotFoundException nf)
        {
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Type = "about:blank",
                Title = "Resource not found.",
                Status = StatusCodes.Status404NotFound,
                Detail = nf.Message,
            };
            problem.Extensions["traceId"] = httpContext.TraceIdentifier;
            httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }

        logger.LogError(exception, "Unhandled exception (traceId: {TraceId})", httpContext.TraceIdentifier);

        var serverProblem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Type = "about:blank",
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

- [ ] **Step 3: Run backend tests — existing tests still pass**

Run: `cd backend && dotnet test`
Expected: green (no behavior change visible to existing tests — the 404 branch is dormant until a handler throws `NotFoundException`).

- [ ] **Step 4: Commit**

```bash
git add backend/LedgerOne.Api/Infrastructure/Errors/NotFoundException.cs backend/LedgerOne.Api/Infrastructure/ProblemDetails/GlobalExceptionHandler.cs
git commit -m "$(cat <<'EOF'
Add NotFoundException and map to 404 Problem Details with traceId

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: `TransactionDetailDto` and `GetTransactionHandler`

**Files:**
- Create: `backend/LedgerOne.Api/Features/Transactions/TransactionDetailDto.cs`
- Create: `backend/LedgerOne.Api/Features/Transactions/GetTransactionHandler.cs`
- Create: `backend/LedgerOne.Api.Tests/Unit/GetTransactionHandlerTests.cs`

- [ ] **Step 1: Create the detail DTO**

Create `backend/LedgerOne.Api/Features/Transactions/TransactionDetailDto.cs`:

```csharp
using LedgerOne.Api.Domain;

namespace LedgerOne.Api.Features.Transactions;

public record TransactionDetailDto(
    int Id,
    DateTime TransactionDate,
    string AccountId,
    string AdvisorName,
    TransactionType Type,
    string? SecuritySymbol,
    decimal Amount,
    Currency Currency,
    TransactionStatus Status,
    string? Notes,
    DateTime CreatedAt);
```

- [ ] **Step 2: Write the failing unit tests for the handler**

Create `backend/LedgerOne.Api.Tests/Unit/GetTransactionHandlerTests.cs`:

```csharp
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
```

- [ ] **Step 3: Run — RED (compile failure — handler doesn't exist)**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~GetTransactionHandlerTests"`
Expected: compilation failure on missing `GetTransactionHandler`.

- [ ] **Step 4: Implement the handler**

Create `backend/LedgerOne.Api/Features/Transactions/GetTransactionHandler.cs`:

```csharp
using LedgerOne.Api.Data;
using LedgerOne.Api.Infrastructure.Errors;
using Microsoft.EntityFrameworkCore;

namespace LedgerOne.Api.Features.Transactions;

public class GetTransactionHandler(AppDbContext db)
{
    public async Task<TransactionDetailDto> Handle(int id, CancellationToken ct)
    {
        var t = await db.Transactions.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) throw new NotFoundException("Transaction", id);

        return new TransactionDetailDto(
            t.Id, t.TransactionDate, t.AccountId, t.AdvisorName,
            t.Type, t.SecuritySymbol, t.Amount, t.Currency, t.Status,
            t.Notes, t.CreatedAt);
    }
}
```

- [ ] **Step 5: Run unit tests — green**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~GetTransactionHandlerTests"`
Expected: 2 passes.

- [ ] **Step 6: Commit**

```bash
git add backend/LedgerOne.Api/Features/Transactions/TransactionDetailDto.cs backend/LedgerOne.Api/Features/Transactions/GetTransactionHandler.cs backend/LedgerOne.Api.Tests/Unit/GetTransactionHandlerTests.cs
git commit -m "$(cat <<'EOF'
GetTransactionHandler returns TransactionDetailDto or throws NotFoundException

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Wire `GET /api/transactions/{id}` on the controller + integration tests

**Files:**
- Modify: `backend/LedgerOne.Api/Controllers/TransactionsController.cs`
- Modify: `backend/LedgerOne.Api/Program.cs`
- Modify: `backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs`

- [ ] **Step 1: Failing integration tests — 200 + 404**

Append to `TransactionsEndpointTests.cs`:

```csharp
    [Fact]
    public async Task Get_TransactionById_ExistingId_Returns200WithDetail()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var list = await client.GetFromJsonAsync<ListTransactionsResponse>(
            "/api/transactions?page=1&pageSize=1", JsonOptions, ct);
        list.Should().NotBeNull();
        var existingId = list!.Data.Single().Id;

        var response = await client.GetAsync($"/api/transactions/{existingId}", ct);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await response.Content.ReadFromJsonAsync<TransactionDetailDto>(JsonOptions, ct);
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(existingId);
        dto.CreatedAt.Should().NotBe(default);
    }

    [Fact]
    public async Task Get_TransactionById_MissingId_Returns404ProblemDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = _factory.CreateClient();
        await client.PostAsync("/api/test/seed", null, ct);

        var response = await client.GetAsync("/api/transactions/999999", ct);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await response.Content.ReadAsStringAsync(ct);
        body.Should().Contain("traceId");
        body.Should().Contain("Resource not found");
    }
```

- [ ] **Step 2: Run — RED**

Run: `cd backend && dotnet test --filter "FullyQualifiedName~Get_TransactionById"`
Expected: failures (controller route doesn't exist yet — returns 404 from MVC, but body wrong).

- [ ] **Step 3: Register `GetTransactionHandler` in DI**

In `backend/LedgerOne.Api/Program.cs`, after the existing `AddScoped<...ListTransactionsHandler>` line, add:

```csharp
builder.Services.AddScoped<LedgerOne.Api.Features.Transactions.GetTransactionHandler>();
```

- [ ] **Step 4: Add the controller action**

Replace `backend/LedgerOne.Api/Controllers/TransactionsController.cs`:

```csharp
using LedgerOne.Api.Features.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace LedgerOne.Api.Controllers;

[ApiController]
[Route("api/transactions")]
public class TransactionsController(
    ListTransactionsHandler listHandler,
    GetTransactionHandler getHandler) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ListTransactionsResponse>> List(
        [FromQuery] ListTransactionsRequest request,
        CancellationToken ct)
    {
        var response = await listHandler.Handle(request, ct);
        return Ok(response);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TransactionDetailDto>> Get(int id, CancellationToken ct)
    {
        var dto = await getHandler.Handle(id, ct);
        return Ok(dto);
    }
}
```

- [ ] **Step 5: Run all backend tests — green**

Run: `cd backend && dotnet test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add backend/LedgerOne.Api/Controllers/TransactionsController.cs backend/LedgerOne.Api/Program.cs backend/LedgerOne.Api.Tests/Integration/TransactionsEndpointTests.cs
git commit -m "$(cat <<'EOF'
Add GET /api/transactions/{id}: 200 with detail or 404 Problem Details

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 4):** `cd backend && dotnet test` green. Run `make check` if convenient.

---

# Phase 5 — Frontend foundations

### Task 13: Extend the API client (filter params, detail fetch, detail DTO type)

**Files:**
- Modify: `frontend/src/api/transactions.ts`

- [ ] **Step 1: Replace the file with the expanded version**

Replace `frontend/src/api/transactions.ts`:

```ts
import { apiGet } from './client';

export type TransactionType = 'Buy' | 'Sell' | 'Fee' | 'Transfer' | 'Dividend';
export type TransactionStatus = 'Pending' | 'Settled' | 'Cancelled';
export type CurrencyCode = 'CAD' | 'USD';
export type SortField = 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

export interface TransactionDto {
  id: number;
  transactionDate: string;
  accountId: string;
  advisorName: string;
  type: TransactionType;
  securitySymbol: string | null;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
}

export interface TransactionDetailDto extends TransactionDto {
  notes: string | null;
  createdAt: string;
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListTransactionsParams {
  page: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  sortBy: SortField;
  sortDir: SortDirection;
}

export function transactionsKey(params: ListTransactionsParams) {
  return ['transactions', params] as const;
}

export function transactionDetailKey(id: number) {
  return ['transactions', 'detail', id] as const;
}

export function fetchTransactions(
  params: ListTransactionsParams,
  signal?: AbortSignal,
): Promise<ListTransactionsResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize));
  qs.set('sortBy', params.sortBy);
  qs.set('sortDir', params.sortDir);
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate) qs.set('toDate', params.toDate);
  if (params.type) qs.set('type', params.type);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  return apiGet<ListTransactionsResponse>(`/api/transactions?${qs}`, signal);
}

export function fetchTransaction(id: number, signal?: AbortSignal): Promise<TransactionDetailDto> {
  return apiGet<TransactionDetailDto>(`/api/transactions/${id}`, signal);
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors. (The list route still imports `transactionsKey` and `fetchTransactions` — the new signatures keep the same names, so the route compiles only if it passes the new required fields. We update the route in Task 14 to satisfy this.)

If `tsc` reports errors in `src/routes/index.tsx` referencing missing fields (`sortBy` etc.), proceed to Task 14 immediately — those errors will go away once the route is updated. Do **not** commit yet; commit happens at the end of Task 14.

---

### Task 14: Extract shared search schema + update list route to use the full filter set (defaults only — no UI yet)

**Files:**
- Create: `frontend/src/lib/listSearch.ts`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create the shared schema**

Create `frontend/src/lib/listSearch.ts`:

```ts
import { z } from 'zod';

export const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;

export const listSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => (ALLOWED_PAGE_SIZES as readonly number[]).includes(n), {
      message: 'pageSize must be 25, 50, or 100',
    })
    .default(25),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  type: z.enum(['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend']).optional(),
  status: z.enum(['Pending', 'Settled', 'Cancelled']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount']).default('date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const DEFAULT_LIST_SEARCH: ListSearch = {
  page: 1,
  pageSize: 25,
  sortBy: 'date',
  sortDir: 'desc',
};

export function isAnyFilterActive(search: ListSearch): boolean {
  return Boolean(
    search.fromDate ||
      search.toDate ||
      search.type ||
      search.status ||
      (search.search && search.search.trim().length > 0),
  );
}
```

- [ ] **Step 2: Update the list route to consume the schema and pass all params to the query**

Replace `frontend/src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, transactionsKey } from '../api/transactions';
import { listSearchSchema } from '../lib/listSearch';

export const Route = createFileRoute('/')({
  validateSearch: listSearchSchema.parse,
  component: ListPage,
});

function ListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  if (isPending) return <div className="text-gray-600">Loading…</div>;
  if (isError) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
        <div className="mb-2 font-medium">Couldn't load transactions</div>
        <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
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

- [ ] **Step 3: Verify route generation + type-check + lint**

Run:
```
cd frontend && npx tsc --noEmit && npx eslint .
```
Expected: 0 errors.

- [ ] **Step 4: Run existing Playwright tests — all still green**

Run: `cd frontend && npx playwright test`
Expected: all 8 existing tests pass (no UI change yet — behavior identical to before).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/transactions.ts frontend/src/lib/listSearch.ts frontend/src/routes/index.tsx
git commit -m "$(cat <<'EOF'
Frontend: shared listSearch schema; route plumbing for full filter set

API client and route now thread sortBy/sortDir and optional filters
through to the backend. No new UI yet; defaults reproduce prior behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 5):** `make check` if convenient.

---

# Phase 6 — Frontend components (pill, skeleton, hook)

### Task 15: `StatusPill` component

**Files:**
- Create: `frontend/src/components/StatusPill.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Write the failing Playwright assertion**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('status pill renders with semantic color class', async ({ page }) => {
  await page.goto('/');
  // Fixture row 1 (Settled) — class includes "bg-green-100".
  const firstStatusCell = page.locator('tbody tr').first().locator('td').last();
  const pill = firstStatusCell.locator('span');
  await expect(pill).toBeVisible();
  // Status of fixture row 0 cycles statuses[0] = Settled → green.
  await expect(pill).toHaveClass(/bg-(green|yellow|red)-100/);
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "status pill renders"`
Expected: FAIL (the status cell renders plain text, no `<span>`).

- [ ] **Step 3: Create the component**

Create `frontend/src/components/StatusPill.tsx`:

```tsx
import type { TransactionStatus } from '../api/transactions';

const STYLES: Record<TransactionStatus, string> = {
  Settled: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export function StatusPill({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 4: Use it in the table**

In `frontend/src/routes/index.tsx`, add the import near the top:

```tsx
import { StatusPill } from '../components/StatusPill';
```

Replace the last `<td>` of the row mapping:

```tsx
              <td className="px-3 py-2">{t.status}</td>
```

with:

```tsx
              <td className="px-3 py-2">
                <StatusPill status={t.status} />
              </td>
```

- [ ] **Step 5: Run the Playwright assertion — green**

Run: `cd frontend && npx playwright test -g "status pill renders"`
Expected: PASS. All other tests still pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/StatusPill.tsx frontend/src/routes/index.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
Add StatusPill component; use in list table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: `SkeletonRows` component (replace plain "Loading…")

**Files:**
- Create: `frontend/src/components/SkeletonRows.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Update the existing loading test and add a row-count assertion**

In `frontend/e2e/list.spec.ts`, find:

```ts
test('shows loading state before rows appear', async ({ page }) => {
  await page.route('http://localhost:5000/api/transactions*', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  const navigation = page.goto('/');
  await expect(page.getByText('Loading…')).toBeVisible();
  await navigation;
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
```

Replace with:

```ts
test('shows skeleton rows before data arrives', async ({ page }) => {
  await page.route('http://localhost:5000/api/transactions*', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  const navigation = page.goto('/');
  // Skeleton tbody renders 8 placeholder rows.
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(8);
  await navigation;
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "skeleton rows"`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Create `frontend/src/components/SkeletonRows.tsx`:

```tsx
interface Props {
  count: number;
  columns: number;
}

export function SkeletonRows({ count, columns }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr
          key={rowIdx}
          data-testid="skeleton-row"
          className="border-b border-gray-100"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-3 py-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Render the skeleton inside a table while pending**

In `frontend/src/routes/index.tsx`:

- Add import: `import { SkeletonRows } from '../components/SkeletonRows';`
- Replace the `if (isPending) return <div className="text-gray-600">Loading…</div>;` block. The pending branch now must render the table shell so the `tbody` selector works. The simplest path is to refactor the function body into a single returned tree with conditional `<tbody>` content. Replace the whole `ListPage` function body with:

```tsx
function ListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  return (
    <div>
      {isError ? (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="mb-2 font-medium">Couldn't load transactions</div>
          <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
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
              {isPending ? (
                <SkeletonRows count={8} columns={7} />
              ) : (
                data.data.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">{t.transactionDate.slice(0, 10)}</td>
                    <td className="px-3 py-2">{t.accountId}</td>
                    <td className="px-3 py-2">{t.advisorName}</td>
                    <td className="px-3 py-2">{t.type}</td>
                    <td className="px-3 py-2">{t.securitySymbol ?? '—'}</td>
                    <td className="px-3 py-2">
                      {t.amount.toFixed(2)} {t.currency}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isPending && data.total === 0 && (
            <div className="mt-4 text-gray-600">No transactions</div>
          )}
          {!isPending && data.total > 0 && (
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
          )}
        </>
      )}
    </div>
  );
}
```

Note: the existing empty-state test asserts `await expect(page.locator('table')).not.toBeVisible();`. With this refactor the empty branch still renders the table shell with empty `<tbody>`. **Update that test now** to assert tbody is empty:

In `frontend/e2e/list.spec.ts`, find the "shows empty-state message when no transactions" test and replace its body with:

```ts
test('shows empty-state message when no transactions', async ({ page }) => {
  await clearFixture();
  await page.goto('/');
  await expect(page.getByText('No transactions')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});
```

- [ ] **Step 5: Run Playwright — all tests green**

Run: `cd frontend && npx playwright test`
Expected: all green, including the new skeleton test and updated empty-state test.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SkeletonRows.tsx frontend/src/routes/index.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
Add SkeletonRows; use in tbody during isPending

The list page now renders the table shell up-front and swaps tbody
content per query state. Empty state still shows "No transactions";
its e2e assertion now checks tbody row count instead of table visibility.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: `useDebouncedValue` hook

**Files:**
- Create: `frontend/src/lib/useDebouncedValue.ts`

This task lays the hook for Task 22 (debounced search). No test yet — Playwright covers the wired-up behavior in Task 22.

- [ ] **Step 1: Create the hook**

Create `frontend/src/lib/useDebouncedValue.ts`:

```ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/useDebouncedValue.ts
git commit -m "$(cat <<'EOF'
Add useDebouncedValue hook for the debounced search input

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 7 — FilterBar UI, sort, page size, debounce, amount, clear-filters

### Task 18: FilterBar with Type select; navigate on change; integration via list route

**Files:**
- Create: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test for the Type filter**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('Type filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Type').selectOption('Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  // Fixture: 60 rows / 5 types = 12 Buy rows, fits in one page.
  await expect(page.locator('tbody tr')).toHaveCount(12);
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "Type filter updates URL"`
Expected: FAIL — no `<select>` with label "Type" yet.

- [ ] **Step 3: Create the FilterBar with the Type select**

Create `frontend/src/components/FilterBar.tsx`:

```tsx
import type { ListSearch } from '../lib/listSearch';
import type { TransactionType } from '../api/transactions';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];

export function FilterBar({ value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-3">
      <label className="flex flex-col text-xs text-gray-600">
        <span>Type</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.type ?? ''}
          onChange={(e) =>
            onChange({ type: (e.target.value || undefined) as TransactionType | undefined })
          }
        >
          <option value="">All</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Render the FilterBar in the list route + reset page on change**

In `frontend/src/routes/index.tsx`:

- Add import: `import { FilterBar } from '../components/FilterBar';`
- Inside the outer `<div>` of `ListPage`'s return, **before** the `{isError ? ... : ...}` ternary, render:

```tsx
      <FilterBar
        value={search}
        onChange={(next) =>
          navigate({
            search: (prev) => ({ ...prev, ...next, page: 1 }),
          })
        }
      />
```

- [ ] **Step 5: Run Playwright — green**

Run: `cd frontend && npx playwright test -g "Type filter updates URL"`
Expected: PASS. All other tests still pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/src/routes/index.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
Add FilterBar with Type select; route updates URL + resets page on change

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Add Status select to the FilterBar

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('Status filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Status').selectOption('Pending');
  await expect(page).toHaveURL(/[?&]status=Pending(&|$)/);
  // Fixture: 60 rows / 3 statuses = 20 Pending rows → page 1 = 20.
  await expect(page.locator('tbody tr')).toHaveCount(20);
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "Status filter updates URL"`
Expected: FAIL.

- [ ] **Step 3: Extend the FilterBar**

In `frontend/src/components/FilterBar.tsx`, add the `TransactionStatus` import to the existing import line:

```tsx
import type { TransactionType, TransactionStatus } from '../api/transactions';
```

Below the `TYPES` constant, add:

```tsx
const STATUSES: readonly TransactionStatus[] = ['Pending', 'Settled', 'Cancelled'];
```

Inside the `<div>` of the FilterBar, after the Type `<label>`, append:

```tsx
      <label className="flex flex-col text-xs text-gray-600">
        <span>Status</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.status ?? ''}
          onChange={(e) =>
            onChange({ status: (e.target.value || undefined) as TransactionStatus | undefined })
          }
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
```

- [ ] **Step 4: Run Playwright — green**

Run: `cd frontend && npx playwright test -g "Status filter updates URL"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: add Status select

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Add date-range inputs to the FilterBar

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`

The backend tests cover behavior; the e2e cost-benefit of a date-pick assertion against a `<input type="date">` is poor (browser-specific date-picker UI). We add the UI without a new Playwright case here; the date-range URL contract is already proven server-side.

- [ ] **Step 1: Extend the FilterBar with date inputs**

In `frontend/src/components/FilterBar.tsx`, inside the `<div>`, after the Status `<label>`, append:

```tsx
      <label className="flex flex-col text-xs text-gray-600">
        <span>From</span>
        <input
          type="date"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.fromDate ?? ''}
          onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col text-xs text-gray-600">
        <span>To</span>
        <input
          type="date"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.toDate ?? ''}
          onChange={(e) => onChange({ toDate: e.target.value || undefined })}
        />
      </label>
```

- [ ] **Step 2: Type-check + run existing Playwright tests**

Run:
```
cd frontend && npx tsc --noEmit && npx playwright test
```
Expected: 0 type errors, all e2e tests still green.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FilterBar.tsx
git commit -m "$(cat <<'EOF'
FilterBar: add From/To date inputs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Sort dropdown on the FilterBar (combines `sortBy` + `sortDir`)

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test for sort dropdown**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('Sort dropdown changes URL and reorders rows by amount desc', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Sort').selectOption('amount:desc');
  await expect(page).toHaveURL(/[?&]sortBy=amount(&|$)/);
  await expect(page).toHaveURL(/[?&]sortDir=desc(&|$)/);

  // Fixture amounts grow with i (100 + i * 137.5), so the largest is from i=59.
  const firstAmount = await page.locator('tbody tr').first().locator('td').nth(5).textContent();
  const secondAmount = await page.locator('tbody tr').nth(1).locator('td').nth(5).textContent();
  // Compare numerically — strip currency suffix.
  const parse = (s: string | null) => parseFloat((s ?? '').replace(/[^\d.]/g, ''));
  expect(parse(firstAmount)).toBeGreaterThanOrEqual(parse(secondAmount));
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "Sort dropdown"`
Expected: FAIL — no `<select>` labelled "Sort" yet.

- [ ] **Step 3: Extend the FilterBar with a sort `<select>`**

In `frontend/src/components/FilterBar.tsx`, inside the `<div>` (after the To `<label>`), append:

```tsx
      <label className="flex flex-col text-xs text-gray-600">
        <span>Sort</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={`${value.sortBy}:${value.sortDir}`}
          onChange={(e) => {
            const [sortBy, sortDir] = e.target.value.split(':') as [
              'date' | 'amount',
              'asc' | 'desc',
            ];
            onChange({ sortBy, sortDir });
          }}
        >
          <option value="date:desc">Date (newest)</option>
          <option value="date:asc">Date (oldest)</option>
          <option value="amount:desc">Amount (high to low)</option>
          <option value="amount:asc">Amount (low to high)</option>
        </select>
      </label>
```

- [ ] **Step 4: Run Playwright — green**

Run: `cd frontend && npx playwright test -g "Sort dropdown"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: sort dropdown combining sortBy + sortDir

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Page-size selector + reset page on change

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('Page-size selector changes rows-per-page and resets page to 1', async ({ page }) => {
  await page.goto('/?page=2');
  await expect(page.getByText('Page 2 of 3')).toBeVisible();

  await page.getByLabel('Page size').selectOption('50');

  await expect(page).toHaveURL(/[?&]pageSize=50(&|$)/);
  await expect(page).toHaveURL(/[?&]page=1(&|$)/);
  // 60 rows / 50 per page → page 1 has 50.
  await expect(page.locator('tbody tr')).toHaveCount(50);
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "Page-size selector"`
Expected: FAIL.

- [ ] **Step 3: Add the page-size select to the FilterBar**

In `frontend/src/components/FilterBar.tsx`, near the top of the file, import the allowed page-size constant:

```tsx
import { ALLOWED_PAGE_SIZES } from '../lib/listSearch';
import type { ListSearch } from '../lib/listSearch';
```

Inside the `<div>` (after the Sort `<label>`), append:

```tsx
      <label className="flex flex-col text-xs text-gray-600">
        <span>Page size</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.pageSize}
          onChange={(e) => onChange({ pageSize: Number(e.target.value) })}
        >
          {ALLOWED_PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
```

The route's `onChange` already does `page: 1` reset — no extra logic required.

- [ ] **Step 4: Run Playwright — green**

Run: `cd frontend && npx playwright test -g "Page-size selector"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: page-size selector; route resets page on change

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: Debounced search input

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test — URL updates after 300ms**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('Search input debounces ~300ms before URL updates', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search').fill('AAPL');

  // Immediately: URL should NOT yet contain ?search=AAPL.
  await expect(page).not.toHaveURL(/[?&]search=AAPL(&|$)/);

  // After debounce window: URL should contain ?search=AAPL.
  await expect(page).toHaveURL(/[?&]search=AAPL(&|$)/, { timeout: 1000 });
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "Search input debounces"`
Expected: FAIL — no `<input>` labelled "Search".

- [ ] **Step 3: Wire the search input via the debounce hook**

In `frontend/src/components/FilterBar.tsx`, replace the import section at the top with:

```tsx
import { useEffect, useState } from 'react';
import { ALLOWED_PAGE_SIZES } from '../lib/listSearch';
import type { ListSearch } from '../lib/listSearch';
import type { TransactionType, TransactionStatus } from '../api/transactions';
import { useDebouncedValue } from '../lib/useDebouncedValue';
```

Add this block at the top of the `FilterBar` component body, before the `return`:

```tsx
  const [searchInput, setSearchInput] = useState(value.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    const current = value.search ?? '';
    if (trimmed === current) return;
    onChange({ search: trimmed.length > 0 ? trimmed : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
```

Inside the FilterBar `<div>`, add the search `<label>` (place it last so tab order goes: filters → search):

```tsx
      <label className="flex flex-col text-xs text-gray-600">
        <span>Search</span>
        <input
          type="text"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="account or symbol"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </label>
```

- [ ] **Step 4: Run Playwright — green**

Run: `cd frontend && npx playwright test -g "Search input debounces"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: debounced search input (~300ms) wired to URL

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: Verify "filter changes reset page to 1"

**Files:**
- Modify: `frontend/e2e/list.spec.ts`

Behavior already implemented (route's `onChange` callback in Task 18 set `page: 1` unconditionally). Add the explicit regression test.

- [ ] **Step 1: Add the test**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('changing a filter from page=2 returns to page=1', async ({ page }) => {
  await page.goto('/?page=2');
  await expect(page.getByText('Page 2 of 3')).toBeVisible();

  await page.getByLabel('Type').selectOption('Buy');

  await expect(page).toHaveURL(/[?&]page=1(&|$)/);
});
```

- [ ] **Step 2: Run — green**

Run: `cd frontend && npx playwright test -g "changing a filter from page=2"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
E2E: filter change from page=2 resets to page=1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: Right-aligned amount with Intl currency formatting

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Replace the Amount `<td>` with formatted/right-aligned version**

In `frontend/src/routes/index.tsx`, find:

```tsx
                    <td className="px-3 py-2">
                      {t.amount.toFixed(2)} {t.currency}
                    </td>
```

Replace with:

```tsx
                    <td className="px-3 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat('en-CA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(t.amount)}{' '}
                      {t.currency}
                    </td>
```

Also update the Amount header `<th>` to right-align:

Find:

```tsx
                <th className="px-3 py-2">Amount</th>
```

Replace with:

```tsx
                <th className="px-3 py-2 text-right">Amount</th>
```

- [ ] **Step 2: Run Playwright — all existing tests still pass**

Run: `cd frontend && npx playwright test`
Expected: green. Sort-by-amount test's amount parsing (`parseFloat` after stripping non-digits) is tolerant of commas, so it still works.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "$(cat <<'EOF'
List: right-align amount column with Intl formatting

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: Empty state with "Clear Filters" button when filters are active

**Files:**
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/e2e/list.spec.ts`

- [ ] **Step 1: Failing Playwright test**

Append to `frontend/e2e/list.spec.ts`:

```ts
test('empty state with active filter offers Clear Filters that restores rows', async ({ page }) => {
  await page.goto('/');
  // Apply a filter that yields zero rows: type=Buy AND search=does-not-exist
  await page.getByLabel('Type').selectOption('Buy');
  await page.getByLabel('Search').fill('zzzzz-not-found');
  await expect(page).toHaveURL(/[?&]search=zzzzz-not-found(&|$)/, { timeout: 2000 });

  await expect(page.getByText('No transactions match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear Filters' }).click();

  await expect(page).not.toHaveURL(/[?&]search=/);
  await expect(page).not.toHaveURL(/[?&]type=/);
  await expect(page.locator('tbody tr')).toHaveCount(25);
});
```

- [ ] **Step 2: Run — RED**

Run: `cd frontend && npx playwright test -g "empty state with active filter offers Clear Filters"`
Expected: FAIL.

- [ ] **Step 3: Implement the empty-state behavior**

In `frontend/src/routes/index.tsx`:

- Add imports near the top:

```tsx
import { DEFAULT_LIST_SEARCH, isAnyFilterActive } from '../lib/listSearch';
```

- Find the existing empty-state branch:

```tsx
          {!isPending && data.total === 0 && (
            <div className="mt-4 text-gray-600">No transactions</div>
          )}
```

- Replace with:

```tsx
          {!isPending && data.total === 0 && (
            <div className="mt-4 flex flex-col items-start gap-2 text-gray-600">
              {isAnyFilterActive(search) ? (
                <>
                  <div>No transactions match these filters</div>
                  <button
                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => navigate({ search: () => DEFAULT_LIST_SEARCH })}
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <div>No transactions</div>
              )}
            </div>
          )}
```

- [ ] **Step 4: Run Playwright — green**

Run: `cd frontend && npx playwright test`
Expected: all green, including the new clear-filters test and the existing "shows empty-state message when no transactions" test (which clears the fixture entirely → no filters active → plain "No transactions" still shown).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/index.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
Empty state: show Clear Filters button when any filter is active

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**CHECKPOINT (Phase 7):** `make check` if convenient — all backend tests + Playwright tests should be green.

---

# Phase 8 — Detail page + clickable rows

### Task 27: Failing detail e2e (clicked row navigates to detail; back returns to filtered list)

**Files:**
- Create: `frontend/e2e/detail.spec.ts`

- [ ] **Step 1: Create the spec with the failing tests**

Create `frontend/e2e/detail.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('row click navigates to detail page with all fields visible', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr').first().click();

  await expect(page).toHaveURL(/\/transactions\/\d+(\?.*)?$/);
  await expect(page.getByText('Account')).toBeVisible();
  await expect(page.getByText('Advisor')).toBeVisible();
  await expect(page.getByText('Date')).toBeVisible();
  await expect(page.getByText('Notes')).toBeVisible();
  // Status pill on detail page.
  await expect(page.locator('span').filter({ hasText: /Settled|Pending|Cancelled/ })).toBeVisible();
});

test('Back to list link returns to the same filtered URL', async ({ page }) => {
  await page.goto('/?type=Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  await page.locator('tbody tr').first().click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.getByRole('link', { name: /Back to list/ }).click();

  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
});

test('detail page shows "Transaction not found" for missing id', async ({ page }) => {
  await page.goto('/transactions/999999');
  await expect(page.getByText('Transaction not found')).toBeVisible();
  await expect(page.getByRole('link', { name: /list/i })).toBeVisible();
});
```

- [ ] **Step 2: Run — RED (compilation will succeed but routing/page is missing)**

Run: `cd frontend && npx playwright test detail.spec.ts`
Expected: all three fail — the detail route doesn't exist yet.

- [ ] **Step 3: Create the detail route**

Create `frontend/src/routes/transactions.$id.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransaction, transactionDetailKey } from '../api/transactions';
import { ApiError } from '../api/client';
import { listSearchSchema } from '../lib/listSearch';
import { StatusPill } from '../components/StatusPill';

export const Route = createFileRoute('/transactions/$id')({
  validateSearch: listSearchSchema.parse,
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const numericId = Number(id);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: transactionDetailKey(numericId),
    queryFn: ({ signal }) => fetchTransaction(numericId, signal),
    retry: false,
  });

  const backLink = (
    <Link
      to="/"
      search={(prev) => prev}
      className="text-sm text-blue-700 hover:underline"
    >
      ← Back to list
    </Link>
  );

  if (isPending) {
    return (
      <div>
        <div className="mb-4">{backLink}</div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <div className="mb-4">{backLink}</div>
        {is404 ? (
          <div className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-700">
            <div className="mb-2 font-medium">Transaction not found</div>
            <Link to="/" search={() => ({ page: 1, pageSize: 25, sortBy: 'date', sortDir: 'desc' })} className="text-blue-700 hover:underline">
              Return to the list
            </Link>
          </div>
        ) : (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
            <div className="mb-2 font-medium">Couldn't load the transaction</div>
            <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  const t = data;
  return (
    <div>
      <div className="mb-4">{backLink}</div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t.accountId}</h2>
        <div className="text-sm text-gray-600">{t.advisorName}</div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-gray-500">Date</dt>
        <dd>{t.transactionDate}</dd>

        <dt className="text-gray-500">Account</dt>
        <dd>{t.accountId}</dd>

        <dt className="text-gray-500">Advisor</dt>
        <dd>{t.advisorName}</dd>

        <dt className="text-gray-500">Type</dt>
        <dd>{t.type}</dd>

        <dt className="text-gray-500">Symbol</dt>
        <dd>{t.securitySymbol ?? '—'}</dd>

        <dt className="text-gray-500">Amount</dt>
        <dd className="tabular-nums">
          {new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)}{' '}
          {t.currency}
        </dd>

        <dt className="text-gray-500">Status</dt>
        <dd>
          <StatusPill status={t.status} />
        </dd>

        <dt className="text-gray-500">Created at</dt>
        <dd>{t.createdAt}</dd>
      </dl>
      <div className="mt-6">
        <div className="mb-1 text-sm text-gray-500">Notes</div>
        <div className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-800">
          {t.notes ?? <span className="text-gray-400">No notes</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Regenerate route tree (TanStack Router plugin does this automatically on dev)**

Run: `cd frontend && npx tsc --noEmit`
If the auto-generated `src/routeTree.gen.ts` doesn't pick up the new route, run the dev server briefly:

```
cd frontend && npm run dev
```

Wait until the console prints "Generated route tree", then Ctrl+C. Then re-run `npx tsc --noEmit`.

Expected: 0 errors.

- [ ] **Step 5: Wire row click on the list page**

In `frontend/src/routes/index.tsx`:

- Replace the existing `data.data.map(...)` row block:

```tsx
                  data.data.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100">
```

with:

```tsx
                  data.data.map((t) => (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                      onClick={() => navigate({ to: '/transactions/$id', params: { id: String(t.id) }, search: (prev) => prev })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          navigate({ to: '/transactions/$id', params: { id: String(t.id) }, search: (prev) => prev });
                        }
                      }}
                    >
```

- [ ] **Step 6: Run all e2e tests — green**

Run: `cd frontend && npx playwright test`
Expected: all green, including all three detail tests and all earlier list tests (row click does not break filter tests because `getByLabel('Type').selectOption(...)` targets the filter bar, not table rows).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/transactions.$id.tsx frontend/src/routes/index.tsx frontend/src/routeTree.gen.ts frontend/e2e/detail.spec.ts
git commit -m "$(cat <<'EOF'
Detail page route + clickable rows; Back link preserves list filters

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 28: Final cleanup — lint, format, full check, summary

**Files:**
- Possibly none, depending on what `make check` surfaces

- [ ] **Step 1: Run full check suite**

Run: `make check`
Expected: 0 lint errors, 0 format diffs, 0 type errors, all backend tests pass, all Playwright tests pass.

If `make check` reports formatting drift, run the formatter and commit:

```
cd backend && dotnet format
cd frontend && npx prettier --write .
```

- [ ] **Step 2: Resolve any cleanups**

If any cleanups are required, fix them, run `make check` again, then commit:

```bash
git add -A
git commit -m "$(cat <<'EOF'
Cleanup: lint + format pass for sub-project 2

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Print the final summary**

Report to the user:

- Number of commits since the spec commit (`git log --oneline 8ce0cc1..HEAD | wc -l`).
- Test counts: `cd backend && dotnet test --logger:"console;verbosity=minimal"` and `cd frontend && npx playwright test --reporter=list`.
- Any deferred follow-ups discovered during implementation.

---

## Self-Review

**Spec coverage (each requirement → which task):**

- FluentValidation adoption → Tasks 1, 2.
- `SortField` / `SortDirection` enums → Task 3.
- Sort switch + 4 sort cases → Task 4 (unit) + Task 5 (integration).
- Type filter → Task 6.
- Status filter → Task 7.
- Date range filter + `dateRange` validation rule + 400 → Task 8.
- Search filter (account OR symbol, case-insensitive, empty=no-op) → Task 9.
- `NotFoundException` + 404 Problem Details mapping → Task 10.
- `TransactionDetailDto` + `GetTransactionHandler` → Task 11.
- `GET /api/transactions/{id}` controller + 200/404 integration → Task 12.
- API client extension + detail fetcher → Task 13.
- Shared search schema + route plumbing → Task 14.
- `StatusPill` component → Task 15.
- `SkeletonRows` component → Task 16.
- `useDebouncedValue` hook → Task 17.
- `FilterBar` Type select → Task 18.
- Status select → Task 19.
- Date inputs → Task 20.
- Sort dropdown → Task 21.
- Page-size selector + page reset → Task 22.
- Debounced search → Task 23.
- Page reset on filter change → Task 24 (explicit regression).
- Right-aligned amount with Intl formatting → Task 25.
- Empty state with Clear Filters → Task 26.
- Detail route + clickable rows + Back preserves filters + 404 detail state → Task 27.
- Final lint/format/tests cleanup → Task 28.

**Placeholder scan:** No "TBD", "TODO", "fill in", or "similar to Task N" deferrals. Each step shows the exact code.

**Type consistency:**

- `listSearchSchema` defined in Task 14; consumed by Task 27's detail route (same file path).
- `transactionsKey(params: ListTransactionsParams)` signature defined in Task 13; used unchanged by Task 14's route and not re-defined elsewhere.
- `StatusPill` props `{ status: TransactionStatus }` defined in Task 15; reused unchanged in Task 27's detail page.
- `FilterBar`'s `onChange` partial-update contract `(next: Partial<ListSearch>) => void` defined in Task 18; every subsequent task that extends the bar (19, 20, 21, 22, 23) calls `onChange(...)` with object literals whose keys are valid `ListSearch` properties.
- `NotFoundException` constructor `(string resource, object key)` defined in Task 10; matched by `throw new NotFoundException("Transaction", id)` in Task 11 and asserted with `ex.Which.Resource.Should().Be("Transaction")` in Task 11.
- Backend `SortField` / `SortDirection` enum names match the route's lowercase string union via ASP.NET's case-insensitive enum model binding.

**Scope check:** One sub-project, one plan. Backend and frontend halves are interleaved by phase but share commits only within their respective layers. Each commit ships one behavior with its test. Estimated 28 commits; estimated 4-6 hours of focused implementation.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-13-sub-project-2-filters-sort-detail.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
