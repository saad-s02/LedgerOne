import type { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
}

export function ErrorBanner({ title, action }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-rose-500/40 bg-rose-500/[0.04] px-4 py-3">
      <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-rose-400">{title}</div>
      {action}
    </div>
  );
}
