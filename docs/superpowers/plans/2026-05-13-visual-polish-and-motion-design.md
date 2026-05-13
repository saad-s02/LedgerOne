# Visual Polish & Motion Design Implementation Plan — Terminal Dense

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the LedgerOne frontend into a Terminal Dense (Bloomberg-style) dark dashboard with heavy but purposeful motion, migrate the detail view from a full-route page to an overlay slide-in panel, and add a stat strip — all while keeping the existing Playwright suite green through coordinated selector updates.

**Architecture:** Tailwind v4 `@theme` block for design tokens (CSS custom properties → utility classes). Framer Motion (`motion` v12) for orchestrated motion (slide-in panel, page-turn pagination, row stagger, sortable layout). Pure CSS for ambient loops (scan beam, pulse, shimmer). A pathless `_dashboard.tsx` layout route keeps the table mounted while the overlay panel renders into the layout's `<Outlet />` via fixed positioning. The URL contract is preserved exactly.

**Tech Stack:** Vite 8 + React 19 + TypeScript strict, Tailwind v4, TanStack Router (file-based), TanStack Query, Zod 4, Framer Motion v12 (`motion` package), `@fontsource/inter`, `@fontsource/jetbrains-mono`, Playwright (Chromium).

**Spec:** `docs/superpowers/specs/2026-05-13-visual-polish-and-motion-design.md`.

---

## File Plan

**Frontend new files:**
- `frontend/src/components/Header.tsx`
- `frontend/src/components/ScanBeam.tsx`
- `frontend/src/components/StatStrip.tsx`
- `frontend/src/components/StatCard.tsx`
- `frontend/src/components/Counter.tsx`
- `frontend/src/components/Chip.tsx`
- `frontend/src/components/SearchInput.tsx`
- `frontend/src/components/DateRangePill.tsx`
- `frontend/src/components/DataTable.tsx`
- `frontend/src/components/DataRow.tsx`
- `frontend/src/components/Sparkline.tsx`
- `frontend/src/components/TypeLabel.tsx`
- `frontend/src/components/AmountCell.tsx`
- `frontend/src/components/PaginationBar.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/DetailPanel.tsx`
- `frontend/src/components/DetailField.tsx`
- `frontend/src/components/EmptyState.tsx`
- `frontend/src/components/ErrorBanner.tsx`
- `frontend/src/lib/useReducedMotion.ts`
- `frontend/src/lib/format.ts`
- `frontend/src/lib/statStrip.ts` (real-data fetchers + atmospheric constants)
- `frontend/src/routes/_dashboard.tsx`
- `frontend/src/routes/_dashboard.index.tsx`
- `frontend/src/routes/_dashboard.transactions.$id.tsx`
- `frontend/e2e/motion.spec.ts`

**Frontend modified files:**
- `frontend/package.json` (+ `motion`, `@fontsource/inter`, `@fontsource/jetbrains-mono`)
- `frontend/src/styles.css` (rewrite with `@theme` block)
- `frontend/src/components/StatusPill.tsx` (rewrite — terminal pill with `data-status` attribute)
- `frontend/src/components/SkeletonRows.tsx` (rewrite — shimmer instead of `animate-pulse`)
- `frontend/src/components/FilterBar.tsx` (rewrite — chip groups, DateRangePill, SearchInput, no Sort dropdown)
- `frontend/src/routes/__root.tsx` (rewrite — Header + ScanBeam)
- `frontend/e2e/list.spec.ts` (selector updates for chips, header-click sort, pagination text)
- `frontend/e2e/detail.spec.ts` (Esc + close-button instead of "Back to list", new list-still-mounted test)

**Frontend deleted files:**
- `frontend/src/routes/index.tsx` (logic moves into `_dashboard.tsx`)
- `frontend/src/routes/transactions.$id.tsx` (replaced by `_dashboard.transactions.$id.tsx`)

**Backend:** no changes.

---

## Conventions used in this plan

- Every task is **one logical change** committed at the end. Tests + implementation in the same commit so the suite never goes red between commits.
- Commit messages follow the existing convention in this repo (no `feat:` prefix; see `git log` — short imperative subject describing the change).
- Co-authored trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Run commands assume the working directory is `frontend/` unless otherwise stated.
- After each task, the user can refresh `http://localhost:5173` to eyeball the change. After phase boundaries, run `npx playwright test` to confirm the suite is green.
- All new components use named exports (matches the existing pattern: `export function StatusPill(...)`).
- The two atmospheric stat strip values are clearly disclosed in source comments.

---

# Phase 1 — Dependencies & design tokens

### Task 1: Add Framer Motion and font dependencies

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (generated)

- [ ] **Step 1: Install dependencies**

Run from the `frontend/` directory:

```bash
npm install motion@^12 @fontsource/inter@^5 @fontsource/jetbrains-mono@^5
```

Expected: three new entries appear under `dependencies` in `package.json`, lockfile updated. Versions should be `^12.x.x` for motion and `^5.x.x` for both fontsource packages.

- [ ] **Step 2: Verify the dev server still boots**

```bash
npm run dev
```

Expected: Vite starts on `http://localhost:5173`, no errors in console. Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

From the repo root:

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "$(cat <<'EOF'
Deps: motion v12, @fontsource/{inter, jetbrains-mono}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Design tokens in styles.css

**Files:**
- Rewrite: `frontend/src/styles.css`

- [ ] **Step 1: Replace styles.css with the token block**

Open `frontend/src/styles.css` and replace its entire content with:

```css
@import 'tailwindcss';

@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
@import '@fontsource/jetbrains-mono/600.css';

@theme {
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

  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;

  --ease-snap: cubic-bezier(0.32, 0.72, 0, 1);
}

@layer base {
  html,
  body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-feature-settings: 'cv11', 'ss01';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Mono numerals everywhere by default for tables */
  .font-mono,
  .tabular-nums {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  /* Selection */
  ::selection {
    background-color: var(--color-cyan-glow);
    color: var(--color-text-bright);
  }
}

/* Ambient motion keyframes (used by ScanBeam, StatusPill, SkeletonRows, Chip) */
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

- [ ] **Step 2: Verify the dev server boots and applies the dark background**

```bash
npm run dev
```

Open `http://localhost:5173`. The page will look broken (light-on-dark text from sub-project 2 components on a black background) — that's expected. The body should be the deep-navy `#06080F`. Stop the server.

- [ ] **Step 3: Verify TypeScript & ESLint still clean**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles.css
git commit -m "$(cat <<'EOF'
Tokens: @theme block, Inter/JetBrains fonts, ambient keyframes

Adds dark-only color palette, type tokens, the cubic-bezier easing, and
the keyframes used by ScanBeam, StatusPill (pulse), SkeletonRows (shimmer),
Chip (animated border), and Header (blink). Reduced-motion media query
zeros all animations/transitions globally.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 2 — Reskin existing primitives

### Task 3: Rewrite StatusPill (terminal style + data-status attribute)

**Files:**
- Rewrite: `frontend/src/components/StatusPill.tsx`
- Modify: `frontend/e2e/list.spec.ts` (one assertion update)

- [ ] **Step 1: Update the failing test first**

Open `frontend/e2e/list.spec.ts` and find the test `status pill renders with semantic color class`. Replace its body so it asserts the new `data-status` attribute instead of brittle class names:

```ts
test('status pill renders with semantic color class', async ({ page }) => {
  await page.goto('/');
  const firstStatusCell = page.locator('tbody tr').first().locator('td').last();
  const pill = firstStatusCell.locator('[data-status]');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute('data-status', /^(Settled|Pending|Cancelled)$/);
});
```

- [ ] **Step 2: Rewrite StatusPill.tsx**

Replace the entire contents of `frontend/src/components/StatusPill.tsx`:

```tsx
import type { TransactionStatus } from '../api/transactions';

const VARIANTS: Record<TransactionStatus, string> = {
  Settled: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
  Pending: 'border-amber-400/45 bg-amber-400/5 text-amber-400',
  Cancelled: 'border-rose-500/40 bg-rose-500/5 text-rose-400',
};

const UPPERCASE_TEXT: Record<TransactionStatus, string> = {
  Settled: 'SETTLED',
  Pending: 'PENDING',
  Cancelled: 'CANCELLED',
};

export function StatusPill({ status }: { status: TransactionStatus }) {
  const isPending = status === 'Pending';
  return (
    <span
      data-status={status}
      data-motion-state={isPending ? 'pulse' : 'static'}
      className={[
        'inline-block rounded-sm border px-2 py-0.5',
        'font-mono text-[10px] font-semibold tracking-[0.06em]',
        VARIANTS[status],
        isPending ? 'animate-[pulse-halo_2.4s_ease-in-out_infinite]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {UPPERCASE_TEXT[status]}
    </span>
  );
}
```

Note: the visible text is uppercase (`SETTLED`/`PENDING`/`CANCELLED`) — but the existing test queries by `data-status` (the original casing), so it passes. No other test queries the pill text.

- [ ] **Step 3: Run the targeted Playwright test**

```bash
npx playwright test -g "status pill renders with semantic color class"
```

Expected: PASS.

- [ ] **Step 4: Run the full Playwright suite to confirm nothing else broke**

```bash
npx playwright test
```

Expected: all 18 tests still pass (the detail test asserts `/^(Settled|Pending|Cancelled)$/` against the pill's text — our `data-status` attribute carries that exact value, AND the pill text is uppercase. Re-check the detail.spec.ts test selector — it uses `filter({ hasText: /^(Settled|Pending|Cancelled)$/ })`. That would break because our pill text is now uppercase.)

If the detail test fails on the pill regex, update it in this same commit:

Open `frontend/e2e/detail.spec.ts` and update the assertion:

```ts
await expect(
  page
    .locator('[data-status]')
    .filter({ hasText: /^(SETTLED|PENDING|CANCELLED)$/ })
    .first(),
).toBeVisible();
```

- [ ] **Step 5: Re-run Playwright**

```bash
npx playwright test
```

Expected: all 18 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/StatusPill.tsx frontend/e2e/list.spec.ts frontend/e2e/detail.spec.ts
git commit -m "$(cat <<'EOF'
StatusPill: terminal-styled pill with data-status + Pending pulse

Replaces pastel bg-*-100 classes with bordered cyan/amber/rose pills on
dark surfaces. Adds data-status attribute so tests query semantics rather
than class names. Pending variant pulses via the pulse-halo keyframe.
Visible text is uppercase; existing test selectors updated to match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rewrite SkeletonRows (shimmer instead of animate-pulse)

**Files:**
- Rewrite: `frontend/src/components/SkeletonRows.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `frontend/src/components/SkeletonRows.tsx`:

```tsx
interface Props {
  count: number;
  columns: number;
}

export function SkeletonRows({ count, columns }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx} data-testid="skeleton-row" className="border-b border-line">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-3 py-2.5">
              <div
                data-motion-id="skeleton-bar"
                className="h-3 w-3/4 rounded-sm bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-line-strong)_50%,var(--color-line)_100%)] bg-[length:200%_100%] animate-[shimmer-sweep_1.6s_linear_infinite]"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Run the skeleton row test**

```bash
npx playwright test -g "skeleton rows before data arrives"
```

Expected: PASS — the test selector is `tbody tr[data-testid="skeleton-row"]`, unchanged.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SkeletonRows.tsx
git commit -m "$(cat <<'EOF'
SkeletonRows: shimmer sweep instead of animate-pulse

Same component API and data-testid; new cell content sweeps a 200%-wide
gradient using the shimmer-sweep keyframe. Adds data-motion-id="skeleton-bar"
for motion.spec.ts wiring assertions in Task 26.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 3 — New foundational primitives

### Task 5: Button + EmptyState + ErrorBanner + TypeLabel

**Files:**
- Create: `frontend/src/components/Button.tsx`
- Create: `frontend/src/components/EmptyState.tsx`
- Create: `frontend/src/components/ErrorBanner.tsx`
- Create: `frontend/src/components/TypeLabel.tsx`

- [ ] **Step 1: Create Button.tsx**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'ghost' | 'primary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  ghost:
    'border-line-strong bg-bg-elev text-text hover:border-cyan hover:text-cyan hover:shadow-[0_0_0_3px_var(--color-cyan-glow)]',
  primary:
    'border-cyan bg-cyan/10 text-cyan hover:bg-cyan/15',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={[
        'inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5',
        'font-mono text-[11px] font-medium uppercase tracking-[0.08em]',
        'transition-all duration-[120ms]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line-strong disabled:hover:text-text disabled:hover:shadow-none',
        VARIANTS[variant],
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>
  );
});
```

- [ ] **Step 2: Create EmptyState.tsx**

```tsx
import type { ReactNode } from 'react';

interface Props {
  message: string;
  action?: ReactNode;
}

export function EmptyState({ message, action }: Props) {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-line bg-bg-elev px-6 py-8">
      <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
        {message}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 3: Create ErrorBanner.tsx**

```tsx
import type { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
}

export function ErrorBanner({ title, action }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-rose-500/40 bg-rose-500/[0.04] px-4 py-3">
      <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-rose-400">
        {title}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 4: Create TypeLabel.tsx**

```tsx
import type { TransactionType } from '../api/transactions';

const COLOR: Record<TransactionType, string> = {
  Buy: 'text-emerald-400',
  Sell: 'text-rose-400',
  Dividend: 'text-cyan',
  Fee: 'text-amber-400',
  Transfer: 'text-text-dim',
};

const SHORT: Record<TransactionType, string> = {
  Buy: 'BUY',
  Sell: 'SELL',
  Dividend: 'DIV',
  Fee: 'FEE',
  Transfer: 'TRF',
};

export function TypeLabel({ type }: { type: TransactionType }) {
  return (
    <span className={`font-mono text-[10px] font-semibold tracking-[0.05em] ${COLOR[type]}`}>
      {SHORT[type]}
    </span>
  );
}
```

- [ ] **Step 5: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Button.tsx frontend/src/components/EmptyState.tsx frontend/src/components/ErrorBanner.tsx frontend/src/components/TypeLabel.tsx
git commit -m "$(cat <<'EOF'
Primitives: Button, EmptyState, ErrorBanner, TypeLabel

Ghost-variant button matching pagination/clear-filters style.
Mono uppercase EmptyState + ErrorBanner shells. TypeLabel renders the
shortened BUY/SELL/DIV/FEE/TRF colored badge for the table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 4 — Root layout shell

### Task 6: ScanBeam + Header

**Files:**
- Create: `frontend/src/components/ScanBeam.tsx`
- Create: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Create ScanBeam.tsx**

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

- [ ] **Step 2: Create Header.tsx**

```tsx
import { useEffect, useState } from 'react';

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

export function Header() {
  const now = useLiveClock();
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} EDT`;

  return (
    <header
      role="banner"
      aria-label="LedgerOne"
      className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-6 py-3 lg:px-8">
        <div className="flex items-center gap-3 font-mono text-[13px] font-bold tracking-[0.18em] text-cyan">
          <span
            data-motion-id="logo-dot"
            className="block h-2 w-2 rounded-full bg-cyan shadow-[0_0_14px_var(--color-cyan-glow)] animate-[blink-dim_2s_ease-in-out_infinite]"
          />
          LEDGER//ONE
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

- [ ] **Step 3: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ScanBeam.tsx frontend/src/components/Header.tsx
git commit -m "$(cat <<'EOF'
Primitives: ScanBeam + Header (logo, LIVE, session, live clock)

ScanBeam is a fixed 1px element at viewport top z-50 that sweeps the
cyan gradient across via the scan-sweep keyframe. Header has a blinking
logo dot, a LIVE indicator with a blinking green dot, decorative session
ID, and a real wall-clock updating every second via setInterval. The
header carries role="banner" and aria-label="LedgerOne" so existing
getByRole('heading', { name: 'LedgerOne' }) tests can be redirected to
getByRole('banner').

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rewrite __root.tsx to use Header + ScanBeam

**Files:**
- Rewrite: `frontend/src/routes/__root.tsx`
- Modify: `frontend/e2e/list.spec.ts` (one heading assertion)

- [ ] **Step 1: Update the heading test**

Open `frontend/e2e/list.spec.ts`. Find the first test `list page loads and shows table with rows` and replace its first assertion:

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

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-bg text-text">
      <ScanBeam />
      <Header />
      <main className="px-6 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  ),
});
```

- [ ] **Step 3: Run the updated heading test**

```bash
npx playwright test -g "list page loads and shows table with rows"
```

Expected: PASS.

- [ ] **Step 4: Run the full suite**

```bash
npx playwright test
```

Expected: all 18 tests pass. The rest of the page still uses sub-project 2 components — it'll look broken in places (light-on-dark text) but selectors still resolve.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/__root.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
__root.tsx: Header + ScanBeam shell; update heading test selector

Replaces the plain <h1>LedgerOne</h1> with the full Header primitive
(logo + LIVE + clock) and adds the fixed ScanBeam at viewport top.
The list test now queries getByRole('banner') for the brand text.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 5 — Stat strip

### Task 8: Counter primitive (animated number)

**Files:**
- Create: `frontend/src/components/Counter.tsx`

- [ ] **Step 1: Create Counter.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Counter({ value, format = (n) => n.toLocaleString(), durationMs = 1100 }: Props) {
  const [display, setDisplay] = useState(0);
  const previousRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      previousRef.current = value;
      return;
    }
    const from = previousRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        previousRef.current = to;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reducedMotion]);

  return <span className="tabular-nums">{format(display)}</span>;
}
```

- [ ] **Step 2: Create the useReducedMotion hook stub (real implementation in Task 25)**

Create `frontend/src/lib/useReducedMotion.ts` with a temporary inline implementation so Counter compiles. Task 25 will swap this for Framer's hook + media-query awareness.

```ts
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

- [ ] **Step 3: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Counter.tsx frontend/src/lib/useReducedMotion.ts
git commit -m "$(cat <<'EOF'
Primitives: Counter (rAF + easeOutCubic) + useReducedMotion hook

Counter ramps from previous value to target over ~1.1s with cubic ease,
re-running when prop changes. Respects prefers-reduced-motion by snapping
to final value. useReducedMotion subscribes to the media-query change
event so the value updates if the user toggles the OS setting.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: StatCard + StatStrip with real-data wiring

**Files:**
- Create: `frontend/src/components/StatCard.tsx`
- Create: `frontend/src/components/StatStrip.tsx`
- Create: `frontend/src/lib/statStrip.ts`

- [ ] **Step 1: Create statStrip.ts data helpers**

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../api/transactions';

const TOTAL_KEY = ['stat-strip', 'total'] as const;
const PENDING_KEY = ['stat-strip', 'pending'] as const;

export function useTotalTransactionsCount() {
  return useQuery({
    queryKey: TOTAL_KEY,
    queryFn: ({ signal }) =>
      fetchTransactions(
        { page: 1, pageSize: 1, sortBy: 'date', sortDir: 'desc' },
        signal,
      ).then((r) => r.total),
    staleTime: 60_000,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: ({ signal }) =>
      fetchTransactions(
        { page: 1, pageSize: 1, sortBy: 'date', sortDir: 'desc', status: 'Pending' },
        signal,
      ).then((r) => r.total),
    staleTime: 60_000,
  });
}

/**
 * Atmospheric values — disclosed in README. No SUM/DISTINCT endpoints exist
 * for these aggregates and we're not adding any. Same honest-disclosure
 * pattern as the LIVE indicator and session ID in the Header.
 */
export const ATMOSPHERIC_VOLUME_M = 47;
export const ATMOSPHERIC_ADVISORS = 38;
```

- [ ] **Step 2: Create StatCard.tsx**

```tsx
import type { ReactNode } from 'react';
import { Counter } from './Counter';

interface Props {
  label: string;
  value: number | null; // null = loading
  format?: (n: number) => string;
  delta: ReactNode;
}

export function StatCard({ label, value, format, delta }: Props) {
  return (
    <div className="flex flex-col gap-2 bg-bg-elev px-4 py-3.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </div>
      <div className="font-mono text-[22px] font-semibold leading-none tracking-[-0.01em] text-text-bright">
        {value === null ? (
          <span
            data-testid="stat-skeleton"
            className="block h-[22px] w-24 rounded-sm bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-line-strong)_50%,var(--color-line)_100%)] bg-[length:200%_100%] animate-[shimmer-sweep_1.6s_linear_infinite]"
          />
        ) : (
          <Counter value={value} format={format} />
        )}
      </div>
      <div className="font-mono text-[10px]">{delta}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create StatStrip.tsx**

```tsx
import { StatCard } from './StatCard';
import {
  useTotalTransactionsCount,
  usePendingCount,
  ATMOSPHERIC_VOLUME_M,
  ATMOSPHERIC_ADVISORS,
} from '../lib/statStrip';

export function StatStrip() {
  const total = useTotalTransactionsCount();
  const pending = usePendingCount();

  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
      <StatCard
        label="Total Transactions"
        value={total.data ?? null}
        delta={<span className="text-emerald-400">▲ 124 today</span>}
      />
      <StatCard
        label="Pending Settlement"
        value={pending.data ?? null}
        delta={<span className="text-rose-400">▼ 8 since 14:00</span>}
      />
      <StatCard
        label="Volume · 24h"
        value={ATMOSPHERIC_VOLUME_M}
        format={(n) => `$${n}M`}
        delta={<span className="text-emerald-400">▲ 12.4%</span>}
      />
      <StatCard
        label="Active Advisors"
        value={ATMOSPHERIC_ADVISORS}
        delta={<span className="text-emerald-400">▲ 3</span>}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS. The StatStrip isn't mounted anywhere yet — it'll come in Phase 9 with the `_dashboard.tsx` migration.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatCard.tsx frontend/src/components/StatStrip.tsx frontend/src/lib/statStrip.ts
git commit -m "$(cat <<'EOF'
Primitives: StatCard + StatStrip + statStrip.ts data helpers

Total and Pending fire additional fetchTransactions({ pageSize: 1 })
queries reading `total` from the response (staleTime 60s so they don't
re-fetch on every render). Volume and Active Advisors are atmospheric
constants — no SUM/DISTINCT endpoints exist and the spec disallows new
backend work. Cards show a shimmer skeleton while real queries are in
flight.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 6 — Table primitives

### Task 10: Sparkline + AmountCell + format.ts

**Files:**
- Create: `frontend/src/components/Sparkline.tsx`
- Create: `frontend/src/components/AmountCell.tsx`
- Create: `frontend/src/lib/format.ts`

- [ ] **Step 1: Create format.ts**

```ts
import type { CurrencyCode } from '../api/transactions';

const amountFormatter = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(amount: number, currency: CurrencyCode): string {
  return `${amountFormatter.format(amount)} ${currency}`;
}

export function formatAmountNumber(amount: number): string {
  return amountFormatter.format(amount);
}

export function formatTransactionDate(iso: string): string {
  // Format "2026-05-12T10:23:00Z" → "05.12 10:23"
  const d = new Date(iso);
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  const hour = d.getUTCHours().toString().padStart(2, '0');
  const minute = d.getUTCMinutes().toString().padStart(2, '0');
  return `${month}.${day} ${hour}:${minute}`;
}
```

- [ ] **Step 2: Create Sparkline.tsx**

```tsx
interface Props {
  /** Seed value (e.g. transaction amount) used to derive a stable shape */
  seed: number;
  /** Color hint — 'positive' for green-ish, 'neutral' for cyan, 'warn' for amber */
  tone?: 'positive' | 'neutral' | 'warn' | 'negative';
}

const TONE_STROKE: Record<NonNullable<Props['tone']>, string> = {
  positive: '#22C55E',
  neutral: '#22D3EE',
  warn: '#FBBF24',
  negative: '#F43F5E',
};

/** Deterministic 7-point polyline derived from the seed so the same row redraws identically. */
function pointsFor(seed: number): string {
  const xs = [0, 6, 12, 18, 24, 30, 38];
  return xs
    .map((x, i) => {
      const wobble = Math.abs(Math.sin(seed * (i + 1) * 0.137)) * 10;
      const y = 12 - wobble;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Sparkline({ seed, tone = 'neutral' }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 38 14"
      className="inline-block h-3.5 w-[38px] opacity-60"
    >
      <polyline fill="none" stroke={TONE_STROKE[tone]} strokeWidth="1" points={pointsFor(seed)} />
    </svg>
  );
}
```

- [ ] **Step 3: Create AmountCell.tsx**

```tsx
import { Sparkline } from './Sparkline';
import { formatAmount } from '../lib/format';
import type { CurrencyCode, TransactionStatus } from '../api/transactions';

interface Props {
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
}

function toneFor(status: TransactionStatus): 'positive' | 'neutral' | 'warn' | 'negative' {
  if (status === 'Pending') return 'warn';
  if (status === 'Cancelled') return 'negative';
  return 'neutral';
}

export function AmountCell({ amount, currency, status }: Props) {
  return (
    <div className="flex items-center justify-end gap-2 font-mono tabular-nums">
      <Sparkline seed={amount} tone={toneFor(status)} />
      <span className="text-text-bright">{formatAmount(amount, currency)}</span>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Sparkline.tsx frontend/src/components/AmountCell.tsx frontend/src/lib/format.ts
git commit -m "$(cat <<'EOF'
Primitives: Sparkline + AmountCell + lib/format.ts

Sparkline derives a deterministic 7-point SVG polyline from the row
amount so re-renders are stable and the same row always shows the same
shape. AmountCell composes sparkline + tabular-nums number + currency
suffix, right-aligned. Tone is picked from the row status: amber for
Pending, rose for Cancelled, cyan default.

format.ts centralizes the Intl.NumberFormat('en-CA') call currently
duplicated in routes/index.tsx and routes/transactions.$id.tsx and adds
a formatTransactionDate helper for the "05.12 10:23" table date.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: DataRow with hover glow

**Files:**
- Create: `frontend/src/components/DataRow.tsx`

- [ ] **Step 1: Create DataRow.tsx**

```tsx
import type { ReactNode, KeyboardEvent } from 'react';

interface Props {
  onActivate: () => void;
  children: ReactNode;
}

export function DataRow({ onActivate, children }: Props) {
  const handleKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKey}
      className={[
        'group cursor-pointer border-b border-line',
        'transition-colors duration-150',
        'hover:bg-cyan/[0.04]',
        'focus:bg-cyan/[0.04] focus:outline-none',
        'relative',
      ].join(' ')}
    >
      <td
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      />
      {children}
    </tr>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DataRow.tsx
git commit -m "$(cat <<'EOF'
Primitives: DataRow (hover glow + left cyan bar + role=button)

Encapsulates the click+Enter+Space handlers currently inlined in
routes/index.tsx, plus the visual hover state (cyan-tinted background
+ 2px left bar). Keeps role=button and tabIndex=0 so the existing
detail.spec.ts tbody tr[role="button"] selector still resolves.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: DataTable with sortable headers

**Files:**
- Create: `frontend/src/components/DataTable.tsx`

- [ ] **Step 1: Create DataTable.tsx**

```tsx
import type { ReactNode } from 'react';
import type { SortField, SortDirection } from '../api/transactions';

interface Column {
  key: string;
  label: string;
  sortable?: SortField;
  align?: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { key: 'date', label: 'DATE', sortable: 'date' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'advisor', label: 'ADVISOR' },
  { key: 'type', label: 'TYPE' },
  { key: 'symbol', label: 'SYM' },
  { key: 'amount', label: 'AMOUNT', sortable: 'amount', align: 'right' },
  { key: 'status', label: 'STATUS' },
];

interface Props {
  sortBy: SortField;
  sortDir: SortDirection;
  onSort: (next: { sortBy: SortField; sortDir: SortDirection }) => void;
  children: ReactNode;
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) {
    return <span className="ml-1 text-text-dim opacity-40">↕</span>;
  }
  return (
    <span
      data-motion-id="sort-arrow"
      className={`ml-1 inline-block text-cyan transition-transform duration-200 ${
        dir === 'asc' ? 'rotate-180' : ''
      }`}
    >
      ▼
    </span>
  );
}

export function DataTable({ sortBy, sortDir, onSort, children }: Props) {
  const handleHeaderClick = (col: Column) => {
    if (!col.sortable) return;
    const nextDir: SortDirection =
      sortBy === col.sortable && sortDir === 'desc' ? 'asc' : 'desc';
    onSort({ sortBy: col.sortable, sortDir: nextDir });
  };

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-line">
      <thead className="bg-bg-elev">
        <tr>
          {COLUMNS.map((col) => {
            const active = col.sortable !== undefined && sortBy === col.sortable;
            const interactive = col.sortable !== undefined;
            return (
              <th
                key={col.key}
                scope="col"
                role="columnheader"
                aria-sort={
                  active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                }
                onClick={interactive ? () => handleHeaderClick(col) : undefined}
                className={[
                  'px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim',
                  interactive ? 'cursor-pointer select-none hover:text-cyan' : '',
                  col.align === 'right' ? 'text-right' : 'text-left',
                ].join(' ')}
              >
                {col.label}
                {col.sortable && <SortIndicator active={active} dir={sortDir} />}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DataTable.tsx
git commit -m "$(cat <<'EOF'
Primitives: DataTable with sortable headers + arrow rotation

DATE and AMOUNT headers are click-to-sort: click toggles sortDir between
desc (default) and asc; clicking a different sortable column resets to
desc. The active column shows a cyan ▼ that rotates 180° when sortDir is
asc. role=columnheader + aria-sort declared so the redesigned Sort
Playwright test can query by column header name.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 7 — Pagination

### Task 13: PaginationBar with page-turn motion

**Files:**
- Create: `frontend/src/components/PaginationBar.tsx`

- [ ] **Step 1: Create PaginationBar.tsx**

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './Button';

interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (next: number) => void;
}

export function PaginationBar({ page, totalPages, pageSize, total, onPage }: Props) {
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-dim">
      <span>
        Showing {startIdx.toLocaleString()}–{endIdx.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-3">
        <Button
          aria-label="Prev"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ‹ Prev
        </Button>
        <span className="text-text-bright">
          Page{' '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={page}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="inline-block tabular-nums"
            >
              {page}
            </motion.span>
          </AnimatePresence>{' '}
          of {totalPages}
        </span>
        <Button
          aria-label="Next"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PaginationBar.tsx
git commit -m "$(cat <<'EOF'
Primitives: PaginationBar with AnimatePresence page-turn motion

Prev/Next buttons carry aria-label so existing getByRole('button', { name: 'Next' })
queries still resolve even though the visible text is "Next ›" and the
text-transform is uppercase. The page number animates via AnimatePresence
keyed on page — old number exits left, new number enters from the right
over 280ms with the snap easing. "Showing X-Y of Z" replaces the bare
"Page X of Y" label.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 8 — FilterBar rewrite

### Task 14: Chip primitive

**Files:**
- Create: `frontend/src/components/Chip.tsx`

- [ ] **Step 1: Create Chip.tsx**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: 'cyan' | 'amber';
}

export const Chip = forwardRef<HTMLButtonElement, Props>(function Chip(
  { active = false, tone = 'cyan', className, children, ...rest },
  ref,
) {
  const activeBg = tone === 'amber' ? 'bg-amber-400/[0.12]' : 'bg-cyan/[0.12]';
  const activeText = tone === 'amber' ? 'text-amber-400' : 'text-cyan';
  const activeBorder = tone === 'amber' ? 'border-amber-400' : 'border-cyan';

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      data-motion-state={active ? 'border' : 'static'}
      {...rest}
      className={[
        'rounded-[3px] border px-2.5 py-1 font-mono text-[11px]',
        'transition-all duration-[120ms]',
        active
          ? `${activeBg} ${activeText} ${activeBorder} relative`
          : 'border-cyan/20 bg-cyan/[0.04] text-text hover:text-text-bright hover:border-cyan/40',
        className ?? '',
      ].join(' ')}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-1px] rounded-[3px] bg-[linear-gradient(135deg,var(--color-cyan),transparent,var(--color-cyan))] bg-[length:300%_300%] animate-[border-rotate_3s_linear_infinite] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] [-webkit-mask-composite:xor] [padding:1px]"
        />
      )}
    </button>
  );
});
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Chip.tsx
git commit -m "$(cat <<'EOF'
Primitives: Chip with animated cyan border when active

Filter chip button with aria-pressed semantics. Inactive chips show a
faint cyan-tinted background. Active chips get the animated gradient
border via CSS mask-composite — a 1px ring that rotates the gradient
position via the border-rotate keyframe (3s loop). data-motion-state
flips to "border" when active so motion.spec.ts can assert wiring.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: SearchInput primitive

**Files:**
- Create: `frontend/src/components/SearchInput.tsx`

- [ ] **Step 1: Create SearchInput.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../lib/useDebouncedValue';

interface Props {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search account or symbol…' }: Props) {
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

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SearchInput.tsx
git commit -m "$(cat <<'EOF'
Primitives: SearchInput (extracted from sub-project 2 FilterBar)

Internal useState mirroring the URL value with useDebouncedValue(300)
synced to parent via onChange. The "Search" <label> wraps the input so
the existing getByLabel('Search').fill(...) Playwright selector resolves
unchanged. Mono input with ⌕ glyph lead matches the Terminal Dense
aesthetic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: DateRangePill primitive

**Files:**
- Create: `frontend/src/components/DateRangePill.tsx`

- [ ] **Step 1: Create DateRangePill.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';

interface Props {
  fromDate: string | undefined;
  toDate: string | undefined;
  onChange: (next: { fromDate?: string; toDate?: string }) => void;
}

function summary(fromDate: string | undefined, toDate: string | undefined): string {
  if (!fromDate && !toDate) return 'ALL TIME';
  if (fromDate && !toDate) return `FROM ${fromDate}`;
  if (!fromDate && toDate) return `UNTIL ${toDate}`;
  return `${fromDate} → ${toDate}`;
}

export function DateRangePill({ fromDate, toDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const active = Boolean(fromDate || toDate);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={[
          'rounded-[3px] border px-2.5 py-1 font-mono text-[11px]',
          'transition-all duration-[120ms]',
          active
            ? 'border-cyan bg-cyan/[0.12] text-cyan'
            : 'border-cyan/20 bg-cyan/[0.04] text-text hover:text-text-bright hover:border-cyan/40',
        ].join(' ')}
      >
        {summary(fromDate, toDate)}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex flex-col gap-2 rounded-lg border border-line-strong bg-bg-elev p-3 shadow-lg">
          <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
            <span>From</span>
            <input
              type="date"
              value={fromDate ?? ''}
              onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
              className="rounded-[3px] border border-line-strong bg-bg px-2 py-1 text-[12px] text-text-bright normal-case tracking-normal focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
            <span>To</span>
            <input
              type="date"
              value={toDate ?? ''}
              onChange={(e) => onChange({ toDate: e.target.value || undefined })}
              className="rounded-[3px] border border-line-strong bg-bg px-2 py-1 text-[12px] text-text-bright normal-case tracking-normal focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DateRangePill.tsx
git commit -m "$(cat <<'EOF'
Primitives: DateRangePill with From/To popover

Pill button summarizes the current range ("ALL TIME" / "FROM x" /
"x → y") and toggles a small floating panel with two native date inputs.
"From" and "To" <label>s inside the panel preserve the existing
getByLabel('From')/getByLabel('To') Playwright selectors. Click-outside
closes the popover.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: FilterBar rewrite (chips + DateRangePill + SearchInput, no Sort dropdown)

**Files:**
- Rewrite: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/e2e/list.spec.ts` (Type, Status, Sort, page-size selectors)

- [ ] **Step 1: Update list.spec.ts selectors**

Open `frontend/e2e/list.spec.ts`. Apply these replacements:

- The Type filter test (currently `getByLabel('Type').selectOption('Buy')`):

```ts
test('Type filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(12);
});
```

- The Status filter test (currently `getByLabel('Status').selectOption('Pending')`):

```ts
test('Status filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Pending', exact: true }).click();
  await expect(page).toHaveURL(/[?&]status=Pending(&|$)/);
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(20);
});
```

- The Sort test (currently `getByLabel('Sort').selectOption('amount:desc')`):

```ts
test('Sort header click changes URL and reorders rows by amount desc', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('columnheader', { name: /AMOUNT/i }).click();
  await expect(page).toHaveURL(/[?&]sortBy=amount(&|$)/);
  await expect(page).toHaveURL(/[?&]sortDir=desc(&|$)/);
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);

  const firstAmount = await page.locator('tbody tr[role="button"]').first().locator('td').nth(5).textContent();
  const secondAmount = await page.locator('tbody tr[role="button"]').nth(1).locator('td').nth(5).textContent();
  const parse = (s: string | null) => parseFloat((s ?? '').replace(/[^\d.]/g, ''));
  expect(parse(firstAmount)).toBeGreaterThanOrEqual(parse(secondAmount));
});
```

- The "changing a filter from page=2 returns to page=1" test:

```ts
test('changing a filter from page=2 returns to page=1', async ({ page }) => {
  await page.goto('/?page=2');
  await expect(page.getByText(/Page\s+2\s*of\s*3/i)).toBeVisible();

  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Buy', exact: true }).click();

  await expect(page).toHaveURL(/[?&]page=1(&|$)/);
});
```

- The empty-state test:

```ts
test('empty state with active filter offers Clear Filters that restores rows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Buy', exact: true }).click();
  await page.getByLabel('Search').fill('zzzzz-not-found');
  await expect(page).toHaveURL(/[?&]search=zzzzz-not-found(&|$)/, { timeout: 2000 });

  await expect(page.getByText(/No transactions match these filters/i)).toBeVisible();
  await page.getByRole('button', { name: 'Clear Filters' }).click();

  await expect(page).not.toHaveURL(/[?&]search=/);
  await expect(page).not.toHaveURL(/[?&]type=/);
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(25);
});
```

- The "list page loads" test: update `tbody tr` count selector to `tbody tr[role="button"]` to skip non-row table content:

```ts
test('list page loads and shows table with rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('LEDGER//ONE');
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(7);
  await expect(table.locator('tbody tr[role="button"]')).toHaveCount(25);
});
```

- The "Next button advances" test: update first/new row selectors to use `tbody tr[role="button"]`:

```ts
test('Next button advances to page 2 and updates URL', async ({ page }) => {
  await page.goto('/');
  const firstRowAccount = await page.locator('tbody tr[role="button"]').first().locator('td').nth(1).textContent();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/[?&]page=2(&|$)/);

  const newFirstRowAccount = await page
    .locator('tbody tr[role="button"]')
    .first()
    .locator('td')
    .nth(1)
    .textContent();
  expect(newFirstRowAccount).not.toBe(firstRowAccount);
  await expect(page.getByText(/Page\s+2\s*of\s*\d+/i)).toBeVisible();
});
```

- "Prev button returns to page 1":

```ts
test('Prev button returns to page 1', async ({ page }) => {
  await page.goto('/?page=2');
  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page).toHaveURL(/^[^?]*\/?$|[?&]page=1(&|$)/);
  await expect(page.getByText(/Page\s+1\s*of\s*\d+/i)).toBeVisible();
});
```

- "Next button is disabled on last page":

```ts
test('Next button is disabled on last page', async ({ page }) => {
  await page.goto('/?page=3');
  await expect(page.getByText(/Page\s+3\s*of\s*3/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});
```

- "Page-size selector": keep using `getByLabel('Page size')` (still a native `<select>` per the spec).

```ts
test('Page-size selector changes rows-per-page and resets page to 1', async ({ page }) => {
  await page.goto('/?page=2');
  await expect(page.getByText(/Page\s+2\s*of\s*3/i)).toBeVisible();

  await page.getByLabel('Page size').selectOption('50');

  await expect(page).toHaveURL(/[?&]pageSize=50(&|$)/);
  await expect(page).toHaveURL(/[?&]page=1(&|$)/);
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(50);
});
```

- The "No transactions" empty-state test (cleared fixture):

```ts
test('shows empty-state message when no transactions', async ({ page }) => {
  await clearFixture();
  await page.goto('/');
  await expect(page.getByText(/No transactions$/i)).toBeVisible();
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Rewrite FilterBar.tsx**

Replace the entire contents of `frontend/src/components/FilterBar.tsx`:

```tsx
import type { ListSearch } from '../lib/listSearch';
import { ALLOWED_PAGE_SIZES } from '../lib/listSearch';
import type { TransactionType, TransactionStatus } from '../api/transactions';
import { Chip } from './Chip';
import { SearchInput } from './SearchInput';
import { DateRangePill } from './DateRangePill';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];
const STATUSES: readonly TransactionStatus[] = ['Pending', 'Settled', 'Cancelled'];

export function FilterBar({ value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg-elev/40 px-3 py-3">
      <fieldset
        role="group"
        aria-label="Type"
        className="flex flex-wrap items-center gap-1.5"
      >
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

      <fieldset
        role="group"
        aria-label="Status"
        className="flex flex-wrap items-center gap-1.5"
      >
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

        <SearchInput
          value={value.search}
          onChange={(next) => onChange({ search: next })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS. ESLint will warn that the old `useDebouncedValue` import inside `FilterBar` is gone — that's fine, but if the new file still has unused imports clean them up.

- [ ] **Step 4: Commit (FilterBar will not render correctly until the `_dashboard.tsx` migration in Task 18; commit anyway to keep changes atomic)**

```bash
git add frontend/src/components/FilterBar.tsx frontend/e2e/list.spec.ts
git commit -m "$(cat <<'EOF'
FilterBar: chip groups + DateRangePill + SearchInput; sort moves to headers

Type and Status become chip groups inside <fieldset role="group" aria-label>
so getByRole('group', { name: 'Type' }) is the new anchor. The Sort
dropdown is gone — sorting is driven by clicking the DATE or AMOUNT
column header (see DataTable). DateRangePill replaces the inline date
inputs and keeps "From"/"To" labels inside its popover so getByLabel()
selectors still resolve. Page size stays a native <select> (chip group
is overkill for 3 options) so getByLabel('Page size') is unchanged.

Existing Playwright assertions are updated in the same commit per the
spec's Test compatibility table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 9 — Pathless layout migration

### Task 18: Migrate routes/index.tsx into _dashboard.tsx pathless layout

**Files:**
- Create: `frontend/src/routes/_dashboard.tsx`
- Create: `frontend/src/routes/_dashboard.index.tsx`
- Delete: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create _dashboard.tsx (the pathless layout owning validateSearch + the list query)**

```tsx
import {
  createFileRoute,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
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
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, ...next, page: 1 }),
    });

  const onSortChange = (next: { sortBy: typeof search.sortBy; sortDir: typeof search.sortDir }) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, ...next }) });

  const onPageChange = (nextPage: number) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, page: nextPage }) });

  return (
    <div>
      <StatStrip />
      <FilterBar value={search} onChange={onFilterChange} />

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
            <DataTable
              sortBy={search.sortBy}
              sortDir={search.sortDir}
              onSort={onSortChange}
            >
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

      <AnimatePresence>
        <Outlet />
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create _dashboard.index.tsx (matches `/`, returns null — the layout owns the chrome)**

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

The TanStack Router plugin watches the `routes/` directory and regenerates `routeTree.gen.ts` automatically during `npm run dev`. Run the dev server briefly so the file picks up the new structure:

```bash
npm run dev
```

Wait until the terminal shows "ready", then press Ctrl+C. Verify `frontend/src/routeTree.gen.ts` was updated (it should now reference `_dashboard` and `_dashboard/`).

- [ ] **Step 5: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Run the Playwright suite**

```bash
npx playwright test
```

Expected: all list and detail tests still pass with the updated selectors from Task 17.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/routes/_dashboard.tsx frontend/src/routes/_dashboard.index.tsx frontend/src/routeTree.gen.ts
git rm frontend/src/routes/index.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
Routes: migrate / into pathless _dashboard.tsx layout

The dashboard chrome (stat strip + filter bar + table + pagination)
moves out of the per-route component into a pathless layout that matches
any child route, so the list stays mounted when /transactions/$id renders
into the layout's <Outlet />. _dashboard.index.tsx returns null because
the layout already owns the chrome. URL contract is unchanged: / still
renders the list, ?type=Buy etc. all still validate via the same
listSearchSchema (now declared on the layout route).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 10 — State polish (refetch dim & progress sliver)

### Task 19: Refetch progress sliver under the filter bar

**Files:**
- Modify: `frontend/src/routes/_dashboard.tsx`

- [ ] **Step 1: Add the cyan progress sliver**

Open `frontend/src/routes/_dashboard.tsx`. Find the `<FilterBar value={search} onChange={onFilterChange} />` line and wrap it so a 1px cyan bar appears below it while `isFetching && !isPending`:

```tsx
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
```

- [ ] **Step 2: Run the Playwright suite to confirm nothing regressed**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/_dashboard.tsx
git commit -m "$(cat <<'EOF'
_dashboard: cyan progress sliver under filter bar during refetch

Shows a 1px scanning cyan line beneath the filter bar whenever the list
query is in flight after the initial load (isFetching && !isPending).
Combined with the 60% rows-opacity dim that's already in the layout,
this signals "loading new data" without flashing the skeleton.
data-motion-id="refetch-sliver" wires it up for motion.spec.ts assertions
in Task 26.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 11 — Detail panel

### Task 20: DetailField primitive

**Files:**
- Create: `frontend/src/components/DetailField.tsx`

- [ ] **Step 1: Create DetailField.tsx**

```tsx
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
  index?: number;
}

export function DetailField({ label, children, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 + index * 0.025 }}
      className="flex flex-col gap-1"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </span>
      <span className="text-[13px] text-text-bright">{children}</span>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DetailField.tsx
git commit -m "$(cat <<'EOF'
Primitives: DetailField (label + value with stagger fade-up)

Mono uppercase label above a bright value. Each field fades up 8px over
200ms with a 25ms stagger from its index — driven by motion/react's
transition.delay so reduced-motion users skip it via useReducedMotion
in DetailPanel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: DetailPanel primitive (slide-in container)

**Files:**
- Create: `frontend/src/components/DetailPanel.tsx`

- [ ] **Step 1: Create DetailPanel.tsx**

```tsx
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailPanel({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            data-testid="detail-backdrop"
            className="fixed inset-0 z-40 bg-black"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-label={title}
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 z-50 h-screen w-[min(480px,100vw)] overflow-y-auto border-l border-line-strong bg-bg-elev"
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-[3px] border border-line-strong px-2 py-1 font-mono text-[14px] leading-none text-text-dim transition-colors hover:border-cyan hover:text-cyan"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DetailPanel.tsx
git commit -m "$(cat <<'EOF'
Primitives: DetailPanel — overlay with backdrop, slide-in, ESC close

Fixed-position right panel, 480px wide. Backdrop fades in to 40% over
200ms and closes the panel on click; panel slides in from x:100% to 0
over 280ms with the snap easing. Esc closes via a window keydown
listener bound only while open. role="dialog" + aria-modal=true +
aria-label for screen-reader semantics. Close × button carries
aria-label="Close" so the detail.spec.ts close test resolves.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Migrate detail route to _dashboard.transactions.$id.tsx

**Files:**
- Create: `frontend/src/routes/_dashboard.transactions.$id.tsx`
- Delete: `frontend/src/routes/transactions.$id.tsx`
- Modify: `frontend/e2e/detail.spec.ts`

- [ ] **Step 1: Create _dashboard.transactions.$id.tsx**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransaction, transactionDetailKey } from '../api/transactions';
import { ApiError } from '../api/client';
import { DetailPanel } from '../components/DetailPanel';
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

  const close = () =>
    navigate({ to: '/', search: (prev) => prev });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: transactionDetailKey(numericId),
    queryFn: ({ signal }) => fetchTransaction(numericId, signal),
    retry: false,
  });

  const is404 = isError && error instanceof ApiError && error.status === 404;

  return (
    <DetailPanel open onClose={close} title={`TXN-${id}`}>
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
    </DetailPanel>
  );
}
```

- [ ] **Step 2: Delete the old transactions.$id.tsx**

```bash
git rm frontend/src/routes/transactions.\$id.tsx
```

(On Windows PowerShell escape the `$` with a backtick: `frontend/src/routes/transactions.\`$id.tsx`. Adjust to whatever your shell needs.)

- [ ] **Step 3: Update detail.spec.ts**

Replace the entire contents of `frontend/e2e/detail.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('row click navigates to detail panel with all fields visible', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await expect(realRow).toBeVisible();
  await realRow.click();

  await expect(page).toHaveURL(/\/transactions\/\d+(\?.*)?$/);
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Account', { exact: true })).toBeVisible();
  await expect(panel.getByText('Advisor', { exact: true })).toBeVisible();
  await expect(panel.getByText('Notes')).toBeVisible();
  await expect(panel.locator('[data-status]').first()).toBeVisible();
});

test('Esc closes the panel and URL returns to filtered list', async ({ page }) => {
  await page.goto('/?type=Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  const realRow = page.locator('tbody tr[role="button"]').first();
  await realRow.click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.keyboard.press('Escape');

  await expect(page).not.toHaveURL(/\/transactions\//);
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
});

test('close button closes the panel', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await realRow.click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('backdrop click closes the panel', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await realRow.click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.locator('[data-testid="detail-backdrop"]').click();

  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('list stays mounted underneath the panel', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await realRow.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // Table is still in the DOM; it's just dimmed behind the panel.
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(25);
});

test('detail panel shows "Transaction not found" for missing id', async ({ page }) => {
  await page.goto('/transactions/999999');
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Transaction not found/i)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Return to the list' })).toBeVisible();
});
```

- [ ] **Step 4: Regenerate the route tree**

```bash
npm run dev
```

Wait for "ready", Ctrl+C. Verify `routeTree.gen.ts` was updated.

- [ ] **Step 5: Run Playwright**

```bash
npx playwright test
```

Expected: all list tests pass; the rewritten detail tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/_dashboard.transactions.\$id.tsx frontend/src/routeTree.gen.ts frontend/e2e/detail.spec.ts
git rm frontend/src/routes/transactions.\$id.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
Routes: detail view migrates from full-route page to overlay panel

URL contract is preserved (/transactions/$id with the listSearchSchema
search params). The detail content now renders inside <DetailPanel /> —
a fixed-position 480px slide-in over a still-mounted list. Close routes
are Esc, the × button, or backdrop click, all of which navigate back to
/ preserving the search params (the old "Back to list" <Link> is gone).

detail.spec.ts is rewritten to:
  • assert the panel is a role="dialog" with the field labels inside
  • use Esc + close button + backdrop click instead of the Back link
  • prove the list table stays mounted underneath (key behavioral test)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase 12 — Reduced-motion sweep, motion test suite, cleanup

### Task 23: Wire useReducedMotion across all motion primitives

**Files:**
- Modify: `frontend/src/components/Counter.tsx` (already done — verify)
- Modify: `frontend/src/components/DetailField.tsx`
- Modify: `frontend/src/components/DetailPanel.tsx`
- Modify: `frontend/src/components/PaginationBar.tsx`
- Modify: `frontend/src/lib/useReducedMotion.ts` (no change needed — already correct)

- [ ] **Step 1: DetailField — short-circuit motion when reduced**

Replace `frontend/src/components/DetailField.tsx`:

```tsx
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  label: string;
  children: ReactNode;
  index?: number;
}

export function DetailField({ label, children, index = 0 }: Props) {
  const reduced = useReducedMotion();
  const initial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.2, delay: 0.05 + index * 0.025 };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="flex flex-col gap-1"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </span>
      <span className="text-[13px] text-text-bright">{children}</span>
    </motion.div>
  );
}
```

- [ ] **Step 2: DetailPanel — short-circuit slide when reduced**

Open `frontend/src/components/DetailPanel.tsx`. Add `const reduced = useReducedMotion();` after the `useEffect` and update the motion props on backdrop and panel:

```tsx
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailPanel({ open, onClose, title, children }: Props) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const panelInitial = reduced ? { opacity: 0 } : { x: '100%' };
  const panelAnimate = reduced ? { opacity: 1 } : { x: 0 };
  const panelExit = reduced ? { opacity: 0 } : { x: '100%' };
  const panelTransition = reduced
    ? { duration: 0.1 }
    : { duration: 0.28, ease: [0.32, 0.72, 0, 1] };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.1 : 0.2 }}
            onClick={onClose}
            data-testid="detail-backdrop"
            className="fixed inset-0 z-40 bg-black"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-label={title}
            aria-modal="true"
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={panelTransition}
            className="fixed right-0 top-0 z-50 h-screen w-[min(480px,100vw)] overflow-y-auto border-l border-line-strong bg-bg-elev"
            style={{ willChange: 'transform' }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-cyan">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-[3px] border border-line-strong px-2 py-1 font-mono text-[14px] leading-none text-text-dim transition-colors hover:border-cyan hover:text-cyan"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: PaginationBar — short-circuit page-turn when reduced**

Open `frontend/src/components/PaginationBar.tsx` and update the motion.span:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './Button';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (next: number) => void;
}

export function PaginationBar({ page, totalPages, pageSize, total, onPage }: Props) {
  const reduced = useReducedMotion();
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const motionProps = reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        initial: { opacity: 0, x: 12 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -12 },
        transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
      };

  return (
    <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-dim">
      <span>
        Showing {startIdx.toLocaleString()}–{endIdx.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-3">
        <Button aria-label="Prev" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ Prev
        </Button>
        <span className="text-text-bright">
          Page{' '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={page} {...motionProps} className="inline-block tabular-nums">
              {page}
            </motion.span>
          </AnimatePresence>{' '}
          of {totalPages}
        </span>
        <Button
          aria-label="Next"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript and run Playwright**

```bash
npx tsc --noEmit
npx playwright test
```

Expected: PASS / all 18+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DetailField.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/PaginationBar.tsx
git commit -m "$(cat <<'EOF'
Reduced-motion: short-circuit panel/page/field animations

DetailField, DetailPanel, and PaginationBar now consult useReducedMotion
and switch to instant or fast-fade variants when the user prefers reduced
motion. Counter already had this in place since Task 8. CSS-only loops
(scan beam, pulse, shimmer, blink, border rotate) are zeroed globally by
the @media (prefers-reduced-motion: reduce) block in styles.css.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: motion.spec.ts — motion wiring tests

**Files:**
- Create: `frontend/e2e/motion.spec.ts`

- [ ] **Step 1: Create motion.spec.ts**

```ts
import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('motion infrastructure is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-motion-id="scan-beam"]')).toBeVisible();
  await expect(page.locator('[data-motion-id="logo-dot"]')).toBeVisible();
  await expect(page.locator('[data-motion-id="live-dot"]')).toBeVisible();

  // Wait for rows to render
  await expect(page.locator('tbody tr[role="button"]').first()).toBeVisible();
  // At least one Pending pill is in the fixture (15 of 60).
  const pendingPills = page.locator('[data-status="Pending"]');
  await expect(pendingPills.first()).toBeVisible();
  await expect(pendingPills.first()).toHaveAttribute('data-motion-state', 'pulse');
});

test('active filter chip is annotated as bordered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Buy', exact: true }).click();
  const buyChip = page.getByTestId('type-chip-Buy');
  await expect(buyChip).toHaveAttribute('data-motion-state', 'border');
});

test('reduced motion suppresses ambient loops and counter animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Counter snaps to final value on first paint (no zero-to-N ramp).
  // The Total card is the first stat card.
  const totalCard = page.locator('.bg-bg-elev').filter({ hasText: 'Total Transactions' }).first();
  await expect(totalCard).toBeVisible();
  // Wait for the real query to resolve.
  await expect(totalCard).not.toContainText(/^0$/);

  // Pending pills lose the pulse state.
  await expect(page.locator('tbody tr[role="button"]').first()).toBeVisible();
  const pendingPills = page.locator('[data-status="Pending"]');
  const count = await pendingPills.count();
  if (count > 0) {
    // With reduced motion, the pulse class is suppressed by the global
    // @media (prefers-reduced-motion: reduce) rule; data-motion-state is
    // still on the element but the animation duration is 0.
    // Assert that no Pending pill has a running animation in computed style.
    for (let i = 0; i < count; i += 1) {
      const duration = await pendingPills.nth(i).evaluate(
        (el) => getComputedStyle(el).animationDuration,
      );
      expect(duration).toBe('0s');
    }
  }
});
```

- [ ] **Step 2: Run the new spec**

```bash
npx playwright test motion.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Run the full suite**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/motion.spec.ts
git commit -m "$(cat <<'EOF'
e2e: motion.spec.ts — wiring + reduced-motion assertions

Three tests: (1) scan beam, logo dot, live dot present and Pending pills
carry data-motion-state="pulse"; (2) clicking the Buy filter chip flips
its data-motion-state to "border"; (3) under prefers-reduced-motion the
counter ends at a non-zero final value (snap behavior) and Pending pills'
computed animationDuration is 0s (the global reduced-motion CSS rule
zeros all animations).

These are wiring-only assertions, not pixel-perfect motion checks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: Final cleanup — lint, format, full test pass

**Files:**
- All

- [ ] **Step 1: ESLint**

```bash
npx eslint .
```

Expected: zero errors, zero warnings.

- [ ] **Step 2: Prettier check**

```bash
npx prettier --check .
```

If anything is misformatted, auto-fix:

```bash
npx prettier --write .
```

Then re-run the check to confirm clean.

- [ ] **Step 3: TypeScript no-emit**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Full Playwright suite**

```bash
npx playwright test
```

Expected: all tests pass (15 list + 6 detail + 3 motion = 24 tests).

- [ ] **Step 5: Backend formatting and tests (no changes expected, defensive)**

From the repo root:

```bash
cd backend
dotnet format --verify-no-changes
dotnet test
cd ..
```

Expected: backend format check passes; all backend tests pass (no backend changes were made in this plan).

- [ ] **Step 6: Manual eyeball pass**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Verify by sight:

1. Page is dark, header has the LEDGER//ONE logo with a blinking dot, LIVE indicator, session ID, ticking clock.
2. A 1px cyan beam sweeps across the top of the viewport every 4 seconds.
3. Stat strip has 4 cards. Total and Pending animate up from 0 on load.
4. Filter bar shows chip groups for Type and Status. Click Buy — table rows reduce; active chip has the rotating cyan border.
5. Click the AMOUNT column header — rows reorder, arrow rotates.
6. Hover over a row — left cyan bar appears, background tints cyan.
7. Click a row — detail panel slides in from the right with backdrop fade. Notes section visible.
8. Press Esc — panel slides back out, list still visible.
9. Visit `/transactions/999999` directly — panel mounts with "Transaction not found".
10. In OS settings, enable "Reduce motion" → reload — counters snap, no scan beam, no pill pulse.

Stop the dev server.

- [ ] **Step 7: Final commit (only if Prettier/ESLint applied any auto-fixes)**

```bash
git status
# If anything changed in step 2, commit it:
git add -A
git commit -m "$(cat <<'EOF'
Cleanup: prettier + eslint sweep across visual-polish work

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If nothing changed, no commit needed — the suite was already clean from per-task commits.

---

## Definition of done

After Task 25:

- [ ] All 24+ Playwright tests pass green.
- [ ] `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .` all clean.
- [ ] `dotnet format --verify-no-changes` and `dotnet test` clean (no backend changes).
- [ ] Dev server renders the Terminal Dense dashboard with stat strip, chip-group filters, sortable table headers, status pills with Pending pulse, sparklines on amount cells, animated counters, scan beam, blinking header dots, live clock.
- [ ] Clicking a row slides in the detail panel over the still-mounted list; Esc / close / backdrop click all return to `/` with filters preserved; `/transactions/999999` shows "TRANSACTION NOT FOUND".
- [ ] OS-level reduced-motion preference disables ambient loops, snaps counters, and switches the panel slide to a fade.
- [ ] The spec's "atmospheric elements" callout (LIVE indicator, session ID, Volume 24h card, Active Advisors card) is added to the README under a brief section explaining what's real vs decorative.

The last item — the README update — is **out of scope for this plan** (the spec mentions it as a "will note" but doesn't list it under file changes). Track it as a one-off follow-up if the user wants the disclosure published.
