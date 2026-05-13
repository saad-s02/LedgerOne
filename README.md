# LedgerOne — Investment Transactions Dashboard

PriceMetrix take-home built on the React + .NET + SQL stack. See `PRD.md` for the
product spec and `docs/superpowers/specs/` for the implementation design.

Sub-projects 1 (paginated list), 2 (filters, detail view), and 3 (AI agent) are
all implemented on this branch.

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

## Chat (AI Agent)

The list page has a right-side chat drawer powered by Anthropic Claude Haiku 4.5. The agent has two read-only tools:

- `search_transactions` — wraps the list endpoint (full filter set + 20-row server cap).
- `get_transaction` — wraps the detail endpoint.

The chat endpoint runs a manual ReAct loop with a hard 5-iteration cap and a 60-second timeout. Tool dispatch shares the same handlers the REST API uses (`ITransactionTools` → `ListTransactionsHandler` / `GetTransactionHandler`), so the agent and the UI see the same data with no duplication.

### Setup

Set `ANTHROPIC_API_KEY` in your shell or .NET user-secrets:

```bash
dotnet user-secrets set ANTHROPIC_API_KEY sk-ant-... --project backend/LedgerOne.Api
```

If the key is unset, the chat endpoint returns **503 Problem Details** (`title: "Chat is not configured."`); the rest of the dashboard continues to work.

### Live smoke test (opt-in, ~$0.001/run)

```bash
ANTHROPIC_API_KEY=sk-ant-... dotnet test --filter "FullyQualifiedName~Smoke"
```

Skipped silently when no key is present. CI never runs it.

### Why Haiku 4.5 (not Sonnet 4.6)

Three well-described tools over a tabular dataset is exactly the structured tool-routing task Haiku 4.5 is tuned for. ~3× cheaper per token, ~2× lower latency. The model id lives in `appsettings.json` under `Chat:Model` and is swappable without code changes.

### Future work (called out by design)

- `aggregate_transactions` tool (sums, counts, group-by).
- Streaming responses (SSE) — current shape is one-shot.
- Conversation persistence across sessions.
- UI controls for `minAmount`/`maxAmount` filters in the filter bar (already on the API).
- Rate limiting on `/api/chat`.
- Evaluation harness for query accuracy.
- Cost / token observability dashboard.

## Scope notes

Built as a decomposed implementation plan across three sub-projects (all on this branch):

- **Sub-project 1:** scaffolds, data model, paginated list (no filters).
- **Sub-project 2:** filters, sort, detail view, status pills, debouncing.
- **Sub-project 3:** AI agent layer (chat endpoint, tools, ReAct loop).

See `docs/superpowers/specs/2026-05-12-investment-dashboard-foundation-design.md`
and `docs/superpowers/plans/2026-05-12-investment-dashboard-foundation.md` for the
full design and implementation plan.
