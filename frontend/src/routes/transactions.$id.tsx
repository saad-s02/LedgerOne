import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransaction, transactionDetailKey } from '../api/transactions';
import { ApiError } from '../api/client';
import { listSearchSchema, DEFAULT_LIST_SEARCH } from '../lib/listSearch';
import { StatusPill } from '../components/StatusPill';

export const Route = createFileRoute('/transactions/$id')({
  validateSearch: listSearchSchema.parse,
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const numericId = Number(id);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: transactionDetailKey(numericId),
    queryFn: ({ signal }) => fetchTransaction(numericId, signal),
    retry: false,
  });

  const backLink = (
    <Link to="/" search={(prev) => prev} className="text-sm text-blue-700 hover:underline">
      ← Back to list
    </Link>
  );

  if (isPending) {
    return (
      <div>
        <div className="mb-4">{backLink}</div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <div className="mb-4">{backLink}</div>
        {is404 ? (
          <div className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-700">
            <div className="mb-2 font-medium">Transaction not found</div>
            <Link
              to="/"
              search={() => DEFAULT_LIST_SEARCH}
              className="text-blue-700 hover:underline"
            >
              Return to the list
            </Link>
          </div>
        ) : (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
            <div className="mb-2 font-medium">Couldn't load the transaction</div>
            <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  const t = data;
  return (
    <div>
      <div className="mb-4">{backLink}</div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t.accountId}</h2>
        <div className="text-sm text-gray-600">{t.advisorName}</div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-gray-500">Date</dt>
        <dd>{t.transactionDate}</dd>

        <dt className="text-gray-500">Account</dt>
        <dd>{t.accountId}</dd>

        <dt className="text-gray-500">Advisor</dt>
        <dd>{t.advisorName}</dd>

        <dt className="text-gray-500">Type</dt>
        <dd>{t.type}</dd>

        <dt className="text-gray-500">Symbol</dt>
        <dd>{t.securitySymbol ?? '—'}</dd>

        <dt className="text-gray-500">Amount</dt>
        <dd className="tabular-nums">
          {new Intl.NumberFormat('en-CA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(t.amount)}{' '}
          {t.currency}
        </dd>

        <dt className="text-gray-500">Status</dt>
        <dd>
          <StatusPill status={t.status} />
        </dd>

        <dt className="text-gray-500">Created at</dt>
        <dd>{t.createdAt}</dd>
      </dl>
      <div className="mt-6">
        <div className="mb-1 text-sm text-gray-500">Notes</div>
        <div className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-800">
          {t.notes ?? <span className="text-gray-400">No notes</span>}
        </div>
      </div>
    </div>
  );
}
