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
