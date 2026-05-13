# Visual Polish & Motion Design — Terminal Dense

**Spec for implementation. Date: 2026-05-13. Branch: `claude/add-dashboard-prd-zPf4J`.**

## Decomposition Context

The PRD (`PRD.md`) was previously decomposed into three sub-projects:

1. **Sub-project 1 (done):** scaffolds, data model, dev seed, paginated list with no filters/sort/detail.
2. **Sub-project 2 (DONE as of commit `3ce3b39`):** filters, sort, search, page-size, detail page, status pills, debouncing, empty-state Clear Filters. Both backend and frontend complete. See `docs/superpowers/specs/2026-05-13-sub-project-2-filters-sort-detail-design.md`.
3. **Sub-project 3 (specced, not built):** chat endpoint, agent tools, ReAct loop, chat UI drawer. Spec at `docs/superpowers/specs/2026-05-13-sub-project-3-ai-agent-design.md`, plan at `docs/superpowers/plans/2026-05-13-sub-project-3-ai-agent.md`.

This spec is therefore a **pure visual + motion redesign** of an already-functional application. Every PRD §6.1 / §6.2 behavior already works. What this spec adds is the Terminal Dense aesthetic, the design-system primitive layer, the motion choreography, and the structural shift from a full-route detail page to an overlay slide-in panel.

The PRD's §3 Non-Goals explicitly excluded "Dark mode, animations, design polish beyond clean Tailwind." This spec is a deliberate override of that non-goal.

## Current implementation state (rescanned 2026-05-13, branch `claude/add-dashboard-prd-zPf4J`)

What already exists and ships:

**Frontend files**

| File | State | What it does today |
|---|---|---|
| `frontend/src/routes/__root.tsx` | unchanged from sub-project 1 | `<div bg-gray-50><header>LedgerOne</header><main><Outlet /></main></div>` |
| `frontend/src/routes/index.tsx` | sub-project 2 final | List page: `<FilterBar>` + table (7 columns, right-aligned amount with `Intl.NumberFormat('en-CA')`, `<StatusPill>` in last cell, `<tr role="button" tabIndex={0}>` with click + Enter navigation to detail) + skeleton rows / error banner / empty-state with conditional Clear Filters / Prev/Next pagination |
| `frontend/src/routes/transactions.$id.tsx` | sub-project 2 final | **Full-route** detail page (not an overlay). `<Link to="/" search={(prev) => prev}>← Back to list</Link>`, skeleton on load, "Transaction not found" on 404, retry banner on other errors, `<dl>` grid with all fields, `<StatusPill>`, Notes section |
| `frontend/src/lib/listSearch.ts` | sub-project 2 final | Zod schema `listSearchSchema`, `DEFAULT_LIST_SEARCH`, `isAnyFilterActive(search)` helper. URL params: `page`, `pageSize` (25/50/100), `fromDate`, `toDate`, `type`, `status`, `search`, `sortBy` (date/amount), `sortDir` (asc/desc) |
| `frontend/src/lib/useDebouncedValue.ts` | sub-project 2 final | Generic `useDebouncedValue<T>(value, delayMs)` hook |
| `frontend/src/api/transactions.ts` | sub-project 2 final | `TransactionDto`, `TransactionDetailDto`, `ListTransactionsResponse`, `ListTransactionsParams`, `fetchTransactions`, `fetchTransaction`, `transactionsKey`, `transactionDetailKey` |
| `frontend/src/api/client.ts` | sub-project 2 final | `apiGet`, `ApiError` (carries `status`) |
| `frontend/src/components/StatusPill.tsx` | sub-project 2 final | Plain Tailwind pill: `bg-green-100 / bg-yellow-100 / bg-red-100`, `rounded-full px-2 py-0.5 text-xs font-medium` |
| `frontend/src/components/SkeletonRows.tsx` | sub-project 2 final | `<tr data-testid="skeleton-row">` × N, each cell `animate-pulse bg-gray-200`. Used in `<tbody>` during `isPending`. |
| `frontend/src/components/FilterBar.tsx` | sub-project 2 final | **Native `<select>` controls and `<input>`s** with `<label>` wrappers. Seven controls: Type, Status, From, To, Sort (combined `sortBy:sortDir`), Page size, Search. Search has internal `useState` + `useDebouncedValue(300)` synced to parent via `onChange`. |
| `frontend/src/styles.css` | unchanged from sub-project 1 | Single line: `@import 'tailwindcss';` |
| `frontend/package.json` | sub-project 2 final | No `motion`, no `@fontsource/*` |
| `frontend/e2e/list.spec.ts` | sub-project 2 final | 15 tests including filter / sort / debounce / skeleton / pill / empty-state / clear-filters / pagination |
| `frontend/e2e/detail.spec.ts` | sub-project 2 final | 3 tests: row-click navigation, Back-link returns to filtered URL, 404 state |

**Working-tree changes that are not yet committed** (visible via `git status`): minor format/config sweeps to tsconfig, eslint, prettier, vite, package files, and a small `__root.tsx` modification. None of them touch the rendering logic.

## Relationship to the sub-project 2 spec

The sub-project 2 spec stands for everything it specified. This new spec **does not undo any behavior** — it restyles and recomposes. Concretely:

**Inherited unchanged from sub-project 2:**

- All backend handlers and validation.
- All API contracts and the 60-row fixture.
- `listSearch.ts` (Zod schema, defaults, `isAnyFilterActive`) — used as-is by the new layout route.
- `useDebouncedValue.ts` — used as-is by the new `SearchInput` primitive.
- `api/transactions.ts` types and fetchers — used as-is, plus a new helper for the stat strip.
- The `/transactions/{id}` URL contract — same path, same params, same back-navigation semantics (filters preserved).

**Replaced (existing file rewritten) by this spec:**

- `components/StatusPill.tsx` — green/yellow/red pastel → Terminal Dense green/amber/rose with the pulsing-halo Pending variant.
- `components/SkeletonRows.tsx` — `animate-pulse` → cyan-tinted shimmer sweep + `data-motion-id` for test wiring. Keeps the `data-testid="skeleton-row"` attribute and `count` / `columns` props.
- `components/FilterBar.tsx` — native `<select>` controls → chip groups (Type, Status), date-range pill with popover, click-on-header sort (no Sort dropdown), terminal-styled search input.
- `routes/__root.tsx` — `<h1>LedgerOne</h1>` → full `<Header />` with logo, LIVE indicator, session ID, live clock + `<ScanBeam />`.
- `routes/index.tsx` — moves into a pathless `_dashboard.tsx` layout; the file itself becomes `_dashboard.index.tsx` returning `null` (chrome lives in the layout).
- `routes/transactions.$id.tsx` — full-route detail page → `_dashboard.transactions.$id.tsx` rendering an overlay `<DetailPanel />`. **This is the only behavioral change**: list stays mounted under the slide-in panel instead of unmounting. URL contract is preserved.
- `styles.css` — adds `@theme` block with tokens and font imports.

**Added (new files):**

- Primitives layer (Header, ScanBeam, StatStrip, StatCard, Counter, Chip, SearchInput, DateRangePill, DataTable, DataRow, Sparkline, TypeLabel, AmountCell, PaginationBar, Button, DetailPanel, DetailField, EmptyState, ErrorBanner).
- `lib/useReducedMotion.ts`, `lib/format.ts`.
- `e2e/motion.spec.ts`.

**Where the two specs conflict, this one wins. Where this spec is silent, sub-project 2 governs.**

## Goal

After this spec executes:

- The dashboard reads as a deliberate, distinctive "terminal-dense" data application — dark surfaces, monospace numerals, neon accents, heavy but purposeful motion.
- Every PRD §6.1 / §6.2 behavior continues to work (already does — this spec restyles, it does not re-build).
- The detail view opens as a slide-in panel over a still-mounted list, URL-routable at `/transactions/{id}`.
- Every animation respects `prefers-reduced-motion: reduce`.
- The Playwright suite stays green throughout — selector updates land in the same commit as the UI change that breaks them (per the Test compatibility table).

## Scope

### In scope

- Add `motion` (Framer Motion v12, ~30 kB gz) and font loaders (`@fontsource/inter`, `@fontsource/jetbrains-mono`) as frontend dependencies.
- Rewrite `src/styles.css` with a tokenized `@theme` block (CSS custom properties + Tailwind v4 utility generation) + font imports.
- Build the design-system primitive layer under `frontend/src/components/` — 18 new primitives.
- Rewrite three existing components: `StatusPill.tsx`, `SkeletonRows.tsx`, `FilterBar.tsx`.
- Rewrite the root layout (`routes/__root.tsx`) — full `<Header />` with logo / LIVE / session / live-clock + `<ScanBeam />`.
- Migrate the list route into a pathless `_dashboard.tsx` layout (the list-rendering logic moves out of `routes/index.tsx` into `routes/_dashboard.tsx`; `routes/index.tsx` is deleted).
- Migrate the detail route from a full-route page (`routes/transactions.$id.tsx`) to an overlay panel (`routes/_dashboard.transactions.$id.tsx`).
- Add the stat strip (Total + Pending fetched as additional unfiltered queries; Volume 24h + Active Advisors atmospheric — see "Stat strip data sourcing").
- Polish the table (mono numerals, sparkline-in-amount-cell, hover glow with left cyan bar, sortable headers with arrow rotation, status pills with Pending pulse).
- Polish pagination (page-turn motion between pages, mono uppercase labels).
- Implement every state treatment: loading (initial skeleton + refetch shimmer), error (rose banner), empty (with Clear Filters, already in place — restyles only), detail 404.
- Implement the full motion system (ambient / reactive / triggered / panel categories) with reduced-motion fallbacks.
- Extend the Playwright suite: update selectors per the Test compatibility table, add stat-strip presence test, add `motion.spec.ts` for wiring + reduced-motion.

### Out of scope (explicit)

- **AI chat drawer** (sub-project 3 — specced separately, not yet implemented). No reserved layout slot.
- **Mobile / tablet responsive** — desktop-first, no specific support below 1024 px viewport.
- **Light theme** — dark-only.
- **Real-time WebSocket data** — the "LIVE" indicator and session ID are atmospheric only. The clock displays real wall-clock time via `setInterval`.
- **New aggregate / summary endpoints on the backend** — stat strip uses the existing list endpoint with `pageSize=1` for the two real cards.
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

### File layout

Status markers: **NEW** = file does not exist · **REWRITE** = file exists, content fully replaced · **MODIFY** = small additions to existing file · **KEEP** = no changes · **MOVE** = file relocated.

```
frontend/
├── package.json                              # MODIFY: + motion (v12, ~30 kB gz), + @fontsource/inter, + @fontsource/jetbrains-mono
├── src/
│   ├── styles.css                            # REWRITE: @theme tokens, font @imports, base resets
│   ├── components/
│   │   ├── Header.tsx                        # NEW
│   │   ├── ScanBeam.tsx                      # NEW (ambient line at top of root)
│   │   ├── StatStrip.tsx                     # NEW (4-card row)
│   │   ├── StatCard.tsx                      # NEW
│   │   ├── Counter.tsx                       # NEW (animated number)
│   │   ├── FilterBar.tsx                     # REWRITE: native <select>s → chip groups + DateRangePill + SearchInput
│   │   ├── Chip.tsx                          # NEW (filter chip; animated border when active)
│   │   ├── SearchInput.tsx                   # NEW (extracted from FilterBar; mono input with ⌕ lead)
│   │   ├── DateRangePill.tsx                 # NEW (popover with from / to inputs)
│   │   ├── DataTable.tsx                     # NEW (grid layout, sortable headers)
│   │   ├── DataRow.tsx                       # NEW (clickable row with hover glow)
│   │   ├── Sparkline.tsx                     # NEW (SVG)
│   │   ├── StatusPill.tsx                    # REWRITE: terminal-styled pill with pulsing Pending halo (keeps export name + Status prop)
│   │   ├── TypeLabel.tsx                     # NEW
│   │   ├── AmountCell.tsx                    # NEW (sparkline + tabular-nums amount + currency)
│   │   ├── SkeletonRows.tsx                  # REWRITE: shimmer sweep instead of animate-pulse. Keeps filename, exported name, and `data-testid="skeleton-row"` so existing test selectors are unchanged.
│   │   ├── PaginationBar.tsx                 # NEW
│   │   ├── Button.tsx                        # NEW (ghost variant)
│   │   ├── DetailPanel.tsx                   # NEW (slide-in container with backdrop + AnimatePresence)
│   │   ├── DetailField.tsx                   # NEW (label + value pair)
│   │   ├── EmptyState.tsx                    # NEW
│   │   └── ErrorBanner.tsx                   # NEW
│   ├── lib/
│   │   ├── listSearch.ts                     # KEEP (Zod schema, DEFAULT_LIST_SEARCH, isAnyFilterActive)
│   │   ├── useDebouncedValue.ts              # KEEP
│   │   ├── useReducedMotion.ts               # NEW (Framer's useReducedMotion + a static fallback for SSR/early-mount)
│   │   ├── format.ts                         # NEW (centralized Intl.NumberFormat — currently duplicated in routes/index.tsx and routes/transactions.$id.tsx)
│   │   └── queryClient.ts                    # KEEP
│   ├── api/
│   │   ├── client.ts                         # KEEP
│   │   └── transactions.ts                   # MODIFY: add fetchTransactionCount(filterParams) helper or reuse fetchTransactions + read total (stat strip data)
│   └── routes/
│       ├── __root.tsx                        # REWRITE: <Header> + <ScanBeam> + <main><Outlet /></main>
│       ├── _dashboard.tsx                    # NEW: pathless layout owning validateSearch, the list query,
│       │                                     #      and rendering <StatStrip /> + <FilterBar /> + <DataTable />
│       │                                     #      + <PaginationBar /> + <AnimatePresence><Outlet /></AnimatePresence>
│       ├── _dashboard.index.tsx              # NEW: matches /, component returns null
│       ├── _dashboard.transactions.$id.tsx   # NEW: renders <DetailPanel id={id} />
│       ├── index.tsx                         # DELETE: superseded by _dashboard.index.tsx (logic moves into _dashboard.tsx)
│       └── transactions.$id.tsx              # DELETE: superseded by _dashboard.transactions.$id.tsx
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
| `SkeletonRows` | Renders N shimmer placeholder `<tr>`s with C cells each (existing component, rewritten) |
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
| Skeleton shimmer | `SkeletonRows` cells | `--dur-shimmer` linear background-position sweep | solid line |
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
| **Initial loading** | `<SkeletonRows count={8} columns={7} />` in the table + 4 skeleton bars in the stat strip |
| **Refetch (filter change)** | Existing rows stay visible at 60 % opacity; 1 px cyan progress sliver under the filter bar (driven by TanStack Query `isFetching`) |
| **Error** | `ErrorBanner` above the table: "Couldn't load transactions · Retry" — filter bar stays interactive |
| **Empty** | Mono prompt "NO TRANSACTIONS MATCH THESE FILTERS" + ghost "Clear filters" `Button` (only when any filter param is non-default) |
| **Detail loading** | Panel slides in; field grid replaced by skeleton bars |
| **Detail 404** | Panel slides in; mono "TRANSACTION NOT FOUND · Back to list" link |

## Testing strategy

### Test compatibility & migration

The 15 existing tests in `list.spec.ts` and 3 in `detail.spec.ts` were written against the sub-project 2 UI. Several selectors are tied to the native `<select>` filter bar, the pastel pill classes, and the "Back to list" link in the full-route detail page. The redesign breaks those selectors. The plan is to **update the tests as part of this work** (tests track UX; if UX changes, assertions change) — but only where strictly required.

| Existing assertion | Today's selector | After redesign | Fix |
|---|---|---|---|
| Header title | `getByRole('heading', { name: 'LedgerOne' })` | `<Header />` shows `LEDGER//ONE` styled text | Update test to `getByRole('banner').getByText(/LEDGER\/\/ONE/)` OR add `aria-label="LedgerOne"` on the Header element so existing query passes |
| Type filter | `getByLabel('Type').selectOption('Buy')` | Chip group: 6 buttons (`All`, `Buy`, …, `Dividend`) | `getByRole('button', { name: 'Buy', exact: true })` inside `getByLabel('Type')` (label-wrapped role-group), OR `page.locator('[data-testid="type-chip-Buy"]').click()` |
| Status filter | `getByLabel('Status').selectOption('Pending')` | Chip group: 4 buttons | Same pattern as Type |
| Sort | `getByLabel('Sort').selectOption('amount:desc')` | Click on `AMOUNT` table header (toggles `sortDir`) | `page.getByRole('columnheader', { name: 'AMOUNT' }).click()` (twice if needed to reach desc) |
| Page size | `getByLabel('Page size').selectOption('50')` | Small mono `<select>` to the right of the page indicator (kept as `<select>` because chip-group for 3 options is overkill) | Selector unchanged ✔ |
| From / To dates | `getByLabel('From')` / `getByLabel('To')` | `<DateRangePill />` popover with two native `<input type="date">` inside | After opening the pill, selector still finds the inputs by their `<label>` text — keep `From` / `To` labels inside the popover |
| Search | `getByLabel('Search').fill('AAPL')` | `<SearchInput />` styled mono input | Keep `<label>Search</label>` wrapper — selector unchanged ✔ |
| Skeleton row | `tbody tr[data-testid="skeleton-row"]` | New shimmer skeleton keeps the same `data-testid` | Unchanged ✔ |
| Status pill class | `expect(pill).toHaveClass(/bg-(green\|yellow\|red)-100/)` | New pill uses `bg-emerald-…` / `bg-amber-…` / `bg-rose-…` Tailwind classes | Replace with `expect(pill).toHaveAttribute('data-status', /Settled\|Pending\|Cancelled/)` and have `StatusPill` carry that attribute. More robust than class-name matching. |
| Pagination text | `getByText(/Page 2 of \d+/)` | Pagination still reads "PAGE 2 / 337" (uppercase, slash separator) | Update regex: `/PAGE\s+2\s*\/\s*\d+/i` |
| Prev / Next | `getByRole('button', { name: 'Next' })` / `'Prev'` | `<PaginationBar />` uses `‹ PREV` and `NEXT ›` | Buttons keep accessible names `Prev` / `Next` via `aria-label`; visible text stays decorative |
| Empty state | `getByText('No transactions')` / `'No transactions match these filters'` | New mono uppercase strings | Update to `/NO TRANSACTIONS/i` regex OR keep the exact mixed-case strings and let CSS uppercase them (`text-transform: uppercase`) — **chosen: CSS uppercase** so existing string assertions pass unchanged |
| Empty state action | `getByRole('button', { name: 'Clear Filters' })` | `<Button>` keeps the text "Clear Filters" | Unchanged ✔ |
| Error banner | `getByText("Couldn't load transactions")` | New rose banner keeps the same string | Unchanged ✔ |
| Row click | `tbody tr[role="button"]` | `<DataRow />` keeps `role="button"` + `tabIndex={0}` + click + Enter handlers | Unchanged ✔ |
| Back to list | `detail.spec.ts: getByRole('link', { name: /Back to list/ })` | Overlay panel has no "Back to list" link — close is via × button, Esc, or backdrop click | **Replace** with `page.keyboard.press('Escape')` or `page.getByRole('button', { name: 'Close' })` |
| Detail page content | `detail.spec.ts: getByText('Account', { exact: true })` | Same field labels render inside the panel | Unchanged ✔ |
| Detail 404 message | `getByText('Transaction not found')` | Same string (CSS-uppercased) | Unchanged ✔ |
| "Return to the list" link | `getByRole('link', { name: 'Return to the list' })` | Panel still offers a return link on 404 | Unchanged ✔ |

Pattern: where the redesign is purely visual (uppercase, color), use **CSS to preserve the underlying DOM text** so existing string-based selectors don't break. Where the redesign is structural (chips for selects, header-click sort, overlay panel), update test selectors and add stable `data-*` hooks (`data-testid`, `data-status`, `data-motion-id`, `data-motion-state`) so tests don't reach into styling concerns.

### Playwright tests after the redesign

**`list.spec.ts`** — keep all 15 existing tests with the targeted selector updates above. Additionally:

- Stat strip renders 4 cards; the two real-data counters end at non-zero values after first paint (Total ≥ 60 because the fixture seeds 60 rows; Pending ≥ 1).

**`detail.spec.ts`** — keep the 3 existing tests with selector updates for panel close (Esc / close button) instead of "Back to list" link. Add:

- Esc closes the panel and URL returns to `/` with filters preserved.
- Backdrop click closes the panel.
- After close, the list is still visible underneath (proves the list never unmounted).

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

The starting state is the fully-functional sub-project 2 implementation (commits `fbb0eea` → `3ce3b39`). Every step below preserves the green test suite — broken tests get their selectors updated *in the same commit* as the UI change that breaks them (per the Test compatibility table above). Writing-plans will refine each step into atomic tasks.

1. **Deps**: add `motion` (v12), `@fontsource/inter`, `@fontsource/jetbrains-mono`; commit lockfile.
2. **Tokens & fonts**: rewrite `src/styles.css` with `@theme` block + `@import "@fontsource/inter"` + `@import "@fontsource/jetbrains-mono"` + body background / text-color / font-family defaults. Dev server boots; existing list looks broken (light-on-light) but tests still pass against the DOM.
3. **Foundational reskin primitives** (in isolation, against stub data):
   1. **StatusPill rewrite**: terminal-styled green / amber / rose pills with pulsing-halo Pending. Adds `data-status` attribute. Update the one existing pill test to `expect(pill).toHaveAttribute('data-status', ...)` in the same commit.
   2. **SkeletonRows rewrite**: keep the existing filename, exported name, and `(count, columns)` API. Replace `animate-pulse bg-gray-200` cell content with the shimmer sweep. Preserves `data-testid="skeleton-row"` so no test changes.
   3. **Button**, **EmptyState**, **ErrorBanner**, **TypeLabel** — new primitives, no test impact yet.
4. **Header + ScanBeam, then rewrite `__root.tsx`**: Header renders logo (with blinking dot), LIVE indicator, session ID (decorative), live clock via `setInterval`. ScanBeam is the 1 px cyan sweep at the top. Add `aria-label="LedgerOne"` (or keep accessible text) so the existing `getByRole('heading', { name: 'LedgerOne' })` test passes — or update the test to `getByRole('banner').getByText(/LEDGER\/\/ONE/)` in the same commit.
5. **Counter + StatCard + StatStrip**: animated number with `requestAnimationFrame`. Wire Total + Pending to additional `fetchTransactions({ page: 1, pageSize: 1, ... })` queries (one unfiltered for Total, one with `status: 'Pending'` for Pending). Volume + Advisors render hardcoded atmospheric values. Add one new Playwright assertion: 4 cards present, real counters end at non-zero.
6. **Table primitives**: `DataTable` (grid layout with sortable header — clicking the `DATE` or `AMOUNT` header navigates to update `sortBy` / `sortDir`), `DataRow` (hover glow + Framer layout animation on the left bar), `AmountCell` (uses `lib/format.ts`), `Sparkline` (SVG draw-in). Update the Sort test from `getByLabel('Sort').selectOption('amount:desc')` to `page.getByRole('columnheader', { name: 'AMOUNT' }).click()` in the same commit.
7. **PaginationBar with page-turn motion**: `AnimatePresence` keyed on page. Visible text uses `‹ PREV` / `NEXT ›` but `aria-label`s stay `Prev` / `Next`. "Page X of Y" becomes "PAGE X / Y" — update the regex in tests in the same commit.
8. **FilterBar rewrite** (the structural one):
   1. **Type chip group**: replaces native `<select>`. Wrap chips in `<fieldset>` with `<legend>Type</legend>` so the `getByLabel('Type')` query still anchors. Add `data-testid="type-chip-{name}"` on each chip. Update the Type test selector in the same commit.
   2. **Status chip group**: same pattern.
   3. **DateRangePill**: popover trigger button + popover with two `<input type="date">` carrying `From` and `To` labels (preserves the date label selectors).
   4. **SearchInput**: extract from existing FilterBar; keeps `<label>Search</label>` (selector unchanged).
   5. **Page size**: keep the existing native `<select>` (chip group is overkill for 3 options); preserves the `getByLabel('Page size')` selector.
   6. **Remove the old Sort dropdown** — sorting moves to header clicks (step 6).
9. **Pathless layout migration**: create `routes/_dashboard.tsx` (pathless layout owning `validateSearch` and the list query) + `routes/_dashboard.index.tsx` (returns `null`). Move the list-rendering logic from `routes/index.tsx` into `_dashboard.tsx`. The dashboard layout renders `<StatStrip />` + `<FilterBar />` + `<DataTable />` + `<PaginationBar />` + `<AnimatePresence><Outlet /></AnimatePresence>`. Delete `routes/index.tsx`. URL contract unchanged; existing tests for the list page still pass.
10. **States polish**: error banner styling (rose-bordered), refetch dim (`isFetching` → 60 % opacity on rows + 1 px progress sliver under the filter bar), empty-state mono text with CSS uppercase (preserves underlying "No transactions match these filters" string for existing tests).
11. **Detail panel route**:
    1. Create `routes/_dashboard.transactions.$id.tsx` with `<DetailPanel id={id} />` — fixed-position, slide-in via Framer Motion, backdrop + close on Esc / backdrop click / × button. `DetailField` grid + Notes section. 404 path renders "TRANSACTION NOT FOUND" inside the panel.
    2. Delete the old `routes/transactions.$id.tsx`.
    3. Update `detail.spec.ts`: replace the "Back to list" link query with `page.keyboard.press('Escape')` for one test and `getByRole('button', { name: 'Close' })` for another. Add a new test asserting the list is still visible underneath the panel.
12. **format.ts centralization**: extract the duplicated `Intl.NumberFormat('en-CA', ...)` call from the now-deleted index/detail routes into `lib/format.ts`; `AmountCell` and `DetailField` both import from it.
13. **Reduced-motion sweep**: confirm every animated primitive honors `useReducedMotion()` (Framer + media query). Add `motion.spec.ts` with the wiring assertions and the `reducedMotion: 'reduce'` pass.
14. **`make check` cleanup**: lint, prettier, `tsc --noEmit`, `dotnet format` (no-op for this work), all Playwright tests green. Final commit closes the spec.

## Open items (still deferred)

- Sub-project 3 chat drawer surface — will be specced separately when sub-project 3 begins.
- Accessibility audit beyond keyboard support — PRD §3 Non-Goal.
- Mobile / tablet responsive — desktop-first, deliberate.
- Light theme — explicitly excluded.
