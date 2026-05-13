import { useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchTransaction, transactionDetailKey } from '../api/transactions';
import { ApiError } from '../api/client';
import type { ListSearch } from '../lib/listSearch';
import { DetailSheet } from '../components/DetailSheet';
import { DetailField } from '../components/DetailField';
import { StatusPill } from '../components/StatusPill';
import { TypeLabel } from '../components/TypeLabel';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { usePanelExclusion } from '../components/PanelExclusion';
import { formatAmount } from '../lib/format';

export const Route = createFileRoute('/_dashboard/transactions/$id')({
  component: DetailRoute,
});

function DetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const { active } = usePanelExclusion();

  const close = () => navigate({ to: '/', search: (prev) => prev as ListSearch });

  // Mutex: if chat takes over while detail is showing, navigate away so
  // detail unmounts. The ref guards against the initial-mount race when the
  // user opens detail while chat was already active — without it we'd
  // navigate back to / before DetailSheet's effect can claim 'detail'.
  const claimedActiveRef = useRef(false);
  useEffect(() => {
    if (active === 'detail') claimedActiveRef.current = true;
    if (claimedActiveRef.current && active === 'chat') {
      navigate({ to: '/', search: (prev) => prev as ListSearch });
    }
  }, [active, navigate]);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: transactionDetailKey(numericId),
    queryFn: ({ signal }) => fetchTransaction(numericId, signal),
    retry: false,
  });

  const is404 = isError && error instanceof ApiError && error.status === 404;

  return (
    <DetailSheet open onClose={close} title={`TXN-${id}`}>
      {isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              data-testid="detail-skeleton"
              className="h-4 w-3/4 rounded-sm bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-line-strong)_50%,var(--color-line)_100%)] bg-[length:200%_100%] animate-[shimmer-sweep_1.6s_linear_infinite]"
            />
          ))}
        </div>
      )}

      {is404 && (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
            Transaction not found
          </div>
          <Button onClick={close} aria-label="Return to the list">
            Return to the list
          </Button>
        </div>
      )}

      {isError && !is404 && (
        <ErrorBanner
          title="Couldn't load the transaction"
          action={
            <Button onClick={() => refetch()} aria-label="Retry">
              Retry
            </Button>
          }
        />
      )}

      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Date" index={0}>
              {data.transactionDate}
            </DetailField>
            <DetailField label="Account" index={1}>
              <span className="font-mono">{data.accountId}</span>
            </DetailField>
            <DetailField label="Advisor" index={2}>
              {data.advisorName}
            </DetailField>
            <DetailField label="Type" index={3}>
              <TypeLabel type={data.type} />
            </DetailField>
            <DetailField label="Symbol" index={4}>
              <span className="font-mono">{data.securitySymbol ?? '—'}</span>
            </DetailField>
            <DetailField label="Amount" index={5}>
              <span className="font-mono tabular-nums">
                {formatAmount(data.amount, data.currency)}
              </span>
            </DetailField>
            <DetailField label="Status" index={6}>
              <StatusPill status={data.status} />
            </DetailField>
            <DetailField label="Created at" index={7}>
              <span className="font-mono">{data.createdAt}</span>
            </DetailField>
          </div>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-bg p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
              Notes
            </span>
            <span className="text-[13px] text-text-bright">
              {data.notes ?? <span className="text-text-dim">No notes</span>}
            </span>
          </div>
        </div>
      )}
    </DetailSheet>
  );
}
