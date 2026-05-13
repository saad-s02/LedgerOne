import type { ListSearch } from '../lib/listSearch';
import { ALLOWED_PAGE_SIZES } from '../lib/listSearch';
import type { TransactionType, TransactionStatus } from '../api/transactions';
import { Chip } from './Chip';
import { SearchInput } from './SearchInput';
import { DateRangePill } from './DateRangePill';
import { AmountRangeInput } from './AmountRangeInput';

interface Props {
  value: ListSearch;
  onChange: (next: Partial<ListSearch>) => void;
}

const TYPES: readonly TransactionType[] = ['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend'];
const STATUSES: readonly TransactionStatus[] = ['Pending', 'Settled', 'Cancelled'];

export function FilterBar({ value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg-elev/40 px-3 py-3">
      <fieldset role="group" aria-label="Type" className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Type</legend>
        <Chip
          active={value.type === undefined}
          onClick={() => onChange({ type: undefined })}
          data-testid="type-chip-All"
        >
          ALL
        </Chip>
        {TYPES.map((t) => (
          <Chip
            key={t}
            active={value.type === t}
            onClick={() => onChange({ type: value.type === t ? undefined : t })}
            data-testid={`type-chip-${t}`}
          >
            {t}
          </Chip>
        ))}
      </fieldset>

      <span aria-hidden="true" className="h-5 w-px bg-line" />

      <fieldset role="group" aria-label="Status" className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">Status</legend>
        <Chip
          active={value.status === undefined}
          onClick={() => onChange({ status: undefined })}
          data-testid="status-chip-All"
        >
          ALL
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s}
            tone={s === 'Pending' ? 'amber' : 'cyan'}
            active={value.status === s}
            onClick={() => onChange({ status: value.status === s ? undefined : s })}
            data-testid={`status-chip-${s}`}
          >
            {s}
          </Chip>
        ))}
      </fieldset>

      <span aria-hidden="true" className="h-5 w-px bg-line" />

      <DateRangePill
        fromDate={value.fromDate}
        toDate={value.toDate}
        onChange={(next) => onChange(next)}
      />

      <AmountRangeInput
        minAmount={value.minAmount}
        maxAmount={value.maxAmount}
        onChange={(next) => onChange(next)}
      />

      <div className="ml-auto flex items-center gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
          <span>Page size</span>
          <select
            value={value.pageSize}
            onChange={(e) => onChange({ pageSize: Number(e.target.value) })}
            className="rounded-[3px] border border-line-strong bg-bg-elev px-2 py-1 text-[12px] normal-case tracking-normal text-text-bright focus:outline-none"
          >
            {ALLOWED_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <SearchInput value={value.search} onChange={(next) => onChange({ search: next })} />
      </div>
    </div>
  );
}
