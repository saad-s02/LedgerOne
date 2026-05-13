import type { TransactionStatus } from '../api/transactions';

const STYLES: Record<TransactionStatus, string> = {
  Settled: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export function StatusPill({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
