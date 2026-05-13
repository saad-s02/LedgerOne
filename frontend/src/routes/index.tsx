import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, transactionsKey } from '../api/transactions';
import { listSearchSchema, DEFAULT_LIST_SEARCH, isAnyFilterActive } from '../lib/listSearch';
import { StatusPill } from '../components/StatusPill';
import { SkeletonRows } from '../components/SkeletonRows';
import { FilterBar } from '../components/FilterBar';
import { ChatDrawer } from '../components/chat/ChatDrawer';

export const Route = createFileRoute('/')({
  validateSearch: listSearchSchema.parse,
  component: ListPage,
});

function ListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between" data-testid="list-header">
        <h1 className="text-lg font-semibold">Transactions</h1>
        <ChatDrawer />
      </div>
      <FilterBar
        value={search}
        onChange={(next) =>
          navigate({
            search: (prev) => ({ ...prev, ...next, page: 1 }),
          })
        }
      />
      {isError ? (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
          <div className="mb-2 font-medium">Couldn't load transactions</div>
          <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Advisor</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <SkeletonRows count={8} columns={7} />
              ) : (
                data.data.map((t) => (
                  <tr
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    onClick={() =>
                      navigate({
                        to: '/transactions/$id',
                        params: { id: String(t.id) },
                        search,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        navigate({
                          to: '/transactions/$id',
                          params: { id: String(t.id) },
                          search,
                        });
                      }
                    }}
                  >
                    <td className="px-3 py-2">{t.transactionDate.slice(0, 10)}</td>
                    <td className="px-3 py-2">{t.accountId}</td>
                    <td className="px-3 py-2">{t.advisorName}</td>
                    <td className="px-3 py-2">{t.type}</td>
                    <td className="px-3 py-2">{t.securitySymbol ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat('en-CA', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(t.amount)}{' '}
                      {t.currency}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isPending && data.total === 0 && (
            <div className="mt-4 flex flex-col items-start gap-2 text-gray-600">
              {isAnyFilterActive(search) ? (
                <>
                  <div>No transactions match these filters</div>
                  <button
                    className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => navigate({ search: () => DEFAULT_LIST_SEARCH })}
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <div>No transactions</div>
              )}
            </div>
          )}
          {!isPending && data.total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <button
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
                disabled={data.page <= 1}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: data.page - 1 }) })}
              >
                Prev
              </button>
              <span className="text-gray-700">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
                disabled={data.page >= data.totalPages}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: data.page + 1 }) })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
