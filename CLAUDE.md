# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LedgerOne is an investment-transactions dashboard. The implementation covers three layers, all landed on this branch:

1. **Foundation** — data model, migrations, seeding, paginated list endpoint and view.
2. **Query UX** — filters, sort, detail view, status pills, debounced search, URL-driven state.
3. **AI agent** — `/api/chat` endpoint, read-only tools over the existing handlers, manual ReAct loop.

`PRD.md` is the product spec. `docs/superpowers/specs/` and `docs/superpowers/plans/` hold the design and the implementation plan that produced the current code; consult them before extending the architecture so changes stay consistent with the established patterns.

## Commands

All commands run from the repo root via Make (the Makefile uses POSIX shell — on Windows use Git Bash / WSL, or run the underlying commands directly per the README).

| Goal | Command |
| --- | --- |
| Run both servers (Ctrl+C exits both) | `make dev` |
| Backend only (http://localhost:5000) | `make backend-dev` |
| Frontend only (http://localhost:5173) | `make frontend-dev` |
| All tests (backend + Playwright) | `make test` |
| Format + lint + type-check + tests | `make check` |
| Backend tests only | `cd backend && dotnet test` |
| Single backend test | `cd backend && dotnet test --filter "FullyQualifiedName~TransactionsEndpointTests.Get_Transactions_Default_Returns200WithEnvelope"` |
| Frontend e2e only | `cd frontend && npx playwright test` |
| Single Playwright test | `cd frontend && npx playwright test -g "Next button advances"` |
| Frontend lint/format/types | `cd frontend && npx eslint . && npx prettier --check . && npx tsc --noEmit` |
| Backend format check | `cd backend && dotnet format --verify-no-changes` |

First-time setup:

- .NET 10 SDK, Node 22+, npm 10+.
- `cd frontend && npx playwright install chromium` (once).

Playwright spins up **both** the backend (in `Testing` env on :5000) and the Vite dev server (:5173) itself — don't pre-start them, just run `npx playwright test`.

## Architecture

### Backend (`backend/LedgerOne.Api`)

- **.NET 10, ASP.NET Core (controllers), EF Core + SQLite, Serilog.** `TreatWarningsAsErrors=true` is set via `Directory.Build.props`; new warnings break the build.
- **Handler pattern.** Controllers are deliberately thin pass-throughs (see `Controllers/TransactionsController.cs`). The real work — query, DTO projection, validation — lives in feature handlers (e.g. `Features/Transactions/ListTransactionsHandler.cs`). This shape exists so the AI agent's tool layer can call handlers directly without going through HTTP (see `Features/Chat/TransactionTools.cs`). **When adding a feature, put logic in a handler, not the controller.**
- **Problem Details everywhere.** Errors flow through `Infrastructure/ProblemDetails/GlobalExceptionHandler.cs` and `AddProblemDetails()`. Validation errors come from `Infrastructure/Validation/ValidationException.cs`. Every response carries `X-Correlation-Id` (via `Infrastructure/Logging/CorrelationIdMiddleware.cs`) and the same id appears as `traceId` in problem-details bodies and in Serilog scope.
- **Three environments**, each with its own DB and behavior in `Program.cs`:
  - `Development` — applies migrations, seeds 8k Bogus rows into `ledgerone.db` if empty, enables CORS for `localhost:5173`.
  - `Testing` — applies migrations, **wipes** transactions on startup, enables CORS, exposes `/api/test/seed` and `/api/test/clear` (gated 404 in non-Testing envs).
  - `Production` — migrations only; no seeding, no test endpoints, no CORS.
- **Real EF Core migrations** (not `EnsureCreated`). Composite `(Status, TransactionDate DESC)` and `(AccountId)` indexes are declared in `Data/AppDbContext.cs` and materialized in `Data/Migrations/`. To add a column or table: add the property to the entity, configure it in `OnModelCreating`, then `cd backend/LedgerOne.Api && dotnet ef migrations add <Name>`.
- **JSON shape:** camelCase property names + `JsonStringEnumConverter` (enums serialize as their name, not int). Frontend types in `frontend/src/api/transactions.ts` mirror these.

### Frontend (`frontend`)

- **Vite + React 19 + TypeScript, Tailwind v4, TanStack Router (file-based), TanStack Query.**
- **File-based routing** via `@tanstack/router-plugin`. Routes live in `src/routes/`; `src/routeTree.gen.ts` is generated and is `globalIgnores`'d in ESLint — do not edit it by hand.
- **Route files export `Route` alongside the component.** The ESLint config in `frontend/eslint.config.js` whitelists `Route` for `react-refresh/only-export-components` specifically inside `src/routes/**`. Don't move route definitions out of that directory or the rule will fire.
- **Search params are zod-validated** inside `createFileRoute({ validateSearch })` (see `src/routes/index.tsx`). Treat the parsed search object as the source of truth for URL state — pagination, future filters, etc. — and navigate by updating it, not by holding React state.
- **API client** is a thin `fetch` wrapper in `src/api/client.ts` keyed off `VITE_API_BASE_URL` (default `http://localhost:5000`, set in `.env.development`). Per-feature modules under `src/api/` export a query-key factory plus a fetcher; pass the React Query `signal` through so requests cancel on navigation.

### Tests

- **Backend** uses xUnit v3 + FluentAssertions + Verify (snapshots under `backend/LedgerOne.Api.Tests/Integration/Snapshots/`). Each integration test class hosts the API via `ApiFactory : WebApplicationFactory<Program>`, which forces the `Testing` environment and points the connection string at a fresh temp-file SQLite DB per fixture (created in `Path.GetTempPath()`, deleted on dispose). Unit tests under `Tests/Unit/` exercise handlers against an in-memory EF context directly.
- **Frontend** uses Playwright. Tests share a single browser worker (`fullyParallel: false, workers: 1`) and seed via the API helpers in `e2e/helpers/api.ts` (which hit `/api/test/seed` and `/api/test/clear`). The fixture seeded by `TestSeeder.cs` is exactly **60 deterministic rows** — assertions like "25 rows on page 1, 3 pages total" depend on that number.
- **TDD discipline.** The README states every behavior gets a failing test first; preserve that pattern when adding features.

## Conventions worth knowing

- `Program.cs` ends with `public partial class Program;` so `WebApplicationFactory<Program>` can reference it from the test project — don't remove that line.
- Test endpoints (`/api/test/*`) are gated by environment in `Program.cs`. If you add another test-only endpoint, put it under `/api/test/` and it inherits the gate; otherwise add your own guard.
- Snapshot tests use Verify with `UseDirectory("Snapshots")`. On intentional output changes, review the `.received.txt` and rename it to `.verified.txt` (don't blindly accept).
- The Makefile assumes `make` + a POSIX-ish shell. On native Windows PowerShell, prefer the explicit `cd backend && dotnet ...` / `cd frontend && npx ...` invocations from the README.
