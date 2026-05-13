# Visual Polish & Motion Design — Terminal Dense

**Spec for implementation. Date: 2026-05-13. Branch: `claude/add-dashboard-prd-zPf4J`.**

## Decomposition Context

The PRD (`PRD.md`) was previously decomposed into three sub-projects:

1. **Sub-project 1 (done):** scaffolds, data model, dev seed, paginated list with no filters/sort/detail.
2. **Sub-project 2 (backend done, frontend pending):** filters, sort, search, page-size, detail view, status pills, debouncing. See `docs/superpowers/specs/2026-05-13-sub-project-2-filters-sort-detail-design.md`.
3. **Sub-project 3 (deferred):** chat endpoint, agent tools, ReAct loop, chat UI drawer.

This spec sits across sub-projects 1 and 2 as a **visual + motion redesign** plus completion of the sub-project 2 frontend. It is one combined push (per brainstorming): foundation polish + design system + sub-project 2 UI features.

The PRD's §3 Non-Goals explicitly excluded "Dark mode, animations, design polish beyond clean Tailwind." This spec is a deliberate override of that non-goal.

## Relationship to the sub-project 2 spec

The sub-project 2 spec stands for:

- Backend handlers and validation (`ListTransactionsHandler`, `GetTransactionHandler`, FluentValidation, `NotFoundException`, Problem Details).
- API surface and query parameter contract.
- URL search-param schema (filter / sort / page state).
- TanStack Router file-based routing structure.
- Test fixture (60-row deterministic seed).
- Build order for backend work (mostly already shipped — commits `fbb0eea` … `cc9f391`).

This spec **overrides** the sub-project 2 spec for:

- All color, typography, spacing, radius, and shadow choices (sub-project 2's "bg-green-100" pills, plain skeleton rows, etc. are superseded).
- Component decomposition (this spec introduces a design-system primitives folder).
- Detail-view routing pattern: nested-overlay route instead of standalone page (URL contract unchanged).
- Motion-related behaviors (skeleton shimmer, page transitions, pill pulses, etc.).
- File layout under `frontend/src/` (consolidates primitives into `src/components/`).

Where the two specs conflict, **this one wins**. Where this spec is silent, sub-project 2 governs.

## Goal

After this spec executes:

- The dashboard reads as a deliberate, distinctive "terminal-dense" data application — dark surfaces, monospace numerals, neon accents, heavy but purposeful motion.
- Every PRD §6.1 filter / sort / pagination / state behavior works correctly.
- The transaction detail view opens as a slide-in panel from the right, URL-routable.
- Every animation respects `prefers-reduced-motion: reduce`.
- The whole frontend ships under one combined plan rather than two visual passes.

## Scope

### In scope

- Add `motion` (Framer Motion v12, ~30 kB gz) and font loaders (`@fontsource/inter`, `@fontsource/jetbrains-mono`) as frontend dependencies.
- Replace `src/styles.css` with a tokenized `@theme` block (CSS custom properties + Tailwind v4 utility generation).
- Build the component primitive layer under `frontend/src/components/`.
- Rewrite the root layout (`routes/__root.tsx`) — new `Header` with logo / LIVE / session / live-clock.
- Build the stat strip on the list page (Total Transactions, Pending Settlement, Volume 24h, Active Advisors, all with animated counters and deltas).
- Build the filter bar (type chips, status chips, date-range pill, search input) per sub-project 2 behaviors.
- Polish the table (mono numerals, sparkline-in-amount-cell, hover glow with left cyan bar, sortable headers with arrow rotation, status pills with Pending pulse).
- Polish pagination (page-turn motion between pages, mono labels).
- Implement the detail view as a nested-overlay route — list stays mounted underneath, panel slides in from the right with backdrop fade and field stagger.
- Implement every state treatment: loading (initial skeleton + refetch shimmer), error (rose banner), empty (with Clear Filters), detail 404.
- Implement the full motion system (ambient / reactive / triggered / panel categories) with reduced-motion fallbacks.
- Extend Playwright coverage (motion wiring assertions, reduced-motion test, new filter / sort / detail tests).

### Out of scope (explicit)

- **AI chat drawer** (sub-project 3 — deferred). No reserved layout slot.
- **Mobile / tablet responsive** — desktop-first, no specific support below 1024 px viewport.
- **Light theme** — dark-only.
- **Real-time WebSocket data** — the "LIVE" indicator and session ID are atmospheric only. The clock displays real wall-clock time via `setInterval`.
- **Internationalization** — strings are English-only.
- **Accessibility audit beyond keyboard support** — filters reachable by Tab, panel Esc-closable, ARIA labels on icon-only buttons. No screen-reader audit, no contrast audit beyond the obvious.
- **Component-level test runner** (Vitest etc.) — primitives are exercised via Playwright.
- **Backend changes** — none. All sub-project 2 backend work is already in place.

## Architecture

### Stack additions

| Dependency | Purpose | Cost |
|---|---|---|
| `motion` (Framer Motion v12) | `AnimatePresence`, layout animations, stagger, gesture | ~30 kB gz |
| `@fontsource/inter` | Inter sans font | static woff2, served from disk |
| `@fontsource/jetbrains-mono` | JetBrains Mono mono font | static woff2 |

No build-config changes. Tailwind v4 already supports `@theme` via the existing PostCSS plugin.

### Routing

The detail view is implemented via a **pathless layout route** so the dashboard chrome (table, filters, stat strip) stays mounted while the detail panel renders into the layout's `<Outlet />` and overlays via fixed positioning.

```
routes/
├── __root.tsx                              # Root: <Header /> + <ScanBeam /> + <Outlet />
├── _dashboard.tsx                          # Pathless layout: <StatStrip /> + <FilterBar />
│                                           #   + <DataTable /> + <PaginationBar /> + <Outlet />
│                                           # Owns the URL search-param schema (validateSearch).
├── _dashboard.index.tsx                    # Matches /, component returns null
│                                           #   (the table is already in the parent layout)
└── _dashboard.transactions.$id.tsx         # Matches /transactions/$id, renders <DetailPanel id={id} />
                                            #   DetailPanel is position: fixed; right: 0;
                                            #   so it overlays the chrome regardless of where
                                            #   the layout's <Outlet /> sits in the DOM.
```

Why this shape:

- The pathless `_dashboard.tsx` layout matches whenever any of its children match — so it stays mounted on both `/` and `/transactions/$id`. The table never unmounts when the panel opens.
- `_dashboard.index.tsx` is an empty component because the table content lives in the layout itself. The index match exists only so TanStack Router has a concrete leaf for `/`.
- The detail route's `<DetailPanel />` uses fixed positioning, so the `<Outlet />` slot can sit anywhere in the layout — the panel paints over the chrome via CSS.
- The URL search-param schema (filters / sort / page) is declared on `_dashboard.tsx`'s `validateSearch` and inherited by both children. This means the search params validate cleanly when the URL transitions between `/?...` and `/transactions/123?...`.
- `<AnimatePresence>` lives around the `<Outlet />` in `_dashboard.tsx` so panel mount and unmount both animate.
- Close handlers call `navigate({ to: '/', search: (prev) => prev })` to dismiss the panel while preserving filter state.

### File layout (new + modified)

```
frontend/
├── package.json                              # MODIFIED: + motion, + @fontsource/{inter, jetbrains-mono}
├── src/
│   ├── styles.css                            # REWRITTEN: @theme tokens, font @imports, base resets
│   ├── components/                           # NEW directory
│   │   ├── Header.tsx                        # NEW
│   │   ├── ScanBeam.tsx                      # NEW (ambient line at top of root layout)
│   │   ├── StatStrip.tsx                     # NEW (4-card row)
│   │   ├── StatCard.tsx                      # NEW
│   │   ├── Counter.tsx                       # NEW (animated number)
│   │   ├── FilterBar.tsx                     # NEW
│   │   ├── Chip.tsx                          # NEW (filter chip; animated border when active)
│   │   ├── SearchInput.tsx                   # NEW
│   │   ├── DateRangePill.tsx                 # NEW (popover with from / to inputs)
│   │   ├── DataTable.tsx                     # NEW (grid layout, sortable headers)
│   │   ├── DataRow.tsx                       # NEW (clickable row with hover glow)
│   │   ├── Sparkline.tsx                     # NEW (SVG)
│   │   ├── StatusPill.tsx                    # NEW (replaces sub-project 2's plain pill)
│   │   ├── TypeLabel.tsx                     # NEW
│   │   ├── AmountCell.tsx                    # NEW (sparkline + tabular-nums amount + currency)
│   │   ├── SkeletonRow.tsx                   # NEW (shimmer placeholder)
│   │   ├── PaginationBar.tsx                 # NEW
│   │   ├── Button.tsx                        # NEW (ghost variant)
│   │   ├── DetailPanel.tsx                   # NEW (slide-in container)
│   │   ├── DetailField.tsx                   # NEW (label + value pair)
│   │   ├── EmptyState.tsx                    # NEW
│   │   └── ErrorBanner.tsx                   # NEW
│   ├── lib/
│   │   ├── useDebouncedValue.ts              # NEW (per sub-project 2 spec)
│   │   ├── useReducedMotion.ts               # NEW (thin wrapper over Framer's useReducedMotion + media query)
│   │   ├── format.ts                         # NEW (Intl.NumberFormat for amounts, date formatting)
│   │   └── queryClient.ts                    # unchanged
│   ├── api/
│   │   ├── client.ts                         # unchanged
│   │   └── transactions.ts                   # MODIFIED: full filter shape + fetchTransaction (per sub-project 2)
│   └── routes/
│       ├── __root.tsx                        # REWRITTEN: <Header> + <ScanBeam> + <main><Outlet /></main>
│       ├── _dashboard.tsx                    # NEW: pathless layout — stat strip + filter bar
│       │                                     #      + table + pagination + <AnimatePresence><Outlet /></AnimatePresence>
│       │                                     #      Owns the URL search-param schema (validateSearch).
│       ├── _dashboard.index.tsx              # NEW: matches /, component returns null
│       ├── _dashboard.transactions.$id.tsx   # NEW: renders <DetailPanel id={id} />
│       └── index.tsx                         # DELETED: replaced by _dashboard.index.tsx
└── e2e/
    ├── list.spec.ts                          # MODIFIED: keeps existing assertions; adds filter / sort / pill / motion-wiring tests
    ├── detail.spec.ts                        # NEW
    └── motion.spec.ts                        # NEW (reduced-motion + ambient-loop presence)
```

## Design tokens

All tokens live in `src/styles.css` inside Tailwind v4's `@theme` block (CSS custom properties that Tailwind compiles into utility classes). One file. No JS theme abstraction.

### Color (dark-only)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#06080F` | Page background |
| `--color-bg-elev` | `#0C1120` | Stat cards, search input, detail panel surface |
| `--color-bg-elev-2` | `#131A2E` | Hover / active surfaces |
| `--color-line` | `#182032` | Default border |
| `--color-line-strong` | `#1F2A44` | Emphasized border (inputs, dividers) |
| `--color-text` | `#D1D5DB` | Body text |
| `--color-text-dim` | `#6B7280` | Labels, secondary text |
| `--color-text-bright` | `#F3F4F6` | Headlines, numerals, hover state |
| `--color-cyan` | `#22D3EE` | Primary accent — focus, active chip, highlights |
| `--color-cyan-glow` | `rgba(34, 211, 238, 0.35)` | Cyan halo / box-shadow base |
| `--color-amber` | `#FBBF24` | Pending status, warning |
| `--color-green` | `#22C55E` | Settled status, positive delta, BUY |
| `--color-rose` | `#F43F5E` | Cancelled status, negative delta, SELL |

### Typography

| Token | Value |
|---|---|
| `--font-sans` | `'Inter', ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace` |

**Mono is the default for every numeral, timestamp, account ID, security symbol, ticker, session ID, status pill text.** Sans for body, headings, advisor names, button labels, filter chip text.

Type scale (px): 10, 11, 12, 14, 16, 22, 28, 40. Use Tailwind's text-size utilities (`text-xs` etc.) or one-off arbitrary classes for the 22/28/40 tier.

### Spacing

Tailwind defaults. The design is tight: table rows pad `py-2.5 px-3.5` (11 × 14 px), stat cards `p-4`, chips `py-1 px-2.5`. Page gutter `px-6 lg:px-8`.

### Radii

| Token | Use |
|---|---|
| `2px` | Status pills, type labels |
| `3px` | Chips, buttons, inputs |
| `8px` | Stat cards, detail panel inner sections |
| `14px` | Detail panel outer container, error banner |

### Motion timings

| Token | Value | Used by |
|---|---|---|
| `--ease-snap` | `cubic-bezier(.32, .72, 0, 1)` | Panel slide, page transition |
| `--dur-quick` | `120ms` | Hover swaps, chip color, button states |
| `--dur-standard` | `200ms` | Most transitions, fades, header rotations |
| `--dur-smooth` | `280ms` | Panel slide-in, page-turn |
| `--dur-scan` | `4s` | Scan beam loop |
| `--dur-pulse` | `2.4s` | Pending pill halo |
| `--dur-shimmer` | `1.6s` | Skeleton shimmer |

## Layout shell

```
┌─ Header (border-b, sticky) ─────────────────────────────────────┐
│  ● LEDGER//ONE                  ● LIVE   SESSION 04A2   15:42:07 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─Total────┐ ┌─Pending──┐ ┌─Vol 24h──┐ ┌─Advisors─┐            │
│  │ 8,421    │ │ 312      │ │ $47M     │ │ 38       │  stat strip │
│  │ ▲ 124    │ │ ▼ 8      │ │ ▲ 12.4%  │ │ ▲ 3      │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  [TYPE·ALL] [BUY] [SELL] [DIV]  [STATUS·PEND] [90D]   ⌕ search… │  filter bar
├─────────────────────────────────────────────────────────────────┤
│  DATE          ACCOUNT      ADVISOR        TYP  SYM   AMOUNT    │  table head
│  05.12 10:23   ACCT-04827   Sarah Chen    BUY  AAPL  12,500.00 │
│  …                                                              │
├─────────────────────────────────────────────────────────────────┤
│  SHOWING 1–25 OF 8,421       ‹ PREV   PAGE 1/337   NEXT ›       │  pagination
└─────────────────────────────────────────────────────────────────┘

Detail panel slides in from the right when `/transactions/$id` is active.
List stays mounted underneath at 40% opacity.
```

- Container has no `max-width`. Full bleed with `px-6 lg:px-8` page gutter — the terminal aesthetic benefits from edge-to-edge density.
- Header is sticky to the top of the viewport.
- The cyan scan beam is rendered by `<ScanBeam />` in `__root.tsx` as a 1px element at the very top of the viewport, above the header border.

## Component primitives

Primitives are **flat, not nested.** Each is one file, one default export, one purpose. No compound APIs like `Card.Header` / `Card.Body`.

| Primitive | Responsibility |
|---|---|
| `Header` | Sticky top bar: logo with blinking dot, LIVE indicator, session ID, live clock |
| `ScanBeam` | 1px cyan gradient sweep at the very top of the viewport |
| `StatStrip` | 4-column grid of `StatCard`s (see "Stat strip data" below) |
| `StatCard` | Label + `Counter` value + delta (`▲` / `▼` + amount + qualifier) |
| `Counter` | Animated number; mounts at 0 and ramps to target via `requestAnimationFrame` + `easeOutCubic` over `--dur-smooth × 4`; re-runs when target changes |
| `FilterBar` | Flex container; controlled; receives `value` and `onChange`; owns chip-group / search / date-pill layout |
| `Chip` | Filter chip; `active` variant gets the animated cyan border via CSS gradient + mask trick. `amber` variant for Pending. |
| `SearchInput` | Mono input prefixed with `⌕`; debounced via parent through `useDebouncedValue` |
| `DateRangePill` | Pill displaying current range ("90D" or "May 1 – May 12"); opens a small popover with two native `<input type="date">` controls |
| `DataTable` | Grid container with sortable header; clickable column headers for `Date` and `Amount` toggle sort, with 180° arrow rotation |
| `DataRow` | One row; hover state animates 2px left cyan bar via Framer; click navigates to detail |
| `Sparkline` | 38 × 14 SVG polyline; stroke colored by amount sign (cyan default, amber if pending, rose if cancelled) |
| `AmountCell` | Wraps `Sparkline` + tabular-nums number + currency suffix; right-aligned to match right-aligned column header |
| `StatusPill` | 3 variants. Pending pulses via `--dur-pulse` halo. |
| `TypeLabel` | BUY / SELL / DIV / FEE / TRF colored mono labels |
| `SkeletonRow` | 7-column shimmer placeholder used during loading |
| `PaginationBar` | Prev / "PAGE n / m" / Next; the page number sits inside an `AnimatePresence` keyed on `page` for the page-turn motion |
| `Button` | Ghost variant: transparent bg, line border, cyan hover glow |
| `DetailPanel` | Right-edge fixed container; uses Framer `motion.aside` for slide + backdrop fade; close handlers (Esc, backdrop click, X button); contains a field grid + Notes section |
| `DetailField` | Label + value pair; used inside `DetailPanel` |
| `EmptyState` | Mono prompt with optional action button (e.g., "Clear filters") |
| `ErrorBanner` | Rose-bordered banner with retry button; appears above the table |

## Motion system

Every animation in the app, organized by trigger class.

### Ambient (always playing)

| Pattern | Where | Spec | Reduced-motion |
|---|---|---|---|
| Scan beam | `ScanBeam` in root | 1px cyan gradient sweep, `--dur-scan` linear infinite | hidden |
| Logo dot | `Header` brand block | 2s ease-in-out opacity blink | static |
| LIVE dot | `Header` status block | 1.4s ease-in-out opacity blink | static |
| Live clock | `Header` right edge | `setInterval(1000)` updating wall clock | unchanged |

### Reactive (state / hover-driven)

| Pattern | Where | Spec | Reduced-motion |
|---|---|---|---|
| Chip active border | `Chip[active]` | Animated cyan gradient border via CSS background + mask, 3s linear infinite | solid cyan border |
| Row hover | `DataRow:hover` | `--dur-quick` background fade + 2px left cyan bar appears (Framer layout animation) | background fade only, no bar |
| Button hover | `Button:hover` | `--dur-quick` border swap to cyan + 3px outer cyan-glow ring | border swap only |
| Pending pill pulse | `StatusPill[pending]` | `--dur-pulse` halo expansion (`box-shadow` from `0 0 0 0 amber` to `0 0 0 4px transparent`) | static |
| Skeleton shimmer | `SkeletonRow` | `--dur-shimmer` linear background-position sweep | solid line |
| Table refetch dim | `DataTable` while `isFetching` | Rows go to 60% opacity; 1px cyan progress sliver under filter bar | opacity change only |

### Triggered (one-time, on event)

| Pattern | Where | Trigger | Spec | Reduced-motion |
|---|---|---|---|---|
| Stat counter | `Counter` | Mount + value change | `useEffect` + `rAF`, ~1.0s easeOutCubic from 0 to target | snap to final |
| Sparkline draw | `Sparkline` | Mount | 600ms `stroke-dashoffset` reveal | instant |
| Row stagger entry | `DataTable` | Data load / filter change | Framer Motion stagger, 30ms gap × visible rows, 200ms fade-up each | all rows appear instantly |
| Filter chip toggle | `Chip` | Click | `--dur-standard` color swap + brief `--dur-quick` dim while query in flight | instant swap |
| Page transition | `PaginationBar` + table | Page change | `AnimatePresence mode="wait"` keyed by page; outgoing slides left -30px + fade, incoming slides from right +30px + fade, `--dur-smooth` | opacity fade only, 100ms |
| Sort header click | `DataTable` header | Sort change | Framer `layout` animation, `--dur-standard`; arrow indicator rotates 180° | rows reorder instantly, no arrow rotation |

### Detail panel (the biggest motion piece)

| Stage | Spec | Reduced-motion |
|---|---|---|
| Backdrop fade in | `--dur-standard`, opacity 0 → 0.4 | unchanged (still helps depth) |
| Panel slide in | `--dur-smooth` `--ease-snap`, `translateX(100%)` → 0 | 100ms opacity fade, no slide |
| Field stagger | After panel settles: each `DetailField` fades up 200ms, 25ms stagger | instant |
| Panel slide out | 240ms reverse | 100ms opacity fade out |
| Close triggers | Esc, backdrop click, X button → `navigate({ to: '/', search: (prev) => prev })` | unchanged |

### Performance rules

- All motion uses `transform` and `opacity` only — no animated `width`, `height`, `top`, `left`, or `box-shadow` on large surfaces. Small pill / button `box-shadow` is fine.
- `will-change: transform` is set only on the detail panel during its slide window, never globally.
- Reduced-motion uses **`useReducedMotion()` from Framer** for JS-driven pieces and CSS `@media (prefers-reduced-motion: reduce)` for the rest.

## Sub-project 2 functional behaviors

All inherit from `2026-05-13-sub-project-2-filters-sort-detail-design.md`. Summarized here for completeness.

### Filter bar

| Control | Behavior | URL param |
|---|---|---|
| Type chip group | Single-select (All / Buy / Sell / Fee / Transfer / Dividend) | `type` |
| Status chip group | Single-select (All / Pending / Settled / Cancelled) | `status` |
| Date range pill | Popover with native From / To inputs; default is *no filter* (empty URL) per sub-project 2 override of PRD §6.1 | `fromDate`, `toDate` |
| Search input | Mono input, 300 ms debounced via `useDebouncedValue`; matches `AccountId` OR `SecuritySymbol` contains | `search` |
| Sort | Click on `DATE` or `AMOUNT` header toggles dir; arrow rotates 180° | `sortBy`, `sortDir` |
| Page size | Small mono select to the right of the page indicator (25 / 50 / 100) | `pageSize` |
| Page | Prev / Next with page-turn motion | `page` |

Filter or page-size change resets `page` to 1. Sort change does not. Filters compose with AND. URL is the single source of truth; the search input keeps a local mirrored state for typing, debounced into the URL.

### Detail panel content

- Header: `"TXN-{id}"` in mono + close `×` button (top-right).
- Field grid (two columns): Date / Account / Advisor / Type / Symbol / Amount + Currency / Status / Created At. Labels in `--text-dim` mono uppercase, values in `--text-bright`.
- Notes section at bottom, sans, body-size. `"No notes"` placeholder in `--text-dim` when null.
- 404 (`ApiError.status === 404`): panel still slides in; content shows "TRANSACTION NOT FOUND" mono + a list link.
- Other error: rose banner inside the panel + retry button.

### Stat strip data sourcing

The stat strip is part of the visual polish, not a PRD-mandated feature. There are no aggregate / summary endpoints on the backend and this spec adds none. The four cards source data as follows — disclosed honestly in code and in the README:

| Card | Source | Type |
|---|---|---|
| **Total Transactions** | An additional unfiltered query: `fetchTransactions({ page: 1, pageSize: 1 })`, reading `response.total`. Cached by TanStack Query under its own key. | Real |
| **Pending Settlement** | Additional query: `fetchTransactions({ status: 'Pending', page: 1, pageSize: 1 })`, reading `response.total`. | Real |
| **Volume 24h** | Atmospheric — no `SUM` endpoint exists. Renders a stable hardcoded value (`$47M`) and a stable delta. | Atmospheric |
| **Active Advisors** | Atmospheric — no `DISTINCT COUNT` endpoint exists. Renders a stable hardcoded value (`38`). | Atmospheric |

Both real queries fire once on mount and are not refetched on filter changes (so the "Total" card always shows the unfiltered count, not the filtered one). The two atmospheric cards exist for visual balance and are clearly labelled in the source as decorative — same honest-disclosure pattern as the LIVE indicator and session ID in the header. The README will note all three (LIVE, session ID, two stat cards) under a single "atmospheric elements" callout.

The atmospheric values still flow through `<Counter />` so they animate from 0 to target on mount, matching the two real cards visually.

## State treatments

| State | Visual treatment |
|---|---|
| **Initial loading** | 8 `SkeletonRow`s in the table + 4 skeleton bars in the stat strip |
| **Refetch (filter change)** | Existing rows stay visible at 60 % opacity; 1 px cyan progress sliver under the filter bar (driven by TanStack Query `isFetching`) |
| **Error** | `ErrorBanner` above the table: "Couldn't load transactions · Retry" — filter bar stays interactive |
| **Empty** | Mono prompt "NO TRANSACTIONS MATCH THESE FILTERS" + ghost "Clear filters" `Button` (only when any filter param is non-default) |
| **Detail loading** | Panel slides in; field grid replaced by skeleton bars |
| **Detail 404** | Panel slides in; mono "TRANSACTION NOT FOUND · Back to list" link |

## Testing strategy

### Playwright extends the existing suite (no new test runner)

**`list.spec.ts`** — keep all existing assertions (loading indicator, error retry, empty state, pagination disabled-state boundaries). Add:

- Filter chip click updates URL and table contents (`type`, `status`).
- Search debounce: type "AAPL", assert URL has no `search` at t=250ms, has `search=AAPL` at t=400ms.
- Sort header click updates URL params and reorders rows (first row Amount higher under "Amount high to low").
- Page-size selector changes rows-per-page and resets `page` to 1.
- Status pill has expected mono text and color class on a Settled row.
- Stat strip renders 4 cards; counters end at non-zero values after first paint.

**`detail.spec.ts`** — new file:

- Click first table row → URL becomes `/transactions/<id>`, detail panel renders all labelled fields.
- Esc closes panel → URL returns to `/` with filters preserved.
- Backdrop click closes panel similarly.
- Visit `/transactions/999999` directly → panel mounts, shows "TRANSACTION NOT FOUND".

**`motion.spec.ts`** — new file. Motion assertions are **wiring-only, not pixel-perfect**:

- Scan beam element is present (`[data-motion-id="scan-beam"]`).
- Pending pills carry `data-motion-state="pulse"`.
- Active chip carries `data-motion-state="border"`.
- Run a second pass with `page.emulateMedia({ reducedMotion: 'reduce' })`:
  - Scan beam is hidden (`display: none` or `[hidden]`).
  - Pending pills lose `data-motion-state="pulse"` (or carry `data-motion-state="pulse-off"`).
  - `Counter` snaps directly to final value (assert it equals target on first render).

### Backend tests

No changes. Sub-project 2 backend coverage is already in place via existing xUnit + Verify suites.

## Risks & Mitigations

- **Bundle size from Framer Motion.** Mitigation: tree-shake via the `motion` package; only import `motion`, `AnimatePresence`, `useReducedMotion` — not the full `framer-motion` umbrella. If bundle exceeds 200 kB gz on the production build, consider replacing scoped imports with `motion/react` lite.
- **Counter animations triggering on every refetch.** Mitigation: `Counter` only animates when the *prop value* changes, and skips the initial-to-final-equal case. TanStack Query's structural sharing means stable values won't trigger.
- **Reduced-motion edge cases.** Mitigation: `useReducedMotion` is checked in every motion-bearing primitive; one Playwright pass with `reducedMotion: 'reduce'` enforces the static fallbacks.
- **Sticky header stacking context.** Mitigation: header is `position: sticky`, not `fixed`; scan beam is portaled outside the header into the body root.
- **Detail panel route + scroll position.** Mitigation: when panel opens, list scroll position is preserved (no `scrollTo`). When it closes, list does not re-scroll. Verified via Playwright in the back-button test.
- **Animated cyan border on chips (CSS mask) browser support.** Mitigation: the `-webkit-mask-composite: xor` + `mask-composite: exclude` pattern works in all current Chromium / Firefox / Safari. If Safari quirks, fall back to a static cyan border for that one piece.
- **Skeleton flicker on cache hit.** Mitigation: `useQuery` only enters `isPending` on first-load-per-key. For filter changes that hit cache, previous data shows briefly — acceptable.
- **Font load CLS.** Mitigation: Inter and JetBrains Mono ship as woff2 via `@fontsource`. CSS `font-display: swap` declared in `styles.css`. System mono fallback in the stack means numerals don't shift catastrophically.

## Build order (seed for writing-plans)

This is the implementation flight path. Writing-plans will refine each step into atomic tasks with tests.

1. **Deps**: add `motion`, `@fontsource/inter`, `@fontsource/jetbrains-mono`; commit lockfile.
2. **Tokens**: rewrite `src/styles.css` with `@theme` block; import fonts; set body background, color, font defaults. Verify dev server boots and the existing list page picks up the new colors (will look wrong — that's expected).
3. **Root layout**: rewrite `routes/__root.tsx` with `<Header />` and `<ScanBeam />`. Header gets logo, LIVE indicator, session ID (decorative), live clock via `setInterval`.
4. **Pathless layout migration**: replace `routes/index.tsx` with `routes/_dashboard.tsx` (pathless layout owning `validateSearch`, the existing list query, and an `<AnimatePresence><Outlet /></AnimatePresence>` slot) plus `routes/_dashboard.index.tsx` (returns `null`). Existing tests stay green — URL contract unchanged.
5. **Primitives**: build `Button`, `Chip`, `StatusPill`, `TypeLabel`, `SkeletonRow`, `EmptyState`, `ErrorBanner` — each in isolation against current/stub data.
6. **Counter + StatCard + StatStrip**: animated number with `requestAnimationFrame`; one Playwright assertion that counters reach target. Wire Total + Pending to additional unfiltered/`status=Pending` queries; Volume + Advisors render hardcoded atmospheric values.
7. **Table primitives**: `DataTable`, `DataRow`, `AmountCell`, `Sparkline`. Wire up to existing data. Polish hover state. Sortable headers (sort change → URL).
8. **PaginationBar with page-turn motion**: `AnimatePresence` keyed on page; mono labels.
9. **FilterBar**: `Chip` group for type, then status. Wire to URL via the `_dashboard.tsx` `validateSearch`. Reset `page` on change. Playwright tests for filter behaviors.
10. **DateRangePill**: popover with native date inputs.
11. **SearchInput + useDebouncedValue**: debounced search wired to URL. Playwright test for timing.
12. **States**: empty state with Clear Filters, error banner, refetch dim + progress sliver.
13. **Detail panel route** (`_dashboard.transactions.$id.tsx`): panel container with slide + backdrop + Esc / backdrop-click / button close. `DetailField` grid + Notes section. 404 path.
14. **Detail row click handler**: `DataRow` onClick navigates to `/transactions/$id` with preserved search.
15. **Reduced-motion sweep**: confirm every animated primitive honors `useReducedMotion`; add `motion.spec.ts`.
16. **`make check` cleanup**: lint, format, tsc, dotnet format, all tests green. Final commit closes the spec.

## Open items (still deferred)

- Sub-project 3 chat drawer surface — will be specced separately when sub-project 3 begins.
- Accessibility audit beyond keyboard support — PRD §3 Non-Goal.
- Mobile / tablet responsive — desktop-first, deliberate.
- Light theme — explicitly excluded.
