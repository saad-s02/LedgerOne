import type { ListSearch } from '../lib/listSearch';
import type { TransactionType, TransactionStatus } from '../api/transactions';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];
const STATUSES: readonly TransactionStatus[] = ['Pending', 'Settled', 'Cancelled'];

export function FilterBar({ value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-3">
      <label className="flex flex-col text-xs text-gray-600">
        <span>Type</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.type ?? ''}
          onChange={(e) =>
            onChange({ type: (e.target.value || undefined) as TransactionType | undefined })
          }
        >
          <option value="">All</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-gray-600">
        <span>Status</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.status ?? ''}
          onChange={(e) =>
            onChange({ status: (e.target.value || undefined) as TransactionStatus | undefined })
          }
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-gray-600">
        <span>From</span>
        <input
          type="date"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.fromDate ?? ''}
          onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col text-xs text-gray-600">
        <span>To</span>
        <input
          type="date"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={value.toDate ?? ''}
          onChange={(e) => onChange({ toDate: e.target.value || undefined })}
        />
      </label>
      <label className="flex flex-col text-xs text-gray-600">
        <span>Sort</span>
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={`${value.sortBy}:${value.sortDir}`}
          onChange={(e) => {
            const [sortBy, sortDir] = e.target.value.split(':') as [
              'date' | 'amount',
              'asc' | 'desc',
            ];
            onChange({ sortBy, sortDir });
          }}
        >
          <option value="date:desc">Date (newest)</option>
          <option value="date:asc">Date (oldest)</option>
          <option value="amount:desc">Amount (high to low)</option>
          <option value="amount:asc">Amount (low to high)</option>
        </select>
      </label>
    </div>
  );
}
