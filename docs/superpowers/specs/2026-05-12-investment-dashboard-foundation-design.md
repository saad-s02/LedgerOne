# Investment Dashboard — Sub-project 1: Foundation + Thin List Slice

**Spec for implementation. Date: 2026-05-12. Branch: `claude/add-dashboard-prd-zPf4J`.**

## Decomposition Context

The PRD (`PRD.md`) describes three subsystems. This spec covers **sub-project 1 of 3** under decomposition approach C (foundation + thin vertical, then layered):

1. **Sub-project 1 (this spec):** Both runtime scaffolds, full data model, EF Core + SQLite, dev seed, and a single working end-to-end paginated list (no filters, no sort selector, no detail view).
2. **Sub-project 2 (deferred):** Filters (date range, type, status, search with debounce), sort selector, page-size selector, URL-driven state, detail route + page, status pills, skeleton rows, FluentValidation.
3. **Sub-project 3 (deferred):** Chat endpoint, agent tools, ReAct loop, chat UI drawer.

Each sub-project gets its own spec → plan → implementation cycle.

## Goal

Stand up both runtimes, the data layer, and one paginated end-to-end vertical slice so every integration point (CORS, dev proxy, JSON envelope, error mapping, TanStack Query wiring, EF Core migrations, Playwright `webServer`) is proven before sub-project 2 layers features on top.

## Overrides to PRD

- **PRD §3 Non-Goal "Full test coverage" is OVERRIDDEN.** Sub-project 1 (and all subsequent sub-projects) follow **full TDD**: every behavior gets a failing test first. Backend logic via xUnit; user-facing flows via Playwright e2e. Frontend component-level unit tests are skipped (covered by e2e).

## Scope of Sub-project 1

### In scope

**Backend (`LedgerOne.Api`):**
- Full `Transaction` entity with all PRD §5 fields.
- `AppDbContext` with composite index `IX_Transactions_Status_Date` and `IX_Transactions_AccountId` (PRD §5).
- Real EF Core migrations (not `EnsureCreated`).
- Bogus dev seed: 8K rows, 50 advisors, 500 accounts, 24-month date range, with deterministic Random seed (`Randomizer.Seed = new Random(42)`). Runs on app startup if `Transactions` table is empty.
- Single endpoint: `GET /api/transactions?page=&pageSize=` returning the full PRD §7 response envelope (`data`, `total`, `page`, `pageSize`, `totalPages`).
- Server-side default sort: `TransactionDate DESC`.
- Validation: `page ≥ 1`, `1 ≤ pageSize ≤ 100`; invalid → 400 RFC 7807 Problem Details.
- `GET /health` for Playwright readiness check.
- `POST /api/test/seed` — mapped only when `ASPNETCORE_ENVIRONMENT=Testing`; truncates and re-seeds the fixture data set.
- Serilog: structured console sink, request correlation IDs via middleware.
- Problem Details: `AddProblemDetails()` + `UseExceptionHandler` with a custom `IExceptionHandler` for unhandled exceptions; validation errors mapped to 400.
- CORS: allow `http://localhost:5173` in Development only.
- Enum JSON serialization via `JsonStringEnumConverter`.

**Frontend (`frontend/`):**
- Vite + React 19 + TypeScript (strict) + Tailwind v4 + TanStack Router + TanStack Query.
- Single route: `/` (no detail page yet).
- Table renders the 7 PRD columns as plain text: Date | Account | Advisor | Type | Symbol | Amount | Status. No pill colors, no row click handler, no right-alignment-with-currency styling.
- Pagination UI: Prev | "Page X of Y" | Next. No page-size selector.
- States: "Loading…" plain text (no skeleton rows yet), error banner with Retry button, empty "No transactions" message.
- `VITE_API_BASE_URL` env var, default `http://localhost:5000`.
- TanStack Router search-param state for `page` (resilient to refresh — sub-project 2 will expand this for all filters).

**Tests:**
- xUnit v3 + FluentAssertions + Verify (snapshot tests for response envelopes).
- Backend integration: `WebApplicationFactory<Program>` with fresh SQLite file per test class, fixture data (~50 rows) loaded via test base class.
- Backend unit: handler tested directly with a test DbContext.
- Frontend e2e: Playwright (Chromium only) with `webServer` config spinning up both `dotnet run` (Testing env) and `npm run dev`.

### Explicitly out of scope (deferred to sub-project 2)
Filters (date range, type, status, search), sort selector, page-size selector, debouncing, detail route + page, status pills, skeleton rows, FluentValidation, right-aligned amount + currency formatting.

### Explicitly out of scope (deferred to sub-project 3)
Chat endpoint, agent tools, ReAct loop, chat UI drawer, model integration.

## Architecture (Approach A — Thin controllers + Handler classes, no MediatR)

```
LedgerOne/
├── PRD.md
├── docs/superpowers/specs/
├── Makefile                              # `make dev`, `make test`, `make check`
├── backend/
│   ├── LedgerOne.slnx
│   ├── Directory.Build.props             # nullable, ImplicitUsings, treat warnings as errors
│   ├── Directory.Packages.props          # central package management
│   ├── LedgerOne.Api/
│   │   ├── Controllers/
│   │   │   └── TransactionsController.cs # thin: routes, model binding, status codes
│   │   ├── Features/Transactions/
│   │   │   └── ListTransactions.cs       # Handler: request/response records + EF query
│   │   ├── Domain/
│   │   │   └── Transaction.cs            # entity + enums (TransactionType, TransactionStatus, Currency)
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Migrations/               # EF Core migrations
│   │   │   └── Seeding/
│   │   │       ├── DevSeeder.cs          # Bogus 8K rows
│   │   │       └── TestSeeder.cs         # deterministic ~50-row fixture
│   │   ├── Infrastructure/
│   │   │   ├── ProblemDetails/
│   │   │   │   └── GlobalExceptionHandler.cs
│   │   │   └── Logging/
│   │   │       └── CorrelationIdMiddleware.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── Program.cs
│   │   └── LedgerOne.Api.csproj
│   └── LedgerOne.Api.Tests/
│       ├── Unit/
│       │   └── ListTransactionsHandlerTests.cs
│       ├── Integration/
│       │   ├── TransactionsEndpointTests.cs
│       │   ├── ApiFactory.cs             # WebApplicationFactory<Program>
│       │   └── DatabaseFixture.cs        # fresh SQLite per test class
│       ├── Snapshots/                    # Verify .verified.txt files
│       └── LedgerOne.Api.Tests.csproj
└── frontend/
    ├── src/
    │   ├── routes/
    │   │   ├── __root.tsx
    │   │   └── index.tsx                 # list page (thin slice)
    │   ├── api/
    │   │   ├── client.ts                 # base fetcher with error mapping
    │   │   └── transactions.ts           # typed fetchers + query keys
    │   ├── lib/
    │   │   └── queryClient.ts
    │   ├── main.tsx
    │   └── styles.css                    # Tailwind v4 entry
    ├── e2e/
    │   ├── list.spec.ts                  # Playwright tests
    │   └── helpers/
    │       └── seed.ts                   # calls POST /api/test/seed
    ├── playwright.config.ts
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── index.html
```

### Handler pattern

```
TransactionsController.List([FromQuery] ListTransactionsRequest req, CancellationToken ct)
  → ListTransactionsHandler.Handle(req, ct)
    → throws ValidationException if page < 1 or pageSize ∉ [1, 100]
    → otherwise returns ListTransactionsResponse (data, total, page, pageSize, totalPages)
TransactionsController returns 200 OK with the response.
ValidationException is caught by GlobalExceptionHandler and mapped to 400 Problem Details with
a `errors` field listing the invalid fields.
```

The handler is a plain class taking `AppDbContext` via DI. It contains all EF query logic, validation, and DTO projection. This makes the handler directly callable from the sub-project 3 agent tools (no HTTP round-trip needed), and keeps the controller trivially thin (single `await handler.Handle` call).

`ValidationException` is a project-internal type (NOT `FluentValidation.ValidationException` — we deferred that dep). It carries a `Dictionary<string, string[]>` of field → error messages, which `GlobalExceptionHandler` projects into the RFC 7807 `errors` extension property.

## Tech Stack Decisions (frozen)

| # | Decision | Choice |
|---|---|---|
| 1 | Repo layout | Monorepo: `backend/` + `frontend/` at repo root |
| 2 | .NET solution format | `.slnx` |
| 3 | .NET project breakdown | `LedgerOne.Api` + `LedgerOne.Api.Tests` (2 projects) |
| 4 | Frontend layout | Single Vite app at `frontend/` |
| 5 | .NET version | .NET 10 |
| 6 | API style | Controllers (attribute-routed) |
| 7 | ORM & DB | EF Core + SQLite, real migrations |
| 8 | Logging | Serilog (console sink), correlation IDs middleware |
| 9 | Problem Details | Built-in `AddProblemDetails` + `UseExceptionHandler` + custom `IExceptionHandler` |
| 10 | Validation (sub-project 1) | Manual in handler (only `page`/`pageSize`) |
| 11 | Frontend language | TypeScript, strict mode |
| 12 | Routing | TanStack Router |
| 13 | URL state | TanStack Router search params |
| 14 | Styling | Tailwind v4 |
| 15 | Component library | Plain Tailwind (no shadcn yet) |
| 16 | HTTP | `fetch` + TanStack Query |
| 17 | Backend test framework | xUnit v3 + FluentAssertions + Verify |
| 18 | Backend integration tests | `WebApplicationFactory<Program>` + fresh SQLite file per test class |
| 19 | Frontend e2e | Playwright (Chromium only) |
| 20 | Frontend unit tests | Vitest (pure functions only; skipped for sub-project 1) |
| 21 | Playwright `webServer` | Spins up both `dotnet run` (Testing env) and `npm run dev`; waits on `/health` |
| 22 | Test data | Bogus 8K (dev), ~50-row fixture (tests), Bogus deterministic seed (`Random(42)`) |
| 23 | Dev orchestration | Plain two-terminal + `make dev` (concurrently) |
| 24 | CORS | API allows `http://localhost:5173` in Development |
| 25 | API base URL | `VITE_API_BASE_URL`, default `http://localhost:5000` |
| 26 | Entity scope | Full `Transaction` entity with all PRD fields from day one |
| 27 | Dev seed | 8K rows, 50 advisors, 500 accounts, 24-mo range, deterministic |
| 28 | SQLite file | `backend/LedgerOne.Api/ledgerone.db` (gitignored) |
| 29 | Endpoint scope | `GET /api/transactions?page=&pageSize=` only |
| 30 | Response envelope | Full PRD shape: `data`, `total`, `page`, `pageSize`, `totalPages` |
| 31 | Validation rules | `page ≥ 1`, `1 ≤ pageSize ≤ 100`, else 400 |
| 32 | Enum serialization | Strings via `JsonStringEnumConverter` |
| 33 | Healthcheck | `GET /health` returns 200 OK |
| 34 | Frontend routes | Single `/` route |
| 35 | Table | All 7 PRD columns as plain text |
| 36 | Pagination UI | Prev / "Page X of Y" / Next only |
| 37 | UI states | Plain "Loading…" text, error banner with Retry, "No transactions" empty |
| 38 | Branch | `claude/add-dashboard-prd-zPf4J` |
| 39 | Commit cadence | One commit per behavior (test + impl together) |
| 40 | Pre-commit hooks | None (no Husky); `make check` documented |
| 41 | Push cadence | After each sub-project, not per commit |

## Data Layer

### Transaction entity (matches PRD §5)

```csharp
public class Transaction
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string AccountId { get; set; } = default!;     // "ACCT-NNNNN"
    public string AdvisorName { get; set; } = default!;
    public TransactionType Type { get; set; }              // Buy, Sell, Fee, Transfer, Dividend
    public string? SecuritySymbol { get; set; }
    public decimal Amount { get; set; }                    // decimal(18,2)
    public Currency Currency { get; set; }                 // CAD, USD
    public TransactionStatus Status { get; set; }          // Pending, Settled, Cancelled
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### Indexes (per PRD §5)

- `IX_Transactions_Status_Date` composite `(Status, TransactionDate DESC)`
- `IX_Transactions_AccountId` on `AccountId`

### Dev seed plan (per PRD §9)

8K rows, 50 advisors, 500 accounts, 24-month back date range, type distribution 35/25/20/15/5 (Buy/Sell/Dividend/Fee/Transfer), status 80/15/5 (Settled/Pending/Cancelled), 30 rotating symbols, log-normal amounts $50–$250,000, 70% CAD / 30% USD, ~30% with Notes, rest null. Deterministic Bogus seed.

### Test fixture (~50 rows)

Deterministic, hand-shaped to cover edge cases for sub-project 2's filter coverage later:
- Span at least 3 months
- All 5 types represented
- All 3 statuses represented
- At least one row with null `SecuritySymbol` (Fee or Transfer)
- At least one row with null `Notes`
- Account IDs in a small set (5-10) for search-coverage later

Loaded by `TestSeeder.SeedAsync(AppDbContext)`. Truncate-and-reseed exposed via `POST /api/test/seed` (Testing env only).

## API Specification (sub-project 1 subset)

### `GET /api/transactions`

Query params:

| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | int | no | 1 | `≥ 1`, else 400 |
| `pageSize` | int | no | 25 | `1 ≤ x ≤ 100`, else 400 |

Response 200 (camelCase, enums as strings):

```json
{
  "data": [
    {
      "id": 1234,
      "transactionDate": "2026-04-15T10:23:00Z",
      "accountId": "ACCT-04827",
      "advisorName": "Sarah Chen",
      "type": "Buy",
      "securitySymbol": "AAPL",
      "amount": 12500.00,
      "currency": "CAD",
      "status": "Settled"
    }
  ],
  "total": 8000,
  "page": 1,
  "pageSize": 25,
  "totalPages": 320
}
```

Errors: 400 / 500 RFC 7807 Problem Details with `traceId`.

### `GET /health`

Returns 200 OK with `{ "status": "Healthy" }`. Used by Playwright `webServer` readiness probe.

### `POST /api/test/seed` (Testing env only)

Truncates `Transactions` and re-runs `TestSeeder`. Returns 204. Endpoint is not mapped at all outside Testing env (so requests return 404 in Dev/Prod).

### `POST /api/test/clear` (Testing env only)

Truncates `Transactions` without re-seeding. Returns 204. Used by the empty-state e2e test. Same env gating as `/test/seed`.

## Frontend Specification (sub-project 1 subset)

### Route `/`

- Reads `?page=N` from URL via TanStack Router search params (validated via Zod schema in the route).
- Fetches via TanStack Query: `useQuery({ queryKey: ['transactions', { page, pageSize: 25 }], queryFn: ... })`.
- States:
  - `isPending`: render "Loading…" centered.
  - `isError`: render red banner "Couldn't load transactions" + Retry button (calls `refetch`).
  - `data && data.total === 0`: render "No transactions" centered.
  - `data && data.total > 0`: render table + pagination controls.
- Pagination:
  - Prev disabled when `page === 1`.
  - Next disabled when `page === totalPages`.
  - "Page X of Y" between buttons.
  - Clicking updates the URL search param, which re-triggers the query.

### Table columns (plain text only)

Date | Account | Advisor | Type | Symbol | Amount | Status

`Symbol` shows `—` when null. `Date` rendered as ISO date (no fancy formatting yet — sub-project 2).

## Testing Strategy

### TDD discipline

Every behavior follows red → green → refactor:
1. Write the failing test that asserts the behavior.
2. Run it, confirm it fails for the right reason.
3. Write the minimum implementation to make it pass.
4. Refactor if needed; tests stay green.
5. Commit (test + impl in one commit, message describes the behavior).

### Backend test catalogue (sub-project 1)

**Unit (`ListTransactionsHandlerTests`):**
1. Returns `total = count of all rows` regardless of page.
2. Default `page = 1`, `pageSize = 25` when not specified.
3. Returns correct slice for `page = 2, pageSize = 25` (rows 26–50 in default sort order).
4. `totalPages = ceil(total / pageSize)`.
5. Default sort is `TransactionDate DESC`.
6. Empty DB returns `total = 0`, `data = []`, `totalPages = 0`.
7. `page` exceeding `totalPages` returns empty `data`, correct `total`.

**Integration (`TransactionsEndpointTests` via `WebApplicationFactory`):**
1. `GET /api/transactions` returns 200 with response shape matching Verify snapshot.
2. `GET /api/transactions?page=0` returns 400 Problem Details.
3. `GET /api/transactions?pageSize=0` returns 400 Problem Details.
4. `GET /api/transactions?pageSize=101` returns 400 Problem Details.
5. `GET /health` returns 200.
6. Unhandled exception path produces 500 Problem Details with `traceId` (use a test-only endpoint or fault injection).

### Frontend e2e catalogue (sub-project 1)

Playwright tests against the real running stack (backend in Testing env, fixture seed):

1. **List loads:** visit `/`, expect table with 7 columns and at least one row.
2. **Pagination:** clicking Next changes URL to `?page=2` and updates rows; Prev returns to page 1.
3. **Prev disabled on page 1; Next disabled on last page.**
4. **Loading state:** intercept the API call with delay, expect "Loading…" visible before rows.
5. **Error state:** intercept the API call with 500, expect red banner with Retry; click Retry restores rows.
6. **Empty state:** call `POST /api/test/clear`, reload `/`, expect "No transactions" message.

### Test data flow

- **Unit tests:** in-memory SQLite (`Microsoft.Data.Sqlite` with `:memory:` keep-alive) per test class. Hand-built rows.
- **Integration tests:** real SQLite file per test class, `TestSeeder` loads fixture once per class.
- **Playwright e2e:** Playwright `webServer` config starts `dotnet run --environment Testing` (with a separate `ledgerone.test.db` SQLite file) and `npm run dev`; `globalSetup` calls `POST /api/test/seed` before tests run.

### Verify snapshots

`Snapshots/TransactionsEndpointTests.list_default.verified.txt` captures the full response envelope with the fixture data, so any field-shape regression is caught.

## Dev Workflow

### Commands

- `make dev` — runs both `dotnet run --project backend/LedgerOne.Api` and `npm --prefix frontend run dev` concurrently. Exits both on Ctrl+C.
- `make test` — runs `dotnet test backend/` + `npx playwright test --config frontend/playwright.config.ts`.
- `make check` — runs `dotnet format --verify-no-changes` + `eslint` + `prettier --check` + `tsc --noEmit` + `make test`.

### Configuration

- `appsettings.json` declares default Serilog config + connection string `Data Source=ledgerone.db`.
- `appsettings.Development.json` enables CORS for `http://localhost:5173`.
- Frontend `.env.development` sets `VITE_API_BASE_URL=http://localhost:5000`.
- `.gitignore` excludes `*.db`, `node_modules`, `bin`, `obj`, `dist`, `.playwright`.

### Git

- Branch: `claude/add-dashboard-prd-zPf4J`.
- One commit per TDD behavior (test + implementation together).
- Push after sub-project 1 completion (not per commit).

## Build Order Within Sub-project 1

This list seeds the implementation plan (handed off to writing-plans next):

1. Repo scaffolding: `Makefile`, `.gitignore`, `backend/`, `frontend/`, `Directory.Build.props`, `Directory.Packages.props`, `LedgerOne.slnx`.
2. Backend project: `LedgerOne.Api` minimal Program.cs with `/health`. Failing Playwright-style test (or curl test) first.
3. Backend test project: `LedgerOne.Api.Tests` with first integration test for `/health`.
4. Domain: `Transaction` entity + enums.
5. Data: `AppDbContext` + first migration + indexes.
6. Test seeder: `TestSeeder` + `POST /api/test/seed` (Testing env only).
7. Handler: `ListTransactionsHandler` TDD — implement each unit test listed above.
8. Controller: `TransactionsController.List` thin route + 400 mapping for validation errors.
9. Problem Details: `GlobalExceptionHandler` + correlation ID middleware + Serilog config.
10. Dev seed: `DevSeeder` with Bogus.
11. Frontend scaffold: Vite + React + TS + Tailwind + TanStack Router + Query.
12. Frontend e2e config: Playwright with `webServer` block running both servers.
13. Frontend e2e tests for list page (write all 6 before any UI).
14. Frontend list page: route, query, table, pagination, states (implement each behavior to its e2e test).
15. CORS finalization, Verify snapshot approval, lint/format cleanup.
16. Commit + push branch.

## Risks & Mitigations

- **Playwright `webServer` race:** backend may not be ready when frontend connects → use `webServer.url: http://localhost:5000/health` with `reuseExistingServer: false` and `timeout: 60000`.
- **SQLite migration on test runs:** each test class gets a fresh DB file → `ApiFactory` deletes any prior file in its constructor.
- **Bogus determinism:** `Randomizer.Seed = new Random(42)` must be set before the `Faker` is constructed, not after.
- **Tailwind v4 ecosystem flux:** if v4 PostCSS integration causes friction, fall back to Tailwind v3.4 (documented as fallback, not changed mid-build).
- **.NET 10 availability on reviewer machine:** add a `global.json` pinning the SDK version so `dotnet --version` matches what the project targets. README documents how to install if missing.

## Open items deferred (not blocking sub-project 1)

- Decision between Azure OpenAI vs Anthropic Claude for sub-project 3 — defer until sub-project 3 brainstorming.
- Cursor pagination — out of scope for entire take-home (PRD §11 calls this out).
- Multi-tenant model — out of scope (PRD §11).
- Authentication — out of scope (PRD §3).
