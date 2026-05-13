import type { ListSearch } from '../lib/listSearch';
import type { TransactionType } from '../api/transactions';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];

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
    </div>
  );
}
