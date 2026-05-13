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
