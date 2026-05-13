import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchLogs,
  type ListLogsResponse,
  type LogEntryDto,
  type LogLevel,
} from '../api/logs';

export const Route = createFileRoute('/logs')({
  component: LogsPage,
});

type LevelFilter = 'all' | LogLevel;

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'Debug', label: 'DEBUG' },
  { value: 'Information', label: 'INFO' },
  { value: 'Warning', label: 'WARN' },
  { value: 'Error', label: 'ERROR' },
];

const LEVEL_STYLES: Record<LogLevel, { chip: string; row: string; abbrev: string }> = {
  Verbose: {
    chip: 'border-text-dim/40 bg-text-dim/[0.06] text-text-dim',
    row: 'text-text-dim',
    abbrev: 'VRB',
  },
  Debug: {
    chip: 'border-text-dim/40 bg-text-dim/[0.06] text-text-dim',
    row: 'text-text-dim',
    abbrev: 'DBG',
  },
  Information: {
    chip: 'border-cyan/40 bg-cyan/[0.06] text-cyan',
    row: 'text-text',
    abbrev: 'INF',
  },
  Warning: {
    chip: 'border-amber-400/45 bg-amber-400/[0.06] text-amber-400',
    row: 'text-amber-100',
    abbrev: 'WRN',
  },
  Error: {
    chip: 'border-rose-500/45 bg-rose-500/[0.06] text-rose-400',
    row: 'text-rose-200',
    abbrev: 'ERR',
  },
  Fatal: {
    chip: 'border-rose-500/60 bg-rose-500/[0.12] text-rose-300',
    row: 'text-rose-200',
    abbrev: 'FTL',
  },
};

const POLL_INTERVAL_MS = 1500;
const FETCH_LIMIT = 200;
const MAX_RETAINED = 1000;
const NEAR_BOTTOM_PX = 40;

function LogsPage() {
  const [level, setLevel] = useState<LevelFilter>('all');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [entries, setEntries] = useState<LogEntryDto[]>([]);
  const [lastId, setLastId] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [bufferStartId, setBufferStartId] = useState(0);
  const [capacity, setCapacity] = useState(500);

  // since-cursor lives in a ref so updating it does NOT change the query key.
  // If it were in the key, every successful poll would invalidate the query
  // and trigger an immediate refetch — a tight loop that hammers the server.
  const sinceRef = useRef(0);
  const mergedLastIdRef = useRef(-1);

  const handleSetLevel = useCallback((next: LevelFilter) => {
    setLevel(next);
    // Different filter means a different stream — drop accumulated entries.
    setEntries([]);
    setLastId(0);
    setExpanded(new Set());
    sinceRef.current = 0;
    mergedLastIdRef.current = -1;
  }, []);

  const query = useQuery<ListLogsResponse>({
    queryKey: ['logs', 'poll', level],
    queryFn: ({ signal }) =>
      fetchLogs(
        {
          since: sinceRef.current,
          level: level === 'all' ? undefined : level,
          limit: FETCH_LIMIT,
        },
        signal,
      ),
    refetchInterval: paused ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  // Mirror the latest React Query result into a rolling accumulating buffer.
  // React 19's set-state-in-effect rule prefers subscription callbacks, but
  // React Query surfaces new data through re-renders — an effect is the
  // correct shape for syncing query → local accumulator here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!query.data) return;
    if (query.data.lastId === mergedLastIdRef.current) return;
    mergedLastIdRef.current = query.data.lastId;
    sinceRef.current = query.data.lastId;
    setBufferStartId(query.data.bufferStartId);
    setCapacity(query.data.capacity);
    if (query.data.data.length === 0) return;
    setEntries((prev) => {
      const next = prev.concat(query.data!.data);
      return next.length > MAX_RETAINED ? next.slice(next.length - MAX_RETAINED) : next;
    });
    setLastId(query.data.lastId);
  }, [query.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newSinceScrolled, setNewSinceScrolled] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distance <= NEAR_BOTTOM_PX;
    setAtBottom(isAtBottom);
    if (isAtBottom) setNewSinceScrolled(0);
  }, []);

  // Auto-scroll to bottom when new entries arrive and user is near the bottom.
  // Otherwise, accumulate a "new entries" counter for the jump-to-bottom button.
  const prevCountRef = useRef(0);
  useEffect(() => {
    const added = entries.length - prevCountRef.current;
    prevCountRef.current = entries.length;
    if (added <= 0) return;
    if (atBottom) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else {
      setNewSinceScrolled((n) => n + added);
    }
  }, [entries.length, atBottom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      return (
        e.message.toLowerCase().includes(q) ||
        (e.correlationId?.toLowerCase().includes(q) ?? false) ||
        (e.sourceContext?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, search]);

  const onClear = () => {
    setEntries([]);
    setExpanded(new Set());
    setNewSinceScrolled(0);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setNewSinceScrolled(0);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isStale = lastId > 0 && bufferStartId > lastId + 1;
  const droppedHint = isStale
    ? `Server buffer rolled over — older entries dropped (capacity ${capacity}).`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan">
            Diagnostics · in-process sink
          </div>
          <h2 className="font-mono text-[18px] font-semibold uppercase tracking-[0.1em] text-text-bright">
            Logs
          </h2>
        </div>
        <LiveIndicator paused={paused} fetching={query.isFetching} />
      </div>

      <Toolbar
        level={level}
        onLevel={handleSetLevel}
        search={search}
        onSearch={setSearch}
        paused={paused}
        onTogglePaused={() => setPaused((p) => !p)}
        onClear={onClear}
        visibleCount={filtered.length}
        bufferedCount={entries.length}
        capacity={capacity}
      />

      {query.isError && (
        <div className="rounded border border-rose-500/40 bg-rose-500/[0.05] p-3 text-xs text-rose-200">
          Couldn&apos;t fetch /api/logs:{' '}
          {query.error instanceof Error ? query.error.message : String(query.error)}
        </div>
      )}

      {droppedHint && (
        <div className="rounded border border-amber-400/40 bg-amber-400/[0.05] p-2 font-mono text-[11px] text-amber-300">
          {droppedHint}
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-[calc(100vh-260px)] min-h-[400px] overflow-y-auto rounded-lg border border-line bg-bg-elev"
        >
          {filtered.length === 0 ? (
            <EmptyLogState
              hasEntries={entries.length > 0}
              level={level}
              isFetching={query.isFetching}
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {filtered.map((e) => (
                <LogRow
                  key={e.id}
                  entry={e}
                  expanded={expanded.has(e.id)}
                  onToggle={() => toggleExpand(e.id)}
                />
              ))}
            </ul>
          )}
        </div>
        {!atBottom && newSinceScrolled > 0 && (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan/50 bg-bg-elev-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan shadow-[0_0_18px_var(--color-cyan-glow)] hover:bg-cyan/[0.08]"
          >
            ↓ {newSinceScrolled} new
          </button>
        )}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
        In-memory ring buffer · last {capacity} entries · poll {POLL_INTERVAL_MS}ms · client retains
        up to {MAX_RETAINED}
      </p>
    </div>
  );
}

function LiveIndicator({ paused, fetching }: { paused: boolean; fetching: boolean }) {
  if (paused) {
    return (
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-text-dim">
        <span className="block h-1.5 w-1.5 rounded-full bg-text-dim" />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald-400">
      <span
        className={
          'block h-1.5 w-1.5 rounded-full bg-emerald-400 ' +
          (fetching
            ? 'shadow-[0_0_10px_rgba(34,197,94,0.8)]'
            : 'shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-[blink-dim_1.6s_ease-in-out_infinite]')
        }
      />
      Streaming
    </span>
  );
}

interface ToolbarProps {
  level: LevelFilter;
  onLevel: (l: LevelFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  paused: boolean;
  onTogglePaused: () => void;
  onClear: () => void;
  visibleCount: number;
  bufferedCount: number;
  capacity: number;
}

function Toolbar({
  level,
  onLevel,
  search,
  onSearch,
  paused,
  onTogglePaused,
  onClear,
  visibleCount,
  bufferedCount,
  capacity,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg-elev px-3 py-2">
      <div className="flex items-center gap-1">
        {LEVEL_OPTIONS.map((opt) => {
          const active = level === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onLevel(opt.value)}
              className={
                'rounded-[3px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ' +
                (active
                  ? 'border-cyan/40 bg-cyan/[0.12] text-cyan'
                  : 'border-transparent text-text-dim hover:border-line-strong hover:text-text-bright')
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-line" />

      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search message, correlation, source…"
        className="min-w-0 flex-1 rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px] text-text placeholder:text-text-dim focus:border-cyan/60 focus:outline-none"
      />

      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
        <span>
          <span className="text-text-bright">{visibleCount}</span>
          {visibleCount !== bufferedCount && (
            <span className="text-text-dim"> / {bufferedCount}</span>
          )}
          <span className="ml-1 text-text-dim/70">/ cap {capacity}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={onTogglePaused}
        className={
          'rounded-[3px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ' +
          (paused
            ? 'border-cyan/40 bg-cyan/[0.12] text-cyan hover:bg-cyan/[0.18]'
            : 'border-line-strong text-text-dim hover:border-cyan/40 hover:text-cyan')
        }
      >
        {paused ? 'Resume' : 'Pause'}
      </button>

      <button
        type="button"
        onClick={onClear}
        className="rounded-[3px] border border-line-strong px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim transition-colors hover:border-rose-500/40 hover:text-rose-300"
      >
        Clear
      </button>
    </div>
  );
}

function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: LogEntryDto;
  expanded: boolean;
  onToggle: () => void;
}) {
  const style = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.Information;
  const cid = entry.correlationId ? entry.correlationId.slice(0, 8) : null;
  const ts = formatTimestamp(entry.timestamp);
  const canExpand = Boolean(entry.exception) || Boolean(entry.sourceContext);

  return (
    <li>
      <button
        type="button"
        onClick={canExpand ? onToggle : undefined}
        className={
          'flex w-full items-baseline gap-3 px-3 py-1.5 text-left font-mono text-[11px] leading-snug ' +
          (canExpand ? 'cursor-pointer hover:bg-bg-elev-2' : 'cursor-default')
        }
      >
        <span className="shrink-0 tabular-nums text-text-dim">{ts}</span>
        <span
          className={
            'inline-block shrink-0 rounded-sm border px-1.5 py-0 text-[9px] font-semibold tracking-[0.06em] ' +
            style.chip
          }
        >
          {style.abbrev}
        </span>
        {cid && (
          <span
            className="shrink-0 text-text-dim/70"
            title={entry.correlationId ?? undefined}
          >
            {cid}
          </span>
        )}
        <span className={'min-w-0 flex-1 break-words ' + style.row}>{entry.message}</span>
        {canExpand && (
          <span className="shrink-0 text-text-dim">{expanded ? '−' : '+'}</span>
        )}
      </button>
      {expanded && canExpand && (
        <div className="space-y-2 border-t border-line/60 bg-bg px-3 py-2 font-mono text-[10px]">
          {entry.sourceContext && (
            <div className="text-text-dim">
              <span className="text-text-dim/70">source · </span>
              <span className="text-text">{entry.sourceContext}</span>
            </div>
          )}
          {entry.correlationId && (
            <div className="text-text-dim">
              <span className="text-text-dim/70">correlationId · </span>
              <span className="text-text">{entry.correlationId}</span>
            </div>
          )}
          {entry.exception && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded border border-rose-500/30 bg-rose-500/[0.04] p-2 text-[10px] leading-relaxed text-rose-200">
              {entry.exception}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyLogState({
  hasEntries,
  level,
  isFetching,
}: {
  hasEntries: boolean;
  level: LevelFilter;
  isFetching: boolean;
}) {
  if (hasEntries) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-text-dim">
        No entries match the current search.
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim/70">
        {isFetching ? 'Subscribing…' : 'No entries yet'}
      </div>
      <p className="max-w-md text-xs text-text-dim">
        {level === 'all'
          ? 'Trigger an API call (Dashboard or API Docs · Try It) to see log entries appear here.'
          : `Showing ${level} and above. Lower the filter to see more, or trigger an API call.`}
      </p>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  // Render local time as HH:MM:SS.mmm to match the existing terminal aesthetic.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
