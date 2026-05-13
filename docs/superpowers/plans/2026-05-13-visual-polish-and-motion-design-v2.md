# Visual Polish & Motion Design Implementation Plan v2 — Terminal Dense (full-app)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Supersedes** `docs/superpowers/plans/2026-05-13-visual-polish-and-motion-design.md` (v1). v1 was written when sub-project 3 was unbuilt; the codebase has since drifted significantly. This v2 incorporates the actual current state and the architectural decisions made during rescope.

**Goal:** Reskin the entire LedgerOne app to Terminal Dense (dashboard + chat drawer + /docs page), migrate the transaction detail from a full-route page to an overlay panel that is mutually exclusive with the chat drawer, and expose the backend's MinAmount/MaxAmount filter in the UI — while keeping the full Playwright suite (list + detail + 8 chat tests) green throughout.

**Architecture:** Tailwind v4 `@theme` block layered over the existing shadcn HSL custom-property system. We force the app permanently into shadcn's `.dark` mode and remap its HSL values to Terminal Dense, so shadcn-driven components (Sheet, future shadcn primitives) read the new palette without any class-level rewrites. Custom utility classes (`bg-bg`, `text-cyan`, etc.) come from a parallel @theme block. Framer Motion (`motion` v12) for orchestrated motion. The shadcn `Sheet` primitive is reused for the DetailPanel (same slide-from-right mechanics as the existing ChatDrawer); mutual exclusion is handled via shared open state derived from the URL.

**Tech Stack:** Vite 8 + React 19 + TypeScript strict, Tailwind v4, TanStack Router (file-based), TanStack Query, Zod 4, Framer Motion v12, shadcn/ui (already in repo: Sheet via Radix Dialog, lucide-react icons, class-variance-authority, clsx, tailwind-merge, `@/lib/utils#cn`), `@fontsource/inter`, `@fontsource/jetbrains-mono`, Playwright (Chromium).

**Specs:**
- `docs/superpowers/specs/2026-05-13-visual-polish-and-motion-design.md` (v1 design contract; still applies for color/type/motion tokens, primitive responsibilities, motion system, reduced-motion behavior)
- This document supersedes v1's "Routing", "Current implementation state", "Test compatibility & migration", "Scope", and "Build order" sections.

---

## What changed since plan v1 was written (commits after `ba099c7`)

The following landed between plan v1 and now (in commit order):

- `892a92f` Add MinAmount/MaxAmount to ListTransactionsRequest with range validation
- `ab84e32` Apply MinAmount/MaxAmount filters in ListTransactionsHandler
- `5a8d7b3` Fix: bind dev launch profile to :5000
- `0127f1d` Broaden search clause to match AdvisorName in addition to AccountId/SecuritySymbol
- `d086d57` Deploy config + root CLAUDE.md
- `e76b86d` Add Anthropic SDK NuGet (12.20.1)
- `b95bfd9` Chat DTOs, validator, ChatController stub
- `c0d376c` ITransactionTools wrapping List/Get handlers
- `f2c2975` IChatAgent abstraction, ChatPrompts, FakeChatAgent
- `a0b3f98` Chat-specific exception types mapped to 503/502/504 Problem Details
- `e3428f3` ChatHandler with linked-CTS timeout and iteration cap
- `589a3d6` Emit OpenAPI spec from .NET; document every endpoint
- `4feb72c` /docs page rendering live OpenAPI spec + design narrative
- `1fb3b33` Wire ChatController to ChatHandler; FakeChatAgent-backed integration tests
- `3cb7cf7` Implement real AnthropicChatAgent (manual ReAct loop, Haiku 4.5)
- `26f2998` Live-API smoke test gated by ANTHROPIC_API_KEY
- `0cae57b` Bootstrap shadcn/ui and add Sheet component (@radix-ui/react-dialog)
- `0ce1428` Add react-markdown + remark-gfm with Tailwind-styled wrapper
- `c632c85` apiPost + ApiError; src/api/chat.ts (types + postChat fetcher)
- `3fd16e9` ToolCallCard component
- `39e5ec4` MessageBubble (user-right, assistant-left + tool cards + markdown)
- `5f48941` Composer (textarea + send, Cmd/Ctrl+Enter, disabled-while-pending)
- `3b4d9f5` SeedPrompts (three PRD example queries)
- `1c564fd` ChatPanel (message state, useMutation, AbortController, Retry)
- `da90a97` Mount ChatDrawer (shadcn Sheet, side=right) on the list page
- `1e0536a` Playwright: 8 chat tests
- `6ff90cd` Document the chat surface
- `9552acf` Cleanup: lint + format pass for sub-project 3

**Net effect on the spec-time assumptions:**

| Plan v1 assumption | Reality now |
|---|---|
| shadcn is forbidden ("defaults clash") | shadcn/ui is installed; Sheet wraps the chat drawer |
| `__root.tsx` is a plain header to be rewritten | `__root.tsx` has Dashboard ↔ API Docs nav links; must be preserved |
| List page is just the table + filter bar | List page has its own `<h1>Transactions</h1>` + `<ChatDrawer />` header section |
| Detail panel will own the right edge via custom slide | ChatDrawer already owns the right edge via shadcn Sheet; mutual exclusion is required |
| The frontend has no `/docs` route | `/docs` exists with a full OpenAPI explorer + design-decision content |
| `listSearch.ts` schema is the full filter surface | Backend has MinAmount/MaxAmount that the schema doesn't expose |
| Search filter matches account or symbol | Search now also matches AdvisorName (placeholder copy lies) |
| No backend chat infrastructure | Anthropic SDK + ChatHandler + ITransactionTools + ChatAgent are live |
| `styles.css` is one line | `styles.css` already has shadcn `:root` (light) + `.dark` (dark) HSL blocks |

---

## Architectural decisions made during rescope

### Decision 1 — Right-edge UX: mutually exclusive

Both `DetailPanel` and `ChatDrawer` slide in from the right. Opening one closes the other. Implementation: the dashboard layout reads the URL and the drawer's local `open` state; if `/transactions/$id` is active and the user opens the chat, we `navigate({ to: '/', search: prev })` first. Conversely, the row-click handler that opens the detail panel checks if the chat is open and closes it before navigating. The URL is the source of truth for the detail; the chat's `open` state is local to `ChatDrawer`. We lift that state up via a context (`PanelExclusion`) so both surfaces can see each other.

### Decision 2 — Polish coverage: whole app

Dashboard, ChatDrawer (and its sub-components), and the `/docs` page all flip to Terminal Dense. Sub-component restyling is replacing `slate-*` / `blue-*` / `gray-*` / `red-*` Tailwind classes with our token-aware utilities, and updating the bg-background / text-foreground HSL values via `.dark` overrides so shadcn primitives inherit the new theme without code changes.

### Decision 3 — Token strategy: layered (shadcn HSL + @theme)

We do not remove the existing shadcn `:root` and `.dark` blocks. We:

1. Override the `.dark` HSL values to map shadcn semantic tokens (`--background`, `--foreground`, `--muted-foreground`, `--border`, `--ring`, `--secondary`, etc.) to Terminal Dense equivalents.
2. Add `<html class="dark">` permanently (no theme toggle in scope).
3. Add a Tailwind v4 `@theme` block alongside that defines our hex-value design tokens (`--color-bg`, `--color-cyan`, `--color-amber`, etc.) which generate utility classes like `bg-cyan`, `text-text-bright`, `border-line`.

The two systems coexist: shadcn primitives keep using `bg-background`/`text-foreground`; our custom code uses `bg-cyan`/`text-text-bright`. Both end up Terminal Dense.

### Decision 4 — Reuse shadcn Sheet for DetailPanel

Rather than building a custom slide-in from scratch (plan v1's `DetailPanel.tsx`), we reuse the existing shadcn `Sheet` for the detail panel too. Same slide mechanics as the ChatDrawer = visual consistency, less code, less duplication of motion logic. The detail-specific content (DetailField grid + Notes + close routing) wraps `<SheetContent>`. This change supersedes plan v1 Task 21.

### Decision 5 — MinAmount/MaxAmount as part of the filter bar rewrite

Add `minAmount` and `maxAmount` (both optional `z.coerce.number()` in the zod schema) to `listSearch.ts`. Surface them in the `FilterBar` rewrite as a compact `Amount $min – $max` pair of mono number inputs in the same row as the other filters. `isAnyFilterActive` extends to include them. `api/transactions.ts` query-string builder appends them when present.

### Decision 6 — Preserve the Dashboard / API Docs nav

The Header rewrite (plan v1 Task 6+7) gains a nav segment between the logo and the live-clock cluster. The two nav links keep their `to="/"` and `to="/docs"` targets; we restyle them to Terminal Dense (mono uppercase, cyan-on-active).

---

## File Plan v2 (delta from plan v1)

**New files (same as v1):**

Same primitives as v1 except: `DetailPanel.tsx` is replaced by `DetailSheet.tsx` (uses shadcn Sheet under the hood, see Decision 4).

```
frontend/src/
├── components/
│   ├── Header.tsx                         # NEW (with Dashboard/Docs nav inside)
│   ├── ScanBeam.tsx                       # NEW
│   ├── StatStrip.tsx                      # NEW
│   ├── StatCard.tsx                       # NEW
│   ├── Counter.tsx                        # NEW
│   ├── Chip.tsx                           # NEW
│   ├── SearchInput.tsx                    # NEW
│   ├── DateRangePill.tsx                  # NEW
│   ├── AmountRangeInput.tsx               # NEW (MinAmount/MaxAmount pair)
│   ├── DataTable.tsx                      # NEW
│   ├── DataRow.tsx                        # NEW
│   ├── Sparkline.tsx                      # NEW
│   ├── TypeLabel.tsx                      # NEW
│   ├── AmountCell.tsx                     # NEW
│   ├── PaginationBar.tsx                  # NEW
│   ├── Button.tsx                         # NEW
│   ├── DetailSheet.tsx                    # NEW (replaces v1's DetailPanel.tsx — wraps shadcn Sheet)
│   ├── DetailField.tsx                    # NEW
│   ├── EmptyState.tsx                     # NEW
│   ├── ErrorBanner.tsx                    # NEW
│   └── PanelExclusion.tsx                 # NEW (context for mutex between DetailSheet and ChatDrawer)
├── lib/
│   ├── useReducedMotion.ts                # NEW
│   ├── format.ts                          # NEW
│   └── statStrip.ts                       # NEW
└── routes/
    ├── _dashboard.tsx                     # NEW (pathless layout)
    ├── _dashboard.index.tsx               # NEW (matches /, returns null)
    └── _dashboard.transactions.$id.tsx    # NEW (renders DetailSheet)

frontend/e2e/
└── motion.spec.ts                         # NEW
```

**Rewritten files:**

```
frontend/
├── package.json                            # MODIFY: + motion, + @fontsource/{inter, jetbrains-mono}
├── src/
│   ├── styles.css                          # REWRITE: keep shadcn HSL system, remap .dark values to Terminal Dense, add @theme block, add @import fonts, add ambient keyframes
│   ├── lib/
│   │   └── listSearch.ts                   # MODIFY: + minAmount, + maxAmount, + isAnyFilterActive update
│   ├── api/
│   │   └── transactions.ts                 # MODIFY: send minAmount/maxAmount; ListTransactionsParams gains 2 optional fields
│   ├── components/
│   │   ├── StatusPill.tsx                  # REWRITE: terminal-styled with data-status + Pending pulse
│   │   ├── SkeletonRows.tsx                # REWRITE: shimmer (preserves filename + API + data-testid)
│   │   ├── FilterBar.tsx                   # REWRITE: chip groups + DateRangePill + AmountRangeInput + SearchInput, no Sort dropdown (header clicks)
│   │   ├── chat/
│   │   │   ├── ChatDrawer.tsx              # REWRITE: terminal styling on trigger + SheetHeader; integrate with PanelExclusion context
│   │   │   ├── ChatPanel.tsx               # MODIFY: restyle "Thinking…" indicator, Retry button colors
│   │   │   ├── MessageBubble.tsx           # REWRITE: cyan user bubble, dark assistant bubble with cyan-tinted border
│   │   │   ├── Composer.tsx                # REWRITE: dark textarea, cyan Send button
│   │   │   ├── SeedPrompts.tsx             # REWRITE: dark prompt cards with cyan hover
│   │   │   └── ToolCallCard.tsx            # REWRITE: dark collapsible with cyan/rose borders
│   │   └── docs/
│   │       ├── DocsSidebar.tsx             # REWRITE: dark sidebar with cyan active links
│   │       ├── EndpointCard.tsx            # REWRITE: dark card with method-badge color tokens
│   │       ├── DecisionCard.tsx            # REWRITE: dark card with mono labels
│   │       ├── MethodBadge.tsx             # REWRITE: terminal-styled badges
│   │       ├── SchemaTable.tsx             # REWRITE: dark table with mono columns
│   │       └── TryItPanel.tsx              # REWRITE: dark form, cyan execute button
│   └── routes/
│       ├── __root.tsx                      # REWRITE: <html class="dark"> via root element; render <Header /> with embedded Dashboard/Docs nav + <ScanBeam /> + <main><Outlet /></main>
│       ├── docs.tsx                        # MODIFY: restyle inline sections (Overview, Authentication, DataModel, etc.) to use new tokens
│       └── index.tsx                       # DELETE: logic moves to _dashboard.tsx
└── e2e/
    ├── list.spec.ts                        # MODIFY: selectors for chip filters, header-click sort, amount range, mono pagination text
    ├── detail.spec.ts                      # MODIFY: Esc / close-button / backdrop instead of "Back to list"; assert list stays mounted; assert mutex with chat
    └── chat.spec.ts                        # MODIFY: selectors for new bubble/composer/seed-prompt styling — most assertions are by data-testid (already present) and survive unchanged; only color-class assertions need updating
```

**Deleted files:**

```
frontend/src/routes/index.tsx
frontend/src/routes/transactions.$id.tsx
```

**Untouched (sub-project 2/3 KEEP files):**

```
frontend/src/api/{client,chat,openapi}.ts
frontend/src/lib/{useDebouncedValue,markdown,queryClient,utils}.ts
frontend/src/components/ui/sheet.tsx
frontend/src/docs/*.ts
frontend/src/api/openapi.ts
backend/ (everything)
```

---

## Conventions

- Every task is **one logical change** with a single commit at the end.
- The Playwright suite stays green between commits — selectors update in the same commit as the UI change that breaks them (see Test Compatibility section per phase).
- Commit messages: short imperative subject (no `feat:` prefix), descriptive body, co-authored trailer:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Run commands assume `frontend/` cwd unless otherwise stated.
- Push to origin at the end of each Phase (every 2-4 tasks).
- All new components use named exports.

---

# Phase 1 — Dependencies, tokens, and dark-mode shim

### Task 1: Add Framer Motion + font dependencies

Same as plan v1 Task 1 — unchanged.

- [ ] **Step 1:** `npm install motion@^12 @fontsource/inter@^5 @fontsource/jetbrains-mono@^5`
- [ ] **Step 2:** `npm run dev` boots cleanly, Ctrl+C
- [ ] **Step 3:** `git add frontend/package.json frontend/package-lock.json && git commit -m "Deps: motion v12, @fontsource/{inter, jetbrains-mono}\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`

---

### Task 2: Rewrite styles.css — remap shadcn .dark + add @theme + fonts + keyframes

**Files:**
- Rewrite: `frontend/src/styles.css`

- [ ] **Step 1: Replace styles.css with the full layered token system**

The new file keeps shadcn's `:root` block (so light-mode shadcn values still exist as a fallback for any class that doesn't use the dark variants) but overrides `.dark` to Terminal Dense HSL values. Then it adds the Tailwind v4 `@theme` block for our hex-value design tokens, font imports, and the ambient keyframes used by ScanBeam, StatusPill, SkeletonRows, Chip, Header.

```css
@import 'tailwindcss';

@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
@import '@fontsource/jetbrains-mono/600.css';

@layer base {
  :root {
    /* Light-mode shadcn defaults (preserved for any unstyled fallback) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    /* Terminal Dense shadcn token overrides — values are HSL components (no hsl() wrapper) */
    --background: 222 60% 4%;            /* ≈ #06080F */
    --foreground: 217 13% 84%;           /* ≈ #D1D5DB */
    --card: 222 47% 9%;                  /* ≈ #0C1120 */
    --card-foreground: 220 16% 95%;      /* ≈ #F3F4F6 */
    --popover: 222 47% 9%;
    --popover-foreground: 220 16% 95%;
    --primary: 187 88% 53%;              /* ≈ #22D3EE (cyan) */
    --primary-foreground: 222 60% 4%;
    --secondary: 222 36% 13%;            /* ≈ #131A2E */
    --secondary-foreground: 220 16% 95%;
    --muted: 222 36% 13%;
    --muted-foreground: 220 9% 46%;      /* ≈ #6B7280 */
    --accent: 222 36% 13%;
    --accent-foreground: 187 88% 53%;
    --destructive: 350 89% 60%;          /* ≈ #F43F5E */
    --destructive-foreground: 220 16% 95%;
    --border: 220 32% 14%;               /* ≈ #182032 */
    --input: 220 32% 14%;
    --ring: 187 88% 53%;
    --radius: 0.375rem;
  }

  * {
    border-color: hsl(var(--border));
  }
  html,
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-feature-settings: 'cv11', 'ss01';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ::selection {
    background-color: rgba(34, 211, 238, 0.35);
    color: hsl(var(--card-foreground));
  }
}

@theme {
  /* Tailwind v4 design tokens — generate utility classes (bg-bg, text-cyan, etc.) */
  --color-bg: #06080F;
  --color-bg-elev: #0C1120;
  --color-bg-elev-2: #131A2E;
  --color-line: #182032;
  --color-line-strong: #1F2A44;
  --color-text: #D1D5DB;
  --color-text-dim: #6B7280;
  --color-text-bright: #F3F4F6;
  --color-cyan: #22D3EE;
  --color-cyan-glow: rgba(34, 211, 238, 0.35);
  --color-amber: #FBBF24;
  --color-green: #22C55E;
  --color-rose: #F43F5E;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;

  --ease-snap: cubic-bezier(0.32, 0.72, 0, 1);
}

/* Mono numerals helper */
.tabular-nums,
.font-mono {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

/* Ambient motion keyframes */
@keyframes scan-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes pulse-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0); }
}

@keyframes shimmer-sweep {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes blink-dim {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes border-rotate {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
}
```

- [ ] **Step 2: Force the `.dark` class on the html element**

We add the class in the next task (when we rewrite `__root.tsx`). For this task, temporarily add it to `frontend/index.html` so the dev-server preview reflects the new theme immediately:

Open `frontend/index.html` and change the `<html>` tag:

```html
<html lang="en" class="dark">
```

- [ ] **Step 3: Verify dev boots, TypeScript still clean**

```bash
npm run dev
# Eyeball: page should be dark; sub-project 2 components will look broken on top.
# Ctrl+C
npx tsc --noEmit
npx eslint .
```

Expected: PASS.

- [ ] **Step 4: Run the full Playwright suite**

```bash
npx playwright test
```

The dark theme may break a couple of color-related selectors in the existing tests. Note any failures (likely in the StatusPill class assertion — `bg-green-100` etc.) and DO NOT fix them yet; they get fixed in Task 3 when we rewrite StatusPill. If only that single class-name assertion fails, proceed. If anything else fails, STOP and investigate.

Expected: at most the `status pill renders with semantic color class` test fails on the pastel class regex. All others (chat, detail, list pagination, skeleton, error retry) should remain green — they query by `data-testid`, `role`, or text content, not by color class.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css frontend/index.html
git commit -m "$(cat <<'EOF'
Tokens: remap shadcn .dark to Terminal Dense + @theme block + fonts

Keeps shadcn's :root/.dark HSL system (so bg-background/text-foreground
classes used by Sheet, future shadcn primitives, etc. all inherit the
new palette). Adds Tailwind v4 @theme block for custom hex tokens
(bg-cyan, text-text-bright, border-line). Adds JetBrains Mono + Inter
via fontsource. Adds ambient keyframes (scan-sweep, pulse-halo,
shimmer-sweep, blink-dim, border-rotate). Global reduced-motion media
query zeros all animations. The .dark class on <html> in index.html
flips the app into dark mode permanently — there's no theme toggle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 2 — Schema extensions: MinAmount/MaxAmount + AdvisorName search

### Task 3: Extend listSearch.ts schema and API params

**Files:**
- Modify: `frontend/src/lib/listSearch.ts`
- Modify: `frontend/src/api/transactions.ts`

- [ ] **Step 1: Add minAmount/maxAmount to the zod schema**

Replace the `listSearchSchema` definition in `frontend/src/lib/listSearch.ts` (lines 5-21) with:

```ts
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
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(['date', 'amount']).default('date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
```

- [ ] **Step 2: Update `isAnyFilterActive` to include the new fields**

Replace the function (lines 32-40) with:

```ts
export function isAnyFilterActive(search: ListSearch): boolean {
  return Boolean(
    search.fromDate ||
    search.toDate ||
    search.type ||
    search.status ||
    search.minAmount !== undefined ||
    search.maxAmount !== undefined ||
    (search.search && search.search.trim().length > 0),
  );
}
```

- [ ] **Step 3: Extend `ListTransactionsParams` and `fetchTransactions`**

Open `frontend/src/api/transactions.ts`. Modify the `ListTransactionsParams` interface to add the two fields:

```ts
export interface ListTransactionsParams {
  page: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy: SortField;
  sortDir: SortDirection;
}
```

And update `fetchTransactions` to forward them:

```ts
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
  if (params.minAmount !== undefined) qs.set('minAmount', String(params.minAmount));
  if (params.maxAmount !== undefined) qs.set('maxAmount', String(params.maxAmount));
  return apiGet<ListTransactionsResponse>(`/api/transactions?${qs}`, signal);
}
```

- [ ] **Step 4: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS. The existing FilterBar doesn't render these yet (it'll come in Phase 5), so no UI change.

- [ ] **Step 5: Verify Playwright**

```bash
npx playwright test
```

Expected: same status as after Task 2 (status pill test may still fail; all others green).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/listSearch.ts frontend/src/api/transactions.ts
git commit -m "$(cat <<'EOF'
listSearch + api: surface MinAmount/MaxAmount in URL state

Backend has supported MinAmount/MaxAmount range filters since 892a92f
but the frontend zod schema didn't expose them. Add them as optional
non-negative numbers in listSearchSchema, fold into isAnyFilterActive,
and forward through fetchTransactions. FilterBar UI follows in Phase 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 3 — Reskin existing primitives (StatusPill, SkeletonRows)

### Task 4: StatusPill rewrite

Same as plan v1 Task 3 — code unchanged. Use plan v1 §Task 3 Steps 1-6 verbatim (the test selector updates and the new component code).

- [ ] **Step 1-6:** See plan v1 Task 3 (`docs/superpowers/plans/2026-05-13-visual-polish-and-motion-design.md` lines 153-244). Apply unchanged. Commit message stays as plan v1.

---

### Task 5: SkeletonRows rewrite

Same as plan v1 Task 4 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 4. Apply unchanged.

---

# Phase 4 — Foundational new primitives

### Task 6: Button + EmptyState + ErrorBanner + TypeLabel

Same as plan v1 Task 5 — code unchanged. Apply verbatim.

- [ ] **Step 1-6:** See plan v1 Task 5.

---

# Phase 5 — Header (with nav) + ScanBeam + root layout

### Task 7: ScanBeam + Header (with embedded Dashboard/Docs nav)

**Files:**
- Create: `frontend/src/components/ScanBeam.tsx`
- Create: `frontend/src/components/Header.tsx`

ScanBeam is identical to plan v1 Task 6. Header is **different from plan v1** — it embeds the existing nav.

- [ ] **Step 1: Create ScanBeam.tsx** (same as plan v1 Task 6 Step 1):

```tsx
export function ScanBeam() {
  return (
    <div
      data-motion-id="scan-beam"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px overflow-hidden"
    >
      <div
        className="h-full w-1/3 bg-[linear-gradient(90deg,transparent_0%,var(--color-cyan)_40%,var(--color-cyan)_60%,transparent_100%)] animate-[scan-sweep_4s_linear_infinite]"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create Header.tsx with embedded nav**

```tsx
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

const NAV_BASE =
  'rounded-[3px] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-[120ms]';
const NAV_ACTIVE = 'bg-cyan/[0.12] text-cyan border border-cyan/40';
const NAV_INACTIVE =
  'text-text-dim hover:text-text-bright border border-transparent hover:border-line-strong';

export function Header() {
  const now = useLiveClock();
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} EDT`;

  return (
    <header
      role="banner"
      aria-label="LedgerOne"
      className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-6 px-6 py-3 lg:px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 font-mono text-[13px] font-bold tracking-[0.18em] text-cyan">
            <span
              data-motion-id="logo-dot"
              className="block h-2 w-2 rounded-full bg-cyan shadow-[0_0_14px_var(--color-cyan-glow)] animate-[blink-dim_2s_ease-in-out_infinite]"
            />
            LEDGER//ONE
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: `${NAV_BASE} ${NAV_ACTIVE}` }}
              inactiveProps={{ className: `${NAV_BASE} ${NAV_INACTIVE}` }}
            >
              Dashboard
            </Link>
            <Link
              to="/docs"
              activeProps={{ className: `${NAV_BASE} ${NAV_ACTIVE}` }}
              inactiveProps={{ className: `${NAV_BASE} ${NAV_INACTIVE}` }}
            >
              API Docs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px] text-text-dim">
          <span className="inline-flex items-center gap-2 text-emerald-400">
            <span
              data-motion-id="live-dot"
              className="block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-[blink-dim_1.4s_ease-in-out_infinite]"
            />
            LIVE
          </span>
          <span>SESSION 04A2-F1</span>
          <span className="tabular-nums text-text-bright">{clock}</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ScanBeam.tsx frontend/src/components/Header.tsx
git commit -m "$(cat <<'EOF'
Primitives: ScanBeam + Header with embedded Dashboard/API Docs nav

Header preserves the two-route navigation that __root.tsx had before
(commit d086d57). Active route gets a cyan-bordered chip with cyan
text; inactive routes are dim mono uppercase. Logo + LIVE + SESSION
+ live clock fill the rest of the bar. The header carries
role="banner" and aria-label="LedgerOne" so any test that queries the
brand can use getByRole('banner') or scope by it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Rewrite __root.tsx — Header + ScanBeam + Outlet

**Files:**
- Rewrite: `frontend/src/routes/__root.tsx`
- Modify: `frontend/e2e/list.spec.ts` (heading test)

- [ ] **Step 1: Update the heading test in list.spec.ts**

Find the `list page loads and shows table with rows` test. Replace the first assertion:

```ts
test('list page loads and shows table with rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('LEDGER//ONE');
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(7);
  await expect(table.locator('tbody tr')).toHaveCount(25);
});
```

- [ ] **Step 2: Rewrite __root.tsx**

Replace the entire contents:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <ScanBeam />
      <Header />
      <main className="px-6 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run the Playwright suite**

```bash
npx playwright test
```

Expected: list tests pass with updated heading selector. Chat tests and detail tests pass (they don't query the brand). The status pill test passes (we fixed it in Task 4).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/__root.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
__root.tsx: Header + ScanBeam shell; update heading test selector

Replaces the plain <h1>LedgerOne</h1> + nav row with the new Header
primitive (logo + nav + LIVE + clock) and adds the fixed ScanBeam at
viewport top. List test queries getByRole('banner') for the brand text.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 6 — Stat strip (Counter + StatCard + StatStrip)

### Task 9: Counter + useReducedMotion stub

Same as plan v1 Task 8 — unchanged.

- [ ] **Step 1-4:** See plan v1 Task 8.

---

### Task 10: StatCard + StatStrip + statStrip.ts

Same as plan v1 Task 9 — unchanged.

- [ ] **Step 1-5:** See plan v1 Task 9.

---

# Phase 7 — Table primitives

### Task 11: Sparkline + AmountCell + format.ts

Same as plan v1 Task 10 — unchanged.

- [ ] **Step 1-5:** See plan v1 Task 10.

---

### Task 12: DataRow

Same as plan v1 Task 11 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 11.

---

### Task 13: DataTable

Same as plan v1 Task 12 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 12.

---

# Phase 8 — Pagination

### Task 14: PaginationBar with page-turn motion

Same as plan v1 Task 13 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 13.

---

# Phase 9 — FilterBar rewrite (chips + DateRangePill + AmountRangeInput + SearchInput)

### Task 15: Chip primitive

Same as plan v1 Task 14 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 14.

---

### Task 16: SearchInput primitive

**Files:**
- Create: `frontend/src/components/SearchInput.tsx`

Identical to plan v1 Task 15, except the placeholder copy updates to reflect the broadened backend search (now includes AdvisorName per commit `0127f1d`).

- [ ] **Step 1: Create SearchInput.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../lib/useDebouncedValue';

interface Props {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search account, advisor, or symbol…',
}: Props) {
  const [local, setLocal] = useState(value ?? '');
  const debounced = useDebouncedValue(local, 300);

  useEffect(() => {
    const trimmed = debounced.trim();
    const current = value ?? '';
    if (trimmed === current) return;
    onChange(trimmed.length > 0 ? trimmed : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
      <span>Search</span>
      <div className="flex items-center gap-2 rounded-[3px] border border-line-strong bg-bg-elev px-2.5 py-1.5">
        <span aria-hidden="true" className="text-text-dim">⌕</span>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[12px] font-normal normal-case tracking-normal text-text-bright placeholder:text-text-dim/60 focus:outline-none"
        />
      </div>
    </label>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SearchInput.tsx
git commit -m "$(cat <<'EOF'
Primitives: SearchInput (placeholder updated for broadened search)

Backend search clause now matches AccountId OR AdvisorName OR SecuritySymbol
(commit 0127f1d). The placeholder reflects that. Same useDebouncedValue
+ <label>Search</label> structure so the existing getByLabel('Search')
selector still resolves.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: DateRangePill primitive

Same as plan v1 Task 16 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 16.

---

### Task 18: AmountRangeInput primitive (NEW — not in plan v1)

**Files:**
- Create: `frontend/src/components/AmountRangeInput.tsx`

- [ ] **Step 1: Create AmountRangeInput.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../lib/useDebouncedValue';

interface Props {
  minAmount: number | undefined;
  maxAmount: number | undefined;
  onChange: (next: { minAmount?: number; maxAmount?: number }) => void;
}

function parse(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function AmountRangeInput({ minAmount, maxAmount, onChange }: Props) {
  const [minLocal, setMinLocal] = useState(minAmount?.toString() ?? '');
  const [maxLocal, setMaxLocal] = useState(maxAmount?.toString() ?? '');
  const debouncedMin = useDebouncedValue(minLocal, 300);
  const debouncedMax = useDebouncedValue(maxLocal, 300);

  useEffect(() => {
    const next = parse(debouncedMin);
    if (next === minAmount) return;
    onChange({ minAmount: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin]);

  useEffect(() => {
    const next = parse(debouncedMax);
    if (next === maxAmount) return;
    onChange({ maxAmount: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMax]);

  const inputCls =
    'w-24 rounded-[3px] border border-line-strong bg-bg-elev px-2 py-1.5 ' +
    'font-mono text-[12px] tabular-nums text-text-bright placeholder:text-text-dim/60 ' +
    'focus:outline-none focus:border-cyan/60';

  return (
    <fieldset
      role="group"
      aria-label="Amount range"
      className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim"
    >
      <legend className="sr-only">Amount range</legend>
      <span>Amount</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          aria-label="Min amount"
          value={minLocal}
          onChange={(e) => setMinLocal(e.target.value)}
          placeholder="min"
          className={inputCls}
        />
        <span className="text-text-dim">–</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          aria-label="Max amount"
          value={maxLocal}
          onChange={(e) => setMaxLocal(e.target.value)}
          placeholder="max"
          className={inputCls}
        />
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AmountRangeInput.tsx
git commit -m "$(cat <<'EOF'
Primitives: AmountRangeInput (Min/Max number pair with 300ms debounce)

Surfaces the backend's MinAmount/MaxAmount filter (already in
ListTransactionsRequest since 892a92f). Two mono number inputs with
"Min amount" / "Max amount" aria-labels for Playwright. Each debounces
independently into the parent onChange.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: FilterBar rewrite (chips + DateRangePill + AmountRangeInput + SearchInput; no Sort dropdown)

**Files:**
- Rewrite: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts` (selectors for chips + sort + amount range + empty state)

The FilterBar incorporates AmountRangeInput in addition to plan v1's chip-group rewrite.

- [ ] **Step 1: Apply all selector updates from plan v1 Task 17 Step 1**

See plan v1 Task 17 Step 1 (the seven selector updates in `list.spec.ts`). Apply verbatim.

- [ ] **Step 2: Rewrite FilterBar.tsx (adds AmountRangeInput)**

Replace the entire contents:

```tsx
import type { ListSearch } from '../lib/listSearch';
import { ALLOWED_PAGE_SIZES } from '../lib/listSearch';
import type { TransactionType, TransactionStatus } from '../api/transactions';
import { Chip } from './Chip';
import { SearchInput } from './SearchInput';
import { DateRangePill } from './DateRangePill';
import { AmountRangeInput } from './AmountRangeInput';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];
const STATUSES: readonly TransactionStatus[] = ['Pending', 'Settled', 'Cancelled'];

export function FilterBar({ value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg-elev/40 px-3 py-3">
      <fieldset role="group" aria-label="Type" className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Type</legend>
        <Chip
          active={value.type === undefined}
          onClick={() => onChange({ type: undefined })}
          data-testid="type-chip-All"
        >
          ALL
        </Chip>
        {TYPES.map((t) => (
          <Chip
            key={t}
            active={value.type === t}
            onClick={() => onChange({ type: value.type === t ? undefined : t })}
            data-testid={`type-chip-${t}`}
          >
            {t}
          </Chip>
        ))}
      </fieldset>

      <span aria-hidden="true" className="h-5 w-px bg-line" />

      <fieldset role="group" aria-label="Status" className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Status</legend>
        <Chip
          active={value.status === undefined}
          onClick={() => onChange({ status: undefined })}
          data-testid="status-chip-All"
        >
          ALL
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s}
            tone={s === 'Pending' ? 'amber' : 'cyan'}
            active={value.status === s}
            onClick={() => onChange({ status: value.status === s ? undefined : s })}
            data-testid={`status-chip-${s}`}
          >
            {s}
          </Chip>
        ))}
      </fieldset>

      <span aria-hidden="true" className="h-5 w-px bg-line" />

      <DateRangePill
        fromDate={value.fromDate}
        toDate={value.toDate}
        onChange={(next) => onChange(next)}
      />

      <AmountRangeInput
        minAmount={value.minAmount}
        maxAmount={value.maxAmount}
        onChange={(next) => onChange(next)}
      />

      <div className="ml-auto flex items-center gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
          <span>Page size</span>
          <select
            value={value.pageSize}
            onChange={(e) => onChange({ pageSize: Number(e.target.value) })}
            className="rounded-[3px] border border-line-strong bg-bg-elev px-2 py-1 text-[12px] normal-case tracking-normal text-text-bright focus:outline-none"
          >
            {ALLOWED_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <SearchInput value={value.search} onChange={(next) => onChange({ search: next })} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS. The FilterBar won't render anywhere yet (Phase 10 mounts it), but it compiles in isolation.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: chip groups + DateRangePill + AmountRangeInput + SearchInput

Type/Status chip groups inside <fieldset role="group" aria-label> so
getByRole('group', { name: 'Type' }) is the new anchor. Sort dropdown
is gone — sortable column headers replace it. New AmountRangeInput
surfaces backend MinAmount/MaxAmount. Page size stays a native <select>.

Playwright selectors updated in the same commit per the spec's Test
compatibility table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 10 — Pathless _dashboard layout (preserves ChatDrawer mount + Transactions h1)

### Task 20: PanelExclusion context (NEW — not in plan v1)

**Files:**
- Create: `frontend/src/components/PanelExclusion.tsx`

This is the small piece that wires the mutual exclusion between the ChatDrawer and the DetailSheet. Both surfaces read+write a shared "what's open" state.

- [ ] **Step 1: Create PanelExclusion.tsx**

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Channel = 'chat' | 'detail' | null;

interface Value {
  /** Which side-panel is open ('chat', 'detail', or null) */
  active: Channel;
  /** True if the chat drawer is open */
  isChatOpen: boolean;
  /** Open the chat (closes detail). Used by ChatDrawer's onOpenChange. */
  openChat: () => void;
  /** Close the chat. Used by ChatDrawer's onOpenChange. */
  closeChat: () => void;
  /** Called by DetailSheet when it mounts. Closes the chat as a side-effect. */
  registerDetailOpen: () => void;
  /** Called by DetailSheet when it unmounts. */
  registerDetailClosed: () => void;
}

const Ctx = createContext<Value | null>(null);

export function PanelExclusionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Channel>(null);

  const openChat = useCallback(() => setActive('chat'), []);
  const closeChat = useCallback(() => setActive((curr) => (curr === 'chat' ? null : curr)), []);
  const registerDetailOpen = useCallback(() => setActive('detail'), []);
  const registerDetailClosed = useCallback(() =>
    setActive((curr) => (curr === 'detail' ? null : curr)), []);

  const value = useMemo<Value>(
    () => ({
      active,
      isChatOpen: active === 'chat',
      openChat,
      closeChat,
      registerDetailOpen,
      registerDetailClosed,
    }),
    [active, openChat, closeChat, registerDetailOpen, registerDetailClosed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanelExclusion(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePanelExclusion must be used inside <PanelExclusionProvider>');
  return v;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS (not yet used).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PanelExclusion.tsx
git commit -m "$(cat <<'EOF'
Primitives: PanelExclusion context (mutex between ChatDrawer + DetailSheet)

Single source of truth for which side panel is open. ChatDrawer subscribes
to isChatOpen and reports open/close transitions; DetailSheet calls
registerDetailOpen on mount (which closes the chat as a side effect) and
registerDetailClosed on unmount. Provider mounts inside __root.tsx in the
next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Wrap __root.tsx in PanelExclusionProvider

**Files:**
- Modify: `frontend/src/routes/__root.tsx`

- [ ] **Step 1: Wrap RootLayout's contents**

Update the RootLayout component:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';
import { PanelExclusionProvider } from '../components/PanelExclusion';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <PanelExclusionProvider>
      <div className="min-h-screen bg-bg text-text">
        <ScanBeam />
        <Header />
        <main className="px-6 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </PanelExclusionProvider>
  );
}
```

- [ ] **Step 2: Verify Playwright**

```bash
npx playwright test
```

Expected: all tests pass (provider is a no-op until consumers mount).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/__root.tsx
git commit -m "$(cat <<'EOF'
__root.tsx: wrap layout in PanelExclusionProvider

No behavior change yet — the provider is a no-op until ChatDrawer and
DetailSheet subscribe in subsequent tasks. Pre-mounting it here keeps the
context tree stable and avoids React StrictMode double-mount weirdness
when both consumers come online.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Pathless _dashboard.tsx layout (preserves Transactions h1 + ChatDrawer mount)

**Files:**
- Create: `frontend/src/routes/_dashboard.tsx`
- Create: `frontend/src/routes/_dashboard.index.tsx`
- Delete: `frontend/src/routes/index.tsx`

This **differs from plan v1 Task 18** in two ways:
1. The page header section (`<h1>Transactions</h1>` + `<ChatDrawer />`) is preserved, restyled to Terminal Dense and rendered inside the layout.
2. The Sub-project 2 row-click navigation still routes to `/transactions/$id` (no change in URL contract).

- [ ] **Step 1: Create _dashboard.tsx**

```tsx
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, transactionsKey } from '../api/transactions';
import {
  listSearchSchema,
  DEFAULT_LIST_SEARCH,
  isAnyFilterActive,
} from '../lib/listSearch';
import { FilterBar } from '../components/FilterBar';
import { SkeletonRows } from '../components/SkeletonRows';
import { StatStrip } from '../components/StatStrip';
import { DataTable } from '../components/DataTable';
import { DataRow } from '../components/DataRow';
import { PaginationBar } from '../components/PaginationBar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { TypeLabel } from '../components/TypeLabel';
import { AmountCell } from '../components/AmountCell';
import { ChatDrawer } from '../components/chat/ChatDrawer';
import { formatTransactionDate } from '../lib/format';

export const Route = createFileRoute('/_dashboard')({
  validateSearch: listSearchSchema.parse,
  component: DashboardLayout,
});

function DashboardLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  const onFilterChange = (next: Partial<typeof search>) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, ...next, page: 1 }) });

  const onSortChange = (next: { sortBy: typeof search.sortBy; sortDir: typeof search.sortDir }) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, ...next }) });

  const onPageChange = (nextPage: number) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, page: nextPage }) });

  return (
    <div>
      <div
        className="mb-4 flex items-center justify-between"
        data-testid="list-header"
      >
        <h2 className="font-mono text-[14px] font-semibold uppercase tracking-[0.12em] text-text-bright">
          Transactions
        </h2>
        <ChatDrawer />
      </div>

      <StatStrip />

      <div className="relative">
        <FilterBar value={search} onChange={onFilterChange} />
        {isFetching && !isPending && (
          <div
            data-motion-id="refetch-sliver"
            aria-hidden="true"
            className="absolute -bottom-px left-0 right-0 h-px overflow-hidden"
          >
            <div className="h-full w-1/3 bg-cyan animate-[scan-sweep_1.2s_linear_infinite]" />
          </div>
        )}
      </div>

      {isError ? (
        <ErrorBanner
          title="Couldn't load transactions"
          action={
            <Button onClick={() => refetch()} aria-label="Retry">
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={`transition-opacity duration-200 ${
              isFetching && !isPending ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <DataTable sortBy={search.sortBy} sortDir={search.sortDir} onSort={onSortChange}>
              {isPending ? (
                <SkeletonRows count={8} columns={7} />
              ) : (
                data.data.map((t) => (
                  <DataRow
                    key={t.id}
                    onActivate={() =>
                      navigate({
                        to: '/transactions/$id',
                        params: { id: String(t.id) },
                        search,
                      })
                    }
                  >
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">
                      {formatTransactionDate(t.transactionDate)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">
                      {t.accountId}
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text">{t.advisorName}</td>
                    <td className="px-3.5 py-2.5">
                      <TypeLabel type={t.type} />
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">
                      {t.securitySymbol ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <AmountCell amount={t.amount} currency={t.currency} status={t.status} />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill status={t.status} />
                    </td>
                  </DataRow>
                ))
              )}
            </DataTable>
          </div>

          {!isPending && data.total === 0 && (
            <EmptyState
              message={
                isAnyFilterActive(search)
                  ? 'No transactions match these filters'
                  : 'No transactions'
              }
              action={
                isAnyFilterActive(search) ? (
                  <Button
                    onClick={() => navigate({ to: '/', search: () => DEFAULT_LIST_SEARCH })}
                    aria-label="Clear Filters"
                  >
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!isPending && data.total > 0 && (
            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              pageSize={data.pageSize}
              total={data.total}
              onPage={onPageChange}
            />
          )}
        </>
      )}

      <Outlet />
    </div>
  );
}
```

- [ ] **Step 2: Create _dashboard.index.tsx**

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard/')({
  component: () => null,
});
```

- [ ] **Step 3: Delete the old routes/index.tsx**

```bash
git rm frontend/src/routes/index.tsx
```

- [ ] **Step 4: Regenerate the route tree**

```bash
npm run dev
# Wait for "ready", then Ctrl+C
```

Verify `frontend/src/routeTree.gen.ts` now references `_dashboard` and `_dashboard/`.

- [ ] **Step 5: Run Playwright**

```bash
npx playwright test
```

Expected: list, chat, and detail tests pass. The chat tests assert against ChatDrawer which is still rendered as `<ChatDrawer />` at the same DOM position (just inside the new layout). The "Transactions" h2 vs h1 difference doesn't affect existing tests (no test queries the inner h1/h2).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/_dashboard.tsx frontend/src/routes/_dashboard.index.tsx frontend/src/routeTree.gen.ts
git rm frontend/src/routes/index.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
Routes: migrate / into pathless _dashboard layout

The list-rendering logic moves out of routes/index.tsx into a pathless
layout route that matches any child route — so the list stays mounted
when /transactions/$id renders into the layout's <Outlet />. The
"Transactions" h2 + ChatDrawer trigger row is preserved (restyled to
Terminal Dense — mono uppercase title, ChatDrawer keeps its own styling
for now; gets restyled in Phase 13). URL contract unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 11 — Detail view as overlay using shadcn Sheet

### Task 23: DetailField primitive

Same as plan v1 Task 20 — unchanged.

- [ ] **Step 1-3:** See plan v1 Task 20.

---

### Task 24: DetailSheet primitive (replaces plan v1's DetailPanel — wraps shadcn Sheet)

**Files:**
- Create: `frontend/src/components/DetailSheet.tsx`

Uses the existing shadcn `Sheet` from `components/ui/sheet.tsx`. Mutual exclusion with the chat is handled via the `PanelExclusion` context — the DetailSheet registers as open on mount and closed on unmount; the context closes the chat when detail opens.

- [ ] **Step 1: Create DetailSheet.tsx**

```tsx
import { useEffect, type ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { usePanelExclusion } from './PanelExclusion';

interface Props {
  /** Always true when rendered (the route's existence drives open/close) */
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailSheet({ open, onClose, title, children }: Props) {
  const { registerDetailOpen, registerDetailClosed } = usePanelExclusion();

  useEffect(() => {
    if (open) {
      registerDetailOpen();
      return () => registerDetailClosed();
    }
    return undefined;
  }, [open, registerDetailOpen, registerDetailClosed]);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-line-strong bg-bg-elev p-0 sm:max-w-md"
        data-testid="detail-sheet"
      >
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

Notes:
- The shadcn `Sheet` already provides the X close button (top-right with `aria-label="Close"` via `<span class="sr-only">Close</span>`), backdrop click → close, Esc → close. We don't reimplement any of that.
- The motion (slide-in from the right) comes from shadcn's data-state animations, same as the ChatDrawer.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DetailSheet.tsx
git commit -m "$(cat <<'EOF'
Primitives: DetailSheet — overlay via shadcn Sheet (mutex with chat)

Wraps the existing shadcn Sheet primitive instead of building a custom
slide-in. Same right-edge slide mechanics as ChatDrawer = visual
consistency. PanelExclusion context closes the chat when DetailSheet
mounts and clears its registration on unmount. Esc/backdrop/X-button
close behaviors come from shadcn Sheet for free.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: Migrate detail route to _dashboard.transactions.$id.tsx (uses DetailSheet)

**Files:**
- Create: `frontend/src/routes/_dashboard.transactions.$id.tsx`
- Delete: `frontend/src/routes/transactions.$id.tsx`
- Modify: `frontend/e2e/detail.spec.ts`

- [ ] **Step 1: Create the new route file**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransaction, transactionDetailKey } from '../api/transactions';
import { ApiError } from '../api/client';
import { DetailSheet } from '../components/DetailSheet';
import { DetailField } from '../components/DetailField';
import { StatusPill } from '../components/StatusPill';
import { TypeLabel } from '../components/TypeLabel';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatAmount } from '../lib/format';

export const Route = createFileRoute('/_dashboard/transactions/$id')({
  component: DetailRoute,
});

function DetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const numericId = Number(id);

  const close = () => navigate({ to: '/', search: (prev) => prev });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: transactionDetailKey(numericId),
    queryFn: ({ signal }) => fetchTransaction(numericId, signal),
    retry: false,
  });

  const is404 = isError && error instanceof ApiError && error.status === 404;

  return (
    <DetailSheet open onClose={close} title={`TXN-${id}`}>
      {isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              data-testid="detail-skeleton"
              className="h-4 w-3/4 rounded-sm bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-line-strong)_50%,var(--color-line)_100%)] bg-[length:200%_100%] animate-[shimmer-sweep_1.6s_linear_infinite]"
            />
          ))}
        </div>
      )}

      {is404 && (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
            Transaction not found
          </div>
          <Button onClick={close} aria-label="Return to the list">
            Return to the list
          </Button>
        </div>
      )}

      {isError && !is404 && (
        <ErrorBanner
          title="Couldn't load the transaction"
          action={
            <Button onClick={() => refetch()} aria-label="Retry">
              Retry
            </Button>
          }
        />
      )}

      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Date" index={0}>
              {data.transactionDate}
            </DetailField>
            <DetailField label="Account" index={1}>
              <span className="font-mono">{data.accountId}</span>
            </DetailField>
            <DetailField label="Advisor" index={2}>
              {data.advisorName}
            </DetailField>
            <DetailField label="Type" index={3}>
              <TypeLabel type={data.type} />
            </DetailField>
            <DetailField label="Symbol" index={4}>
              <span className="font-mono">{data.securitySymbol ?? '—'}</span>
            </DetailField>
            <DetailField label="Amount" index={5}>
              <span className="font-mono tabular-nums">
                {formatAmount(data.amount, data.currency)}
              </span>
            </DetailField>
            <DetailField label="Status" index={6}>
              <StatusPill status={data.status} />
            </DetailField>
            <DetailField label="Created at" index={7}>
              <span className="font-mono">{data.createdAt}</span>
            </DetailField>
          </div>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-bg p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Notes
            </span>
            <span className="text-[13px] text-text-bright">
              {data.notes ?? <span className="text-text-dim">No notes</span>}
            </span>
          </div>
        </div>
      )}
    </DetailSheet>
  );
}
```

- [ ] **Step 2: Delete the old transactions.$id.tsx**

```bash
git rm "frontend/src/routes/transactions.\$id.tsx"
```

(PowerShell on Windows may need backtick escaping; adjust per your shell.)

- [ ] **Step 3: Replace detail.spec.ts**

Replace the entire contents of `frontend/e2e/detail.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('row click opens detail sheet with all fields visible', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await expect(realRow).toBeVisible();
  await realRow.click();

  await expect(page).toHaveURL(/\/transactions\/\d+(\?.*)?$/);
  const sheet = page.getByTestId('detail-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Account', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Advisor', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Notes')).toBeVisible();
  await expect(sheet.locator('[data-status]').first()).toBeVisible();
});

test('Esc closes the detail sheet and URL returns to filtered list', async ({ page }) => {
  await page.goto('/?type=Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.keyboard.press('Escape');

  await expect(page).not.toHaveURL(/\/transactions\//);
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
});

test('Close button closes the detail sheet', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('list stays mounted underneath the detail sheet', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(25);
});

test('opening detail closes the chat drawer (mutex)', async ({ page }) => {
  await page.goto('/');
  // Open chat
  await page.getByTestId('chat-toggle').click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  // Click a row → chat should close, detail should open
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  await expect(page.getByTestId('chat-panel')).not.toBeVisible();
});

test('opening chat closes the detail sheet (mutex)', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  // Open chat → detail should close
  await page.getByTestId('chat-toggle').click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  await expect(page.getByTestId('detail-sheet')).not.toBeVisible();
  // URL returns to /
  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('detail sheet shows "Transaction not found" for missing id', async ({ page }) => {
  await page.goto('/transactions/999999');
  const sheet = page.getByTestId('detail-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/Transaction not found/i)).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Return to the list' })).toBeVisible();
});
```

- [ ] **Step 4: Wire the mutex on the chat side**

The mutex needs ChatDrawer to: (a) call `openChat()` when its Sheet opens, (b) call `closeChat()` when its Sheet closes, AND (c) when `active === 'detail'` becomes true, force the chat closed.

But ChatDrawer currently owns its `open` state locally (`useState`). Lift it to the context so the context can flip it.

Open `frontend/src/components/chat/ChatDrawer.tsx` and replace the entire contents:

```tsx
import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { ChatPanel } from './ChatPanel';
import { usePanelExclusion } from '../PanelExclusion';

export function ChatDrawer() {
  const { active, isChatOpen, openChat, closeChat } = usePanelExclusion();
  const [localOpen, setLocalOpen] = useState(false);

  // Mirror context state into local for the shadcn Sheet's `open` prop.
  useEffect(() => {
    setLocalOpen(isChatOpen);
  }, [isChatOpen]);

  // When detail takes over, ensure chat closes.
  useEffect(() => {
    if (active === 'detail' && localOpen) {
      setLocalOpen(false);
    }
  }, [active, localOpen]);

  const onOpenChange = (next: boolean) => {
    setLocalOpen(next);
    if (next) openChat();
    else closeChat();
  };

  return (
    <Sheet open={localOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="chat-toggle"
          className="rounded-[3px] border border-cyan/40 bg-cyan/[0.08] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-cyan transition-colors duration-[120ms] hover:bg-cyan/[0.15]"
        >
          Chat
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col border-l border-line-strong bg-bg-elev p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-line px-4 py-3">
          <SheetTitle className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
            Ask about transactions
          </SheetTitle>
          <SheetDescription className="font-mono text-[10px] text-text-dim">
            Powered by Claude Haiku 4.5 · Read-only access
          </SheetDescription>
        </SheetHeader>
        <ChatPanel isOpen={localOpen} />
      </SheetContent>
    </Sheet>
  );
}
```

Note: this commit also restyles the ChatDrawer trigger and SheetHeader to Terminal Dense. We do the inner-panel restyle (ChatPanel, MessageBubble, etc.) in Phase 13.

- [ ] **Step 5: Regenerate route tree**

```bash
npm run dev
# Wait for "ready", Ctrl+C
```

- [ ] **Step 6: Run Playwright**

```bash
npx playwright test
```

Expected: list passes, detail tests pass (including new mutex tests), chat tests still pass (the chat-toggle / chat-panel testids are unchanged, only color classes changed and no chat test asserts colors).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/_dashboard.transactions.\$id.tsx frontend/src/routeTree.gen.ts frontend/src/components/chat/ChatDrawer.tsx frontend/e2e/detail.spec.ts
git rm frontend/src/routes/transactions.\$id.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
Routes: detail view migrates to overlay sheet + mutex with chat drawer

URL contract preserved (/transactions/$id). The detail content now
renders inside DetailSheet (wraps shadcn Sheet, side=right) over the
still-mounted list. ChatDrawer subscribes to PanelExclusion; the
chat-vs-detail mutex closes whichever was open when the other opens.

ChatDrawer also gets its trigger button + SheetHeader restyled to
Terminal Dense (cyan border, mono uppercase). Inner panel (ChatPanel,
MessageBubble, Composer, SeedPrompts, ToolCallCard) restyles in Phase 13.

detail.spec.ts is rewritten — Esc / Close / backdrop close handlers;
list-stays-mounted assertion; two new mutex tests (open chat closes
detail and vice versa).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 12 — Reduced-motion sweep + motion.spec.ts

### Task 26: Wire useReducedMotion across motion primitives

Same as plan v1 Task 23 — except DetailSheet/ChatDrawer use shadcn's CSS animations (no `motion.div`), so they don't need explicit `useReducedMotion` handling — they're covered by the global `@media (prefers-reduced-motion: reduce)` rule in styles.css.

Apply plan v1 Task 23 verbatim, but **skip the DetailPanel.tsx step** (we no longer have that file — DetailSheet uses shadcn).

- [ ] **Step 1:** Update `DetailField.tsx` per plan v1 Task 23 Step 1.
- [ ] **Step 2:** SKIP plan v1 Task 23 Step 2 (DetailPanel doesn't exist).
- [ ] **Step 3:** Update `PaginationBar.tsx` per plan v1 Task 23 Step 3.
- [ ] **Step 4:** Verify and commit per plan v1 Task 23 Steps 4-5.

---

### Task 27: motion.spec.ts

Same as plan v1 Task 24 — unchanged.

- [ ] **Step 1-4:** See plan v1 Task 24.

---

# Phase 13 — Chat surface reskin (ChatPanel, MessageBubble, Composer, SeedPrompts, ToolCallCard)

### Task 28: MessageBubble restyle

**Files:**
- Rewrite: `frontend/src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Replace MessageBubble.tsx**

```tsx
import type { ChatMessage } from '../../api/chat';
import { MarkdownText } from '../../lib/markdown';
import { ToolCallCard } from './ToolCallCard';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="message-user">
        <div className="max-w-[85%] rounded-lg border border-cyan/40 bg-cyan/[0.08] px-3 py-2 font-mono text-[12px] text-text-bright">
          {message.text}
        </div>
      </div>
    );
  }

  const isError = message.isErrorBubble === true;
  const bubbleClass = isError
    ? 'border-rose-500/40 bg-rose-500/[0.05] text-rose-300'
    : 'border-line bg-bg-elev text-text';

  return (
    <div
      className="flex flex-col items-start gap-2"
      data-testid="message-assistant"
      data-error={isError ? 'true' : 'false'}
    >
      {message.toolCalls.map((tc, i) => (
        <ToolCallCard key={`${message.id}-tc-${i}`} toolCall={tc} />
      ))}
      {message.text && (
        <div className={`max-w-[95%] rounded-lg border px-3 py-2 text-[13px] ${bubbleClass}`}>
          <MarkdownText>{message.text}</MarkdownText>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify Playwright**

```bash
npx playwright test
```

Expected: all chat tests pass — they assert by `data-testid="message-user"` / `data-testid="message-assistant"` / `data-error` attribute. No color-class assertions in the chat suite.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/MessageBubble.tsx
git commit -m "$(cat <<'EOF'
Chat: MessageBubble restyle (cyan user, dark-bordered assistant)

User bubble: cyan-tinted bg with cyan border, mono text. Assistant
bubble: dark elevated bg with line border. Error bubble: rose tones.
data-testid + data-error attributes unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 29: Composer restyle

**Files:**
- Rewrite: `frontend/src/components/chat/Composer.tsx`

- [ ] **Step 1: Replace Composer.tsx**

```tsx
import { useState, type KeyboardEvent } from 'react';

export function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed.slice(0, 2000));
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex items-end gap-2 border-t border-line bg-bg-elev p-3"
      data-testid="composer"
    >
      <textarea
        aria-label="Chat message"
        className="min-h-[60px] flex-1 resize-none rounded-[3px] border border-line-strong bg-bg px-2 py-1.5 font-mono text-[12px] text-text-bright placeholder:text-text-dim/60 focus:border-cyan/60 focus:outline-none"
        placeholder="Ask about transactions… (Cmd/Ctrl+Enter to send)"
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="rounded-[3px] border border-cyan/40 bg-cyan/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-cyan transition-colors duration-[120ms] hover:bg-cyan/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || value.trim().length === 0}
        onClick={submit}
      >
        Send
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify Playwright**

```bash
npx playwright test
```

Expected: chat tests pass — they query by `data-testid="composer"`, the `aria-label="Chat message"` textarea, and the "Send" button name. None of those changed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/Composer.tsx
git commit -m "$(cat <<'EOF'
Chat: Composer restyle (dark textarea + cyan Send button)

Dark elevated textarea with cyan focus ring, mono input style. Send
button mirrors the chat-toggle aesthetic. All test selectors unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 30: SeedPrompts restyle

**Files:**
- Rewrite: `frontend/src/components/chat/SeedPrompts.tsx`

- [ ] **Step 1: Replace SeedPrompts.tsx**

```tsx
const PROMPTS = [
  'Show me all pending Buy transactions from Sarah Chen in the last 30 days',
  "What's the largest fee transaction this quarter and which advisor handled it?",
  'Find any cancelled transactions over 50,000 dollars',
];

export function SeedPrompts({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 p-4" data-testid="seed-prompts">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
        Try asking…
      </div>
      <div className="space-y-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p)}
            className="w-full rounded-[3px] border border-line bg-bg px-3 py-2 text-left text-[12px] text-text transition-colors duration-[120ms] hover:border-cyan/40 hover:bg-cyan/[0.04] hover:text-text-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify Playwright + commit**

```bash
npx playwright test
git add frontend/src/components/chat/SeedPrompts.tsx
git commit -m "$(cat <<'EOF'
Chat: SeedPrompts restyle (dark prompt cards, cyan hover)

Three PRD example queries. Mono "Try asking…" label, dark prompt cards
with cyan-tinted hover. data-testid="seed-prompts" unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 31: ToolCallCard restyle

**Files:**
- Rewrite: `frontend/src/components/chat/ToolCallCard.tsx`

- [ ] **Step 1: Replace ToolCallCard.tsx**

```tsx
import type { ToolCall } from '../../api/chat';

function summarizeArgs(tool: string, args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    if (v === null || v === undefined || v === '') continue;
    const printed = typeof v === 'string' ? `"${v}"` : String(v);
    parts.push(`${k}: ${printed}`);
  }
  if (parts.length === 0) return '';
  const label = tool === 'search_transactions' ? '🔍 ' : tool === 'get_transaction' ? '📄 ' : '🛠 ';
  return `${label}${tool} (${parts.join(', ')})`;
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const borderClass = toolCall.isError
    ? 'border-rose-500/40 bg-rose-500/[0.05]'
    : 'border-line bg-bg-elev';

  return (
    <details
      data-testid="tool-call-card"
      data-tool={toolCall.tool}
      data-error={toolCall.isError ? 'true' : 'false'}
      className={`rounded-[3px] border ${borderClass} p-2 font-mono text-[11px] text-text`}
    >
      <summary className="cursor-pointer select-none font-medium text-text-bright">
        {summarizeArgs(toolCall.tool, toolCall.args) || `🛠 ${toolCall.tool}`}
      </summary>
      <div className="mt-2 space-y-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Arguments</div>
          <pre className="overflow-x-auto text-[10px] text-text">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Result</div>
          <pre className="overflow-x-auto text-[10px] text-text">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Verify Playwright + commit**

```bash
npx playwright test
git add frontend/src/components/chat/ToolCallCard.tsx
git commit -m "$(cat <<'EOF'
Chat: ToolCallCard restyle (dark collapsible, rose on error)

Dark elevated card; rose border + tinted bg when isError. Mono labels
("ARGUMENTS" / "RESULT") in uppercase. data-testid + data-tool +
data-error attributes unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 32: ChatPanel restyle ("Thinking…" + Retry button)

**Files:**
- Modify: `frontend/src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Update the two color-bearing classes inside ChatPanel.tsx**

Find this block (around line 109):

```tsx
{mutation.isPending && (
  <div className="text-sm italic text-slate-500" data-testid="thinking-indicator">
    Thinking…
  </div>
)}
{lastIsErrorBubble && !mutation.isPending && (
  <button
    type="button"
    onClick={retry}
    data-testid="chat-retry"
    className="rounded bg-red-600 px-3 py-1 text-sm text-white"
  >
    Retry
  </button>
)}
```

Replace with:

```tsx
{mutation.isPending && (
  <div
    className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-dim"
    data-testid="thinking-indicator"
  >
    Thinking…
  </div>
)}
{lastIsErrorBubble && !mutation.isPending && (
  <button
    type="button"
    onClick={retry}
    data-testid="chat-retry"
    className="rounded-[3px] border border-rose-500/50 bg-rose-500/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-rose-400 hover:bg-rose-500/[0.15]"
  >
    Retry
  </button>
)}
```

- [ ] **Step 2: Verify Playwright + commit**

```bash
npx playwright test
git add frontend/src/components/chat/ChatPanel.tsx
git commit -m "$(cat <<'EOF'
Chat: ChatPanel restyle (mono Thinking… + rose Retry)

Mono uppercase "Thinking…" indicator in dim text; Retry button shifts
from solid red to rose-bordered terminal style matching the rest of the
error UI. data-testid selectors unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 14 — Docs surface reskin

### Task 33: Restyle /docs page (routes/docs.tsx)

**Files:**
- Modify: `frontend/src/routes/docs.tsx`

The `routes/docs.tsx` file holds the section components (Overview, Authentication, DataModel, etc.) inline. Restyle each by replacing `gray-*` / `blue-*` / `red-*` classes with Terminal Dense tokens. Sub-component files (DocsSidebar, EndpointCard, etc.) restyle in Task 34.

- [ ] **Step 1: Find-and-replace common classes**

In `frontend/src/routes/docs.tsx`, apply these class substitutions globally throughout the file:

| Old | New |
|---|---|
| `text-gray-500` | `text-text-dim` |
| `text-gray-600` | `text-text-dim` |
| `text-gray-700` | `text-text` |
| `text-gray-900` | `text-text-bright` |
| `bg-gray-50` | `bg-bg-elev` |
| `bg-gray-100` | `bg-bg-elev-2` |
| `border-gray-100` | `border-line` |
| `border-gray-200` | `border-line` |
| `bg-white` | `bg-bg-elev` |
| `text-blue-700` | `text-cyan` |
| `bg-red-50` | `bg-rose-500/[0.05]` |
| `border-red-200` | `border-rose-500/40` |
| `text-red-800` | `text-rose-300` |
| `text-red-900` | `text-rose-200` |

Plus the section-header `<h2>` font-size from `text-2xl font-semibold text-gray-900` → `font-mono text-[18px] font-semibold uppercase tracking-[0.1em] text-text-bright`.

Plus the eyebrow span: `text-xs font-semibold uppercase tracking-wider text-gray-500` → `font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan`.

(This is the simplest set of global text-replacements that turns the file dark without changing structure or layout.)

- [ ] **Step 2: Verify TypeScript + Playwright**

```bash
npx tsc --noEmit
npx playwright test
```

Expected: TypeScript passes; no Playwright tests assert against the docs page so all green.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/docs.tsx
git commit -m "$(cat <<'EOF'
Docs: restyle inline sections in routes/docs.tsx to Terminal Dense

Find-and-replace gray-/blue-/red-* Tailwind classes with bg-bg-elev,
border-line, text-text-dim, text-cyan, text-rose-* tokens. Section
headers gain mono uppercase styling matching the rest of the app.
Structure and layout unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 34: Restyle docs sub-components

**Files:**
- Modify each: `frontend/src/components/docs/DocsSidebar.tsx`, `EndpointCard.tsx`, `DecisionCard.tsx`, `MethodBadge.tsx`, `SchemaTable.tsx`, `TryItPanel.tsx`

- [ ] **Step 1: Apply the same find-and-replace mapping across all six files**

Same mapping as Task 33 Step 1. Plus:

- For `MethodBadge.tsx`: each HTTP method gets a tonal background. Map:
  - `GET` → `bg-cyan/[0.12] text-cyan border-cyan/40`
  - `POST` → `bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/40`
  - `PUT` → `bg-amber-400/[0.12] text-amber-400 border-amber-400/40`
  - `DELETE` → `bg-rose-500/[0.12] text-rose-400 border-rose-500/40`
  - Wrap each in `rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]`.
- For `DocsSidebar.tsx`: active link styling switches to `text-cyan border-l-2 border-cyan pl-3`; inactive `text-text-dim hover:text-text-bright`.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npx playwright test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/docs/
git commit -m "$(cat <<'EOF'
Docs: restyle sidebar, endpoint card, decision card, method badge,
schema table, try-it panel to Terminal Dense

Color-class find-and-replace plus tonal method badges (GET cyan,
POST green, PUT amber, DELETE rose). DocsSidebar active link gets a
cyan left border. No structural changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 15 — Final cleanup and verification

### Task 35: Move .dark class from index.html into __root.tsx (optional polish)

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/routes/__root.tsx`

The .dark class was added to `index.html` in Task 2 as a quick way to flip the theme. Moving it to React (via a `useEffect` on document.documentElement) makes it controllable in code if we ever need a toggle. Optional — skip if pressed for time.

- [ ] **Step 1: Revert `<html lang="en" class="dark">` back to `<html lang="en">`** in `frontend/index.html`.

- [ ] **Step 2: Add a useEffect in `__root.tsx`'s RootLayout** that sets the class on mount:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';
import { PanelExclusionProvider } from '../components/PanelExclusion';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  return (
    <PanelExclusionProvider>
      <div className="min-h-screen bg-bg text-text">
        <ScanBeam />
        <Header />
        <main className="px-6 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </PanelExclusionProvider>
  );
}
```

- [ ] **Step 3: Verify Playwright + commit**

```bash
npx playwright test
git add frontend/index.html frontend/src/routes/__root.tsx
git commit -m "$(cat <<'EOF'
__root.tsx: move .dark class from index.html into React effect

Cleaner — keeps the visual mode under React control instead of HTML.
Initial paint flashes default (light) briefly on first load; acceptable
trade-off for a one-line CSS variable swap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 36: Lint, prettier, type, test sweep

Same as plan v1 Task 25 — unchanged.

- [ ] **Step 1:** `npx eslint .`
- [ ] **Step 2:** `npx prettier --check .` (auto-fix if needed via `npx prettier --write .`)
- [ ] **Step 3:** `npx tsc --noEmit`
- [ ] **Step 4:** `npx playwright test`
- [ ] **Step 5:** `cd backend && dotnet format --verify-no-changes && dotnet test && cd ..`
- [ ] **Step 6:** Manual eyeball pass per plan v1 Task 25 Step 6, plus:
  - Click "API Docs" in the nav → docs page is dark and readable
  - Click "Chat" → drawer slides in styled
  - Click a row → detail sheet slides in; chat closes if it was open
- [ ] **Step 7:** Commit any prettier/eslint auto-fixes if applied.

---

## Definition of done

After Task 36:

- [ ] All Playwright tests pass green: list (15) + detail (7, including 2 mutex tests) + chat (8) + motion (3) = 33 tests minimum.
- [ ] `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .` all clean.
- [ ] `dotnet format --verify-no-changes` and `dotnet test` clean (no backend changes).
- [ ] Dashboard, /docs, and chat drawer all render in Terminal Dense.
- [ ] Detail sheet and chat drawer are mutually exclusive — opening one closes the other.
- [ ] MinAmount/MaxAmount filter works end-to-end (URL → query → table → empty-state reset).
- [ ] Search placeholder reads "account, advisor, or symbol".
- [ ] Header nav (Dashboard / API Docs) preserved with new styling.
- [ ] OS-level reduced-motion preference disables ambient loops and snaps animated values.

**Out of scope for this plan** (track as follow-ups if needed):

- README update calling out the atmospheric elements (LIVE indicator, session ID, Volume 24h card, Active Advisors card).
- Light-theme support.
- Mobile / sub-1024px responsive.
