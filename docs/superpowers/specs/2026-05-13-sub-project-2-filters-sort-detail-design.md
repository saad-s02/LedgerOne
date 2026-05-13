# Investment Dashboard — Sub-project 2: Filters, Sort, Detail View, Pills, Debouncing

**Spec for implementation. Date: 2026-05-13. Branch: `claude/add-dashboard-prd-zPf4J`.**

## Decomposition Context

This is sub-project 2 of 3 under the PRD (`PRD.md`) decomposition begun in `docs/superpowers/specs/2026-05-12-investment-dashboard-foundation-design.md`:

1. **Sub-project 1 (done):** scaffolds, data model, dev seed, paginated list with no filters/sort/detail.
2. **Sub-project 2 (this spec):** filters, sort, page-size selector, detail page, status pills, skeleton rows, debounced search, FluentValidation, right-aligned amount + currency.
3. **Sub-project 3 (deferred):** chat endpoint, agent tools, ReAct loop, chat UI drawer.

Read the foundation spec before this one. This spec assumes its decisions are in effect (handler pattern, Problem Details, correlation IDs, TanStack Router search params, 60-row deterministic fixture, Playwright + xUnit + Verify).

## Goal

Close out the entire non-AI surface of the PRD. After this sub-project, the only thing left for sub-project 3 is the chat endpoint and chat UI. Everything else — filters, sort, pagination, detail, pills, loading polish, validation library — should be in place and exercised end-to-end.

## Overrides to PRD

- **PRD §6.1 "Date range default: last 90 days"** — interpreted as **no automatic default**. Empty URL means "no date filter." The pickers render blank. We deviate because (a) `<today>`-based defaults make e2e tests non-deterministic, (b) shareable URLs are clearer when missing means missing. The README will note this as a deliberate simplification.
- All other PRD specifications stand.

## Scope of Sub-project 2

### In scope

**Backend (`LedgerOne.Api`):**
- Extend `GET /api/transactions` to accept the full PRD §7 query parameter set: `fromDate`, `toDate`, `type`, `status`, `search`, `sortBy`, `sortDir`, `page`, `pageSize`.
- Add `GET /api/transactions/{id}` returning the full `TransactionDetailDto` (includes `notes`, `createdAt`) — 200 on hit, 404 Problem Details on miss.
- Adopt **FluentValidation** for `ListTransactionsRequest`. Manual `Validate(req)` in the handler is replaced by an injected `IValidator<ListTransactionsRequest>` whose result is adapted into the existing `ValidationException` (preserving the same 400 Problem Details shape).
- Add **`NotFoundException`** (new infra type carrying resource name + key); `GlobalExceptionHandler` maps it to **404 Problem Details** with `traceId`, leaving the 400 and 500 paths unchanged.
- Sort: `sortBy ∈ {Date, Amount}`, `sortDir ∈ {Asc, Desc}`, default `Date Desc`. Model bound case-insensitively from lowercase query strings via enum binding.
- Search: `EF.Functions.Like` on `AccountId` OR `SecuritySymbol`. SQLite LIKE is ASCII-case-insensitive, which is sufficient for the fixture and the seeded data (all uppercase IDs/symbols). Whitespace-only `search` is treated as no filter.
- Filters compose with **AND** semantics. Each filter is conditionally appended to the `IQueryable<Transaction>` only when its query parameter is supplied.

**Frontend (`frontend/`):**
- `FilterBar` above the table: date-from + date-to inputs, type select, status select, search text input (debounced 300ms), sort dropdown (combining `sortBy` + `sortDir`), and page-size selector.
- All filter and pagination state lives in URL search params, validated by an extended Zod schema in `createFileRoute('/').validateSearch`.
- Any filter or page-size change resets `page` to `1`. Sort change does **not** reset page (matches typical table UX).
- **Skeleton rows** (8 placeholder rows) replace the plain "Loading…" text on the list.
- **Status pill** component (`<StatusPill status={...} />`) — green Settled / yellow Pending / red Cancelled. Used in the list and the detail page.
- **Right-aligned amount** with two-decimal currency suffix on the table cell only (detail page renders amount + currency as separate labelled fields).
- Rows are clickable `<Link>`s navigating to `/transactions/$id`, carrying the current list `search` so Back returns to the same view.
- New route `/transactions/$id` (`src/routes/transactions.$id.tsx`):
  - Loading: skeleton card.
  - 200: two-column field grid (Date, Account, Advisor, Type, Symbol, Amount, Currency, Status pill, Created At) and a Notes section at the bottom (or "No notes" placeholder).
  - 404 (detected via `ApiError.status === 404`): "Transaction not found" with a `<Link>` back to the list (carries the search from the route's own search params).
  - Other errors: red banner with Retry.
  - "← Back to list" link at the top, also carrying the preserved list `search`.
- **Empty state** ("No transactions match these filters") gains a **Clear Filters** button which navigates to the URL with no filter params, only `page=1, sortBy=date, sortDir=desc, pageSize=25` (the defaults). It appears whenever `total === 0` *and* any filter param is non-default.

### Explicitly out of scope (sub-project 3)
Chat endpoint, agent tools, ReAct loop, chat UI drawer, model integration.

### Explicitly out of scope (not in the PRD)
Multi-tenant model, authentication, cursor pagination, CSV export, saved filter presets. Frontend component unit tests (still skipped — Playwright covers behavior).

## Architecture

### File layout (new + modified)

```
backend/LedgerOne.Api/
├── Domain/                                  # (no schema changes)
├── Features/Transactions/
│   ├── ListTransactionsRequest.cs          # MODIFIED: adds 7 properties
│   ├── ListTransactionsResponse.cs         # unchanged
│   ├── ListTransactionsHandler.cs          # MODIFIED: filters + sort + IValidator
│   ├── ListTransactionsValidator.cs        # NEW: FluentValidation rules
│   ├── GetTransactionHandler.cs            # NEW: id → DetailDto, throws NotFound
│   ├── TransactionDto.cs                   # unchanged (list shape)
│   ├── TransactionDetailDto.cs             # NEW: list shape + notes + createdAt
│   └── SortField.cs / SortDirection.cs     # NEW: enums for sort params
├── Controllers/
│   └── TransactionsController.cs           # MODIFIED: adds GET {id}
├── Infrastructure/
│   ├── Validation/ValidationException.cs   # unchanged
│   ├── Errors/NotFoundException.cs         # NEW
│   └── ProblemDetails/GlobalExceptionHandler.cs  # MODIFIED: maps NotFound → 404
└── Program.cs                              # MODIFIED: AddValidatorsFromAssembly + scoped GetTransactionHandler

backend/LedgerOne.Api.Tests/
├── Unit/
│   ├── ListTransactionsHandlerTests.cs     # MODIFIED: filter + sort cases
│   └── GetTransactionHandlerTests.cs       # NEW
├── Integration/
│   ├── TransactionsEndpointTests.cs        # MODIFIED: filter cases, 404 case
│   └── Snapshots/
│       ├── ...list_default.verified.txt    # unchanged
│       ├── ...list_filtered.verified.txt   # NEW
│       └── ...detail.verified.txt          # NEW

frontend/
├── src/
│   ├── api/
│   │   ├── client.ts                       # unchanged (ApiError.status already there)
│   │   └── transactions.ts                 # MODIFIED: full filter request, fetchTransaction, detail key
│   ├── components/
│   │   ├── StatusPill.tsx                  # NEW
│   │   ├── FilterBar.tsx                   # NEW
│   │   └── SkeletonRows.tsx                # NEW
│   ├── lib/
│   │   └── useDebouncedValue.ts            # NEW
│   └── routes/
│       ├── index.tsx                       # MODIFIED: filter bar, sort, page-size, skeleton, pill, links
│       └── transactions.$id.tsx            # NEW
└── e2e/
    ├── list.spec.ts                        # MODIFIED: keep existing, add filter/sort/page-size/pill/skeleton tests
    └── detail.spec.ts                      # NEW
```

### Backend handler pattern (unchanged shape, expanded body)

```
TransactionsController.List([FromQuery] ListTransactionsRequest req, CancellationToken ct)
  → ListTransactionsHandler.Handle(req, ct)
       1. await validator.ValidateAsync(req, ct)
       2. if !result.IsValid → throw ValidationException(adapt(result))
       3. build IQueryable<Transaction> with conditional .Where(...) per filter
       4. total = await query.CountAsync(ct)
       5. apply sort (switch on SortBy × SortDir, with Id as tie-breaker)
       6. Skip/Take/Project to TransactionDto
       7. return ListTransactionsResponse

TransactionsController.Get(int id, CancellationToken ct)
  → GetTransactionHandler.Handle(id, ct)
       1. row = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id, ct)
       2. if row == null → throw new NotFoundException("Transaction", id)
       3. return new TransactionDetailDto(...)
```

`NotFoundException` is caught in `GlobalExceptionHandler` and projected to:

```json
{ "type": "about:blank", "title": "Resource not found.", "status": 404,
  "detail": "Transaction with id 999999 was not found.", "traceId": "..." }
```

`FluentValidation.ValidationException` is **not** allowed to leak. The handler adapts FV's `ValidationResult.Errors` into a `Dictionary<string, string[]>` and throws our existing `LedgerOne.Api.Infrastructure.Validation.ValidationException`. The Problem Details envelope on 400 is unchanged.

### Frontend state model

URL search params are the single source of truth:

```ts
{
  page: number,         // default 1
  pageSize: number,     // default 25, allowed {25, 50, 100}
  fromDate?: string,    // ISO date "YYYY-MM-DD"
  toDate?: string,      // ISO date
  type?: 'Buy'|'Sell'|'Fee'|'Transfer'|'Dividend',
  status?: 'Pending'|'Settled'|'Cancelled',
  search?: string,
  sortBy: 'date'|'amount',     // default 'date'
  sortDir: 'asc'|'desc',       // default 'desc'
}
```

Validated by Zod inside `createFileRoute('/').validateSearch`. Defaults filled in by Zod. Optional fields are omitted from the URL when absent.

`useQuery` is keyed off the whole search object so the cache slots per filter combination. The `queryFn` calls `fetchTransactions(search, signal)` which builds the query string skipping `undefined` values.

The search input has its own local `useState` mirroring the URL `search` value. A `useDebouncedValue(input, 300)` hook returns the value after 300ms of quiescence; an effect syncs the debounced value into the URL (also resetting `page` to `1`).

All other filter controls (selects, date inputs, sort dropdown, page-size selector) update the URL synchronously on `onChange`.

## API Specification (sub-project 2 surface)

### `GET /api/transactions`

Query parameters:

| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | int | no | 1 | `≥ 1`, else 400 |
| `pageSize` | int | no | 25 | `1 ≤ x ≤ 100`, else 400 |
| `fromDate` | ISO datetime | no | none | parseable; if both present, `fromDate ≤ toDate` |
| `toDate` | ISO datetime | no | none | parseable; pair validation as above |
| `type` | enum | no | none | one of `Buy`,`Sell`,`Fee`,`Transfer`,`Dividend` (case-insensitive bind); invalid → 400 |
| `status` | enum | no | none | one of `Pending`,`Settled`,`Cancelled`; invalid → 400 |
| `search` | string | no | none | trimmed; empty → no filter |
| `sortBy` | enum | no | `Date` | one of `Date`,`Amount`; invalid → 400 |
| `sortDir` | enum | no | `Desc` | one of `Asc`,`Desc`; invalid → 400 |

Response 200: PRD §7 shape (unchanged from sub-project 1). Errors: 400 / 500 Problem Details.

### `GET /api/transactions/{id}`

Response 200:

```json
{
  "id": 1234,
  "transactionDate": "2026-04-15T10:23:00Z",
  "accountId": "ACCT-04827",
  "advisorName": "Sarah Chen",
  "type": "Buy",
  "securitySymbol": "AAPL",
  "amount": 12500.00,
  "currency": "CAD",
  "status": "Settled",
  "notes": "Optional free text or null",
  "createdAt": "2026-04-15T10:23:00Z"
}
```

Response 404: Problem Details with `traceId`, `title = "Resource not found."`, `detail` includes the missing id.

## Frontend Specification

### Route `/`

- Reads expanded search params per the state model above.
- Renders `<FilterBar value={search} onChange={(next) => navigate({ search: (prev) => merge(prev, next) })} />` above the table. Filter changes that affect data also force `page: 1`.
- Sort dropdown values:
  - `Date (newest)` → `sortBy=date, sortDir=desc` (default)
  - `Date (oldest)` → `sortBy=date, sortDir=asc`
  - `Amount (high to low)` → `sortBy=amount, sortDir=desc`
  - `Amount (low to high)` → `sortBy=amount, sortDir=asc`
- Page-size selector: 25, 50, 100. Changing it resets `page` to 1.
- `isPending`: render filter bar + `<SkeletonRows count={8} />` in place of `<tbody>`. Filter bar stays interactive.
- `isError`: filter bar + red banner + Retry (unchanged from sub-project 1, but rendered alongside the bar).
- `data && total === 0`: filter bar + "No transactions match these filters" + Clear Filters button (only when any filter is non-default).
- `data && total > 0`: filter bar + table + pagination footer.

### Table

- Columns unchanged in order (Date | Account | Advisor | Type | Symbol | Amount | Status).
- Amount cell: `text-right tabular-nums`, formatted as `1,234.56 CAD` (use `Intl.NumberFormat('en-CA', { minimumFractionDigits: 2 })`; currency stays as plain text suffix per PRD §6.1).
- Status cell: `<StatusPill status={...} />`.
- Each `<tr>` is wrapped (or made clickable) such that clicking navigates to the detail page, preserving search. Implementation: render `<td>` cells as `<Link>` with `display:contents` so each cell is clickable without breaking table semantics; OR use `onClick` on `<tr>` and a programmatic `navigate`. **Decision: programmatic** `onClick` + `cursor-pointer` + keyboard `Enter` handler on the row (`role="button"`, `tabIndex={0}`) — keeps DOM simple. Accessibility lapse documented as future work (PRD §3 Non-Goal).

### Route `/transactions/$id`

```tsx
export const Route = createFileRoute('/transactions/$id')({
  validateSearch: listSearchSchema,  // same as / so Back preserves filters
  component: DetailPage,
});
```

Layout:

- Top: "← Back to list" `<Link to="/" search={(prev) => prev}>`.
- `isPending`: skeleton card (8 placeholder rows of label/value pairs).
- 404 (`error instanceof ApiError && error.status === 404`): "Transaction not found" + a list-link.
- Other error: red banner + Retry.
- 200:
  - Header: account id + advisor name.
  - Two-column grid of labelled fields.
  - Notes section at bottom; `"No notes"` when null.

### Components

- `StatusPill` — `<span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', map[status])}>`. Three color classes: `bg-green-100 text-green-800` (Settled), `bg-yellow-100 text-yellow-800` (Pending), `bg-red-100 text-red-800` (Cancelled).
- `FilterBar` — flex container; controlled. Receives `value` and `onChange`. No internal URL knowledge.
- `SkeletonRows` — renders `count` `<tr>`s of `<td>`s with `animate-pulse bg-gray-100` placeholders.
- `useDebouncedValue` — generic hook `(value, ms) => debouncedValue`. ~10 lines.

## Validation

### FluentValidation rules — `ListTransactionsValidator`

```csharp
RuleFor(r => r.Page).GreaterThanOrEqualTo(1);
RuleFor(r => r.PageSize).InclusiveBetween(1, 100);
RuleFor(r => r).Must(r => !(r.FromDate.HasValue && r.ToDate.HasValue) || r.FromDate <= r.ToDate)
    .WithName("dateRange")
    .WithMessage("fromDate must be on or before toDate.");
```

Enum query params (`type`, `status`, `sortBy`, `sortDir`) are validated by ASP.NET Core's model binder before the handler runs. An invalid enum value (e.g., `?type=Foo`) produces a 400 with the framework's default Problem Details body. That's acceptable; we accept the default error shape there rather than introduce a custom binder.

### Validation → Problem Details adapter

`ListTransactionsHandler` calls:

```csharp
var result = await validator.ValidateAsync(req, ct);
if (!result.IsValid)
{
    var errors = result.Errors
        .GroupBy(e => string.IsNullOrEmpty(e.PropertyName) ? "dateRange" : ToCamel(e.PropertyName))
        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
    throw new ValidationException(errors);
}
```

`ToCamel` maps `Page → page`, `PageSize → pageSize`, etc. Empty `PropertyName` (model-level rules like the date-range check) is mapped to `dateRange` per the `WithName` override.

## Testing Strategy

### TDD discipline (unchanged)

Every behavior follows red → green → refactor. One commit per behavior, message describes it.

### Backend unit tests

`ListTransactionsHandlerTests` additions (in-memory SQLite per test, hand-seeded rows):

1. `FromDate` filter — only rows on/after the cutoff.
2. `ToDate` filter — only rows on/before the cutoff.
3. Both date bounds — intersection.
4. `Type` filter — only matching type.
5. `Status` filter — only matching status.
6. `Search` matches `AccountId` substring (case-insensitive).
7. `Search` matches `SecuritySymbol` substring (case-insensitive).
8. `Search` null/empty/whitespace → no filter.
9. Filters combine with AND.
10. Sort by `Amount Desc`.
11. Sort by `Amount Asc`.
12. Sort by `Date Asc`.
13. (`Date Desc` default already covered.)
14. Sort tie-breaker: equal sort key → stable order by `Id Desc` (or `Id Asc` matching dir).
15. `FromDate > ToDate` → `ValidationException` keyed `dateRange`.
16. Existing page/pageSize bounds — retained, now flowing through FluentValidation.

`GetTransactionHandlerTests` (new file):

17. Existing id → returns `TransactionDetailDto` with all fields including `Notes` (may be null) and `CreatedAt`.
18. Missing id → throws `NotFoundException` with resource `"Transaction"` and key equal to the id.

### Backend integration tests

`TransactionsEndpointTests` additions:

19. `GET /api/transactions?type=Buy` → 200, all rows have `type === "Buy"`, total equals fixture Buy count (12).
20. `GET /api/transactions?status=Pending` → 200, all rows have `status === "Pending"` (20 of 60).
21. `GET /api/transactions?fromDate=...&toDate=...` → 200, rows within range.
22. `GET /api/transactions?search=ACCT-00001` → 200, rows contain that account id.
23. `GET /api/transactions?search=AAPL` → 200, rows have that symbol.
24. `GET /api/transactions?sortBy=amount&sortDir=desc` → 200, first row has max amount.
25. `GET /api/transactions?fromDate=2026-05-01&toDate=2026-04-01` → 400 Problem Details with `errors.dateRange`.
26. `GET /api/transactions?type=Foo` → 400 (default ASP.NET enum-bind error).
27. `GET /api/transactions/{id}` for a fixture row → 200, `notes` and `createdAt` present.
28. `GET /api/transactions/999999` → 404 Problem Details with `traceId`.

Verify snapshots:

- `TransactionsEndpointTests.list_default.verified.txt` (existing — unchanged).
- `TransactionsEndpointTests.list_filtered.verified.txt` (new, single canonical filter combo).
- `TransactionsEndpointTests.detail.verified.txt` (new, one fixture row).

### Frontend e2e (Playwright)

Existing `list.spec.ts` continues to pass with no modifications (it only asserts pagination + states that survive). New tests, structured as additions:

**`list.spec.ts` (new tests appended):**

29. Type filter changes URL + table rows count drops to 12.
30. Status filter changes URL + rows drop to 20.
31. Search input: typing "AAPL" updates URL after ~300ms (verify `?search=AAPL` is in URL at t=400ms but not at t=200ms).
32. Sort dropdown changes URL params and reorders rows (first row Amount higher under "Amount (high to low)").
33. Page-size selector changes rows-per-page and resets `page` to 1.
34. Changing a filter while on `page=2` returns user to `page=1`.
35. Status pill has expected color class (`bg-green-100` on a Settled row).
36. Skeleton rows visible on first load (with route delay) — assert 8 placeholders before real `<tr>`s appear.
37. Empty state with active filter shows "Clear Filters" button; clicking it strips filter params and restores rows.

**`detail.spec.ts` (new):**

38. Click first row → URL becomes `/transactions/<id>` and detail page renders all labelled fields + status pill.
39. "← Back to list" returns to `/` with preserved filters (set a filter, navigate to detail, click back, assert filter still in URL and rows match).
40. Visit `/transactions/999999` → shows "Transaction not found" message and a list-link.
41. (Optional) Notes section shows "No notes" for a fixture row without notes.

### Test fixture

The existing 60-row fixture in `TestSeeder.cs` satisfies all filter-coverage needs (12 of each type, 20 of each status, dates 2026-03-02 → 2026-05-01, accounts cycling through 8 ids, symbols cycling through 6, notes on every 4th row). No fixture changes for sub-project 2.

## Dev Workflow

No changes to commands. `make dev`, `make test`, `make check`, single-test commands all carry over unchanged.

New backend NuGet dependency:

- `FluentValidation.DependencyInjectionExtensions` (registers via `AddValidatorsFromAssemblyContaining<Program>()`). Version pinned in `Directory.Packages.props`.

No new frontend dependencies. (Date pickers use native `<input type="date">`; debounce is a 10-line hook; status pill is a span.)

## Build Order

Seeds the implementation plan handed to `writing-plans`:

1. Backend: NuGet add `FluentValidation` + `FluentValidation.DependencyInjectionExtensions`, register in DI.
2. Refactor `ListTransactionsHandler` to use `IValidator<ListTransactionsRequest>` via DI; keep behavior identical; existing tests stay green. (Adapter → existing `ValidationException`.)
3. Add `SortField` / `SortDirection` enums and `SortBy` / `SortDir` properties on the request (no behavior change yet — defaults match current ordering).
4. Implement sort switch in handler. Add 4 sort tests (handler unit) and 1 integration sort assertion.
5. Add `Type` filter property + handler `.Where` + unit + integration tests.
6. Add `Status` filter property + handler + tests.
7. Add `FromDate` + `ToDate` properties + handler + tests; add `dateRange` FluentValidation rule + 400 test.
8. Add `Search` property + handler (`EF.Functions.Like` OR on AccountId/SecuritySymbol; trim empty/whitespace) + tests.
9. Add `TransactionDetailDto`.
10. Add `NotFoundException` + `GlobalExceptionHandler` mapping to 404 + unit test for the exception handler path.
11. Add `GetTransactionHandler` + tests (200 + NotFound).
12. Wire `[HttpGet("{id:int}")]` on the controller + integration tests (200 + 404).
13. New Verify snapshots: `list_filtered` and `detail`. Approve once seen.
14. Frontend: extend `searchSchema` in `src/routes/index.tsx`; expand `transactionsKey` + `fetchTransactions` signature; add `fetchTransaction` + `TransactionDetailDto`.
15. Add `StatusPill` component (and use in the table). Playwright assertion 35.
16. Add `SkeletonRows` and swap it in for the `isPending` branch. Playwright assertion 36.
17. Add `FilterBar` with type select. Wire to URL; tests 29, 34.
18. Add status select. Test 30.
19. Add date inputs + Zod schema entries. (No new e2e — covered by backend tests; one optional e2e for hand-confidence.)
20. Add sort dropdown. Test 32.
21. Add page-size selector. Test 33.
22. Add `useDebouncedValue` hook + search input. Test 31.
23. Add right-aligned amount + currency formatting on the table.
24. Add `Clear Filters` button to the empty state. Test 37.
25. Add new route file `src/routes/transactions.$id.tsx` + detail page UI. Tests 38–41.
26. Click handler on `<tr>` navigating to detail with preserved search.
27. Lint / format / `tsc --noEmit` / `make check` cleanup. Commit per behavior throughout; final commit closes sub-project 2.

## Risks & Mitigations

- **SQLite `LIKE` case-sensitivity on non-ASCII.** Mitigation: fixture and dev seed use ASCII-only identifiers; documented as a tradeoff. Production would use `COLLATE NOCASE` or a `lower()`-on-both-sides comparison.
- **`EF.Functions.Like` parameter injection.** Mitigation: parameter is bound via EF Core, not string-concatenated into raw SQL.
- **Enum binding error shape on invalid query string.** Mitigation: accepted as ASP.NET default Problem Details. If the shape looks foreign next to our handler-thrown 400s, we'd register a custom model-binding error response — out of scope for now.
- **Filter resetting page when user types in search.** Mitigation: the debounced effect explicitly sets `page: 1` along with the search value.
- **TanStack Router `<Link search={(prev) => prev}>` ergonomics.** Mitigation: validate-search on the detail route shares the list's schema so the parsed object round-trips cleanly. Documented in `transactions.$id.tsx`.
- **Skeleton flicker** on cached responses. Mitigation: `useQuery` only enters `isPending` on first-load-per-key. For filter changes that hit cache, the previous data shows briefly — acceptable.

## Open items (still deferred)

- Sub-project 3 model choice (Anthropic vs Azure OpenAI) — defer to sub-project 3 brainstorming.
- Accessibility audit on the clickable row pattern — PRD §3 Non-Goal.
- Cursor pagination — PRD §11 future improvement.
