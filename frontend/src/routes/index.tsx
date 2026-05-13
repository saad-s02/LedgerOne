import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, transactionsKey } from '../api/transactions';
import { listSearchSchema } from '../lib/listSearch';
import { StatusPill } from '../components/StatusPill';

export const Route = createFileRoute('/')({
  validateSearch: listSearchSchema.parse,
  component: ListPage,
});

function ListPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: transactionsKey(search),
    queryFn: ({ signal }) => fetchTransactions(search, signal),
  });

  if (isPending) return <div className="text-gray-600">Loading…</div>;
  if (isError) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
        <div className="mb-2 font-medium">Couldn't load transactions</div>
        <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (data.total === 0) return <div className="text-gray-600">No transactions</div>;

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Advisor</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((t) => (
            <tr key={t.id} className="border-b border-gray-100">
              <td className="px-3 py-2">{t.transactionDate.slice(0, 10)}</td>
              <td className="px-3 py-2">{t.accountId}</td>
              <td className="px-3 py-2">{t.advisorName}</td>
              <td className="px-3 py-2">{t.type}</td>
              <td className="px-3 py-2">{t.securitySymbol ?? '—'}</td>
              <td className="px-3 py-2">
                {t.amount.toFixed(2)} {t.currency}
              </td>
              <td className="px-3 py-2">
                <StatusPill status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    </div>
  );
}
