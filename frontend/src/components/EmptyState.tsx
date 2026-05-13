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
