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
