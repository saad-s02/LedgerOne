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
