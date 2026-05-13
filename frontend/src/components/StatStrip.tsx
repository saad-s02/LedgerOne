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
