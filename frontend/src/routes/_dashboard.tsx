import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, transactionsKey } from '../api/transactions';
import { listSearchSchema, DEFAULT_LIST_SEARCH, isAnyFilterActive } from '../lib/listSearch';
import { FilterBar } from '../components/FilterBar';
import { SkeletonRows } from '../components/SkeletonRows';
import { StatStrip } from '../components/StatStrip';
import { DataTable } from '../components/DataTable';
import { DataRow } from '../components/DataRow';
import { PaginationBar } from '../components/PaginationBar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { TypeLabel } from '../components/TypeLabel';
import { AmountCell } from '../components/AmountCell';
import { ChatDrawer } from '../components/chat/ChatDrawer';
import { formatTransactionDate } from '../lib/format';

export const Route = createFileRoute('/_dashboard')({
  validateSearch: listSearchSchema.parse,
  component: DashboardLayout,
});

function DashboardLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  const onFilterChange = (next: Partial<typeof search>) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, ...next, page: 1 }) });

  const onSortChange = (next: { sortBy: typeof search.sortBy; sortDir: typeof search.sortDir }) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, ...next }) });

  const onPageChange = (nextPage: number) =>
    navigate({ to: '/', search: (prev) => ({ ...prev, page: nextPage }) });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between" data-testid="list-header">
        <h2 className="font-mono text-[14px] font-semibold uppercase tracking-[0.12em] text-text-bright">
          Transactions
        </h2>
        <ChatDrawer />
      </div>

      <StatStrip />

      <div className="relative">
        <FilterBar value={search} onChange={onFilterChange} />
        {isFetching && !isPending && (
          <div
            data-motion-id="refetch-sliver"
            aria-hidden="true"
            className="absolute -bottom-px left-0 right-0 h-px overflow-hidden"
          >
            <div className="h-full w-1/3 bg-cyan animate-[scan-sweep_1.2s_linear_infinite]" />
          </div>
        )}
      </div>

      {isError ? (
        <ErrorBanner
          title="Couldn't load transactions"
          action={
            <Button onClick={() => refetch()} aria-label="Retry">
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={`transition-opacity duration-200 ${
              isFetching && !isPending ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <DataTable sortBy={search.sortBy} sortDir={search.sortDir} onSort={onSortChange}>
              {isPending ? (
                <SkeletonRows count={8} columns={7} />
              ) : (
                data.data.map((t) => (
                  <DataRow
                    key={t.id}
                    onActivate={() =>
                      navigate({
                        to: '/transactions/$id',
                        params: { id: String(t.id) },
                        search,
                      })
                    }
                  >
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">
                      {formatTransactionDate(t.transactionDate)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">{t.accountId}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-text">{t.advisorName}</td>
                    <td className="px-3.5 py-2.5">
                      <TypeLabel type={t.type} />
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-text">
                      {t.securitySymbol ?? '—'}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <AmountCell amount={t.amount} currency={t.currency} status={t.status} />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill status={t.status} />
                    </td>
                  </DataRow>
                ))
              )}
            </DataTable>
          </div>

          {!isPending && data.total === 0 && (
            <EmptyState
              message={
                isAnyFilterActive(search)
                  ? 'No transactions match these filters'
                  : 'No transactions'
              }
              action={
                isAnyFilterActive(search) ? (
                  <Button
                    onClick={() => navigate({ to: '/', search: () => DEFAULT_LIST_SEARCH })}
                    aria-label="Clear Filters"
                  >
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!isPending && data.total > 0 && (
            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              pageSize={data.pageSize}
              total={data.total}
              onPage={onPageChange}
            />
          )}
        </>
      )}

      <Outlet />
    </div>
  );
}
