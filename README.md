# LedgerOne — Investment Transactions Dashboard

PriceMetrix take-home built on the React + .NET + SQL stack. See `PRD.md` for the
product spec and `docs/superpowers/specs/` for the implementation design.

This is **sub-project 1 of 3** (foundation + paginated list view). Filters,
detail view, and the AI agent are scoped to subsequent sub-projects.

## Stack

- **Backend:** .NET 10, ASP.NET Core (controllers), EF Core + SQLite, Serilog,
  xUnit v3 + FluentAssertions + Verify for snapshot tests.
- **Frontend:** Vite + React 19 + TypeScript, Tailwind v4, TanStack Router (file-based
  routing), TanStack Query, Playwright for end-to-end tests.

## Prerequisites

- .NET 10 SDK (`global.json` pins the version)
- Node.js 22+ and npm 10+
- Playwright browsers: `npx playwright install chromium` (run once from `frontend/`)

## Run locally

```bash
make dev
```

Or in two terminals:

```bash
cd backend && dotnet run --project LedgerOne.Api    # http://localhost:5000
cd frontend && npm run dev                          # http://localhost:5173
```

On first run, the backend seeds 8,000 deterministic Bogus transactions into
SQLite. Subsequent runs reuse the existing `ledgerone.db`.

## Test

```bash
make test     # backend xUnit + frontend Playwright
make check    # adds format + lint + type-check
```

Tests run in TDD discipline: every behavior has a failing test first.

- Backend: ~38 tests under `backend/LedgerOne.Api.Tests/{Unit,Integration}`.
- Frontend: 8 Playwright tests under `frontend/e2e/` that spin up both servers.

## Architecture notes

- **Handler pattern.** Controllers are thin; `ListTransactionsHandler` owns the
  query, DTO projection, and validation. The handler is callable directly by the
  AI agent's tool layer in sub-project 3 without HTTP overhead.
- **Problem Details everywhere.** Errors return RFC 7807 with `traceId` extension
  for correlation; the same trace ID is also echoed in the `X-Correlation-Id` response header.
- **Real migrations** (not `EnsureCreated`) so the schema is reproducible. EF
  Core configures composite `(Status, TransactionDate DESC)` + `(AccountId)`
  indexes via fluent API.
- **Test isolation.** Each integration test gets a fresh SQLite file via
  `WebApplicationFactory<Program>`; Playwright runs the backend in a Testing env
  that uses a separate `ledgerone.testing.db` and exposes `/api/test/seed` +
  `/api/test/clear` for fixture management.

## Scope notes

Built as sub-project 1 of a decomposed implementation plan:

- **Sub-project 1 (this branch):** scaffolds, data model, paginated list (no filters).
- **Sub-project 2 (deferred):** filters, sort, detail view, status pills, debouncing.
- **Sub-project 3 (deferred):** AI agent layer (chat endpoint, tools, ReAct loop).

See `docs/superpowers/specs/2026-05-12-investment-dashboard-foundation-design.md`
and `docs/superpowers/plans/2026-05-12-investment-dashboard-foundation.md` for the
full design and implementation plan.
