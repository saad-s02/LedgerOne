import type { ReactNode } from 'react';
import type { SortField, SortDirection } from '../api/transactions';

interface Column {
  key: string;
  label: string;
  sortable?: SortField;
  align?: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { key: 'date', label: 'DATE', sortable: 'date' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'advisor', label: 'ADVISOR' },
  { key: 'type', label: 'TYPE' },
  { key: 'symbol', label: 'SYM' },
  { key: 'amount', label: 'AMOUNT', sortable: 'amount', align: 'right' },
  { key: 'status', label: 'STATUS' },
];

interface Props {
  sortBy: SortField;
  sortDir: SortDirection;
  onSort: (next: { sortBy: SortField; sortDir: SortDirection }) => void;
  children: ReactNode;
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) {
    return <span className="ml-1 text-text-dim opacity-40">↕</span>;
  }
  return (
    <span
      data-motion-id="sort-arrow"
      className={`ml-1 inline-block text-cyan transition-transform duration-200 ${
        dir === 'asc' ? 'rotate-180' : ''
      }`}
    >
      ▼
    </span>
  );
}

export function DataTable({ sortBy, sortDir, onSort, children }: Props) {
  const handleHeaderClick = (col: Column) => {
    if (!col.sortable) return;
    const nextDir: SortDirection =
      sortBy === col.sortable && sortDir === 'desc' ? 'asc' : 'desc';
    onSort({ sortBy: col.sortable, sortDir: nextDir });
  };

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-line">
      <thead className="bg-bg-elev">
        <tr>
          {COLUMNS.map((col) => {
            const active = col.sortable !== undefined && sortBy === col.sortable;
            const interactive = col.sortable !== undefined;
            return (
              <th
                key={col.key}
                scope="col"
                role="columnheader"
                aria-sort={
                  active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                }
                onClick={interactive ? () => handleHeaderClick(col) : undefined}
                className={[
                  'px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-dim',
                  interactive ? 'cursor-pointer select-none hover:text-cyan' : '',
                  col.align === 'right' ? 'text-right' : 'text-left',
                ].join(' ')}
              >
                {col.label}
                {col.sortable && <SortIndicator active={active} dir={sortDir} />}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
