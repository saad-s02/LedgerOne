import type { Decision } from '../../docs/decisions';

export function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <article
      id={`decision-${decision.id}`}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 font-mono text-xs font-semibold text-white">
          {decision.number}
        </span>
        <h3 className="text-base font-semibold text-gray-900">{decision.title}</h3>
      </header>
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-gray-700">{decision.body}</p>
        {decision.relatedOperationIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-gray-500">Touches:</span>
            {decision.relatedOperationIds.map((opId) => (
              <a
                key={opId}
                href={`#op-${opId}`}
                className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700 hover:bg-gray-100"
              >
                {opId}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
