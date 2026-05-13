import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { DEFAULT_LIST_SEARCH } from '../lib/listSearch';

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
              search={DEFAULT_LIST_SEARCH}
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
            <Link
              to="/logs"
              activeProps={{ className: `${NAV_BASE} ${NAV_ACTIVE}` }}
              inactiveProps={{ className: `${NAV_BASE} ${NAV_INACTIVE}` }}
            >
              Logs
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
