import type { Decision } from '../../docs/decisions';

export function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <article
      id={`decision-${decision.id}`}
      className="overflow-hidden rounded-xl border border-line bg-bg-elev shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-line bg-bg-elev px-5 py-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan/40 bg-cyan/[0.12] font-mono text-xs font-semibold text-cyan">
          {decision.number}
        </span>
        <h3 className="text-base font-semibold text-text-bright">{decision.title}</h3>
      </header>
      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-text">{decision.body}</p>
        {decision.relatedOperationIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wider text-text-dim">Touches:</span>
            {decision.relatedOperationIds.map((opId) => (
              <a
                key={opId}
                href={`#op-${opId}`}
                className="rounded border border-line bg-bg-elev px-2 py-0.5 font-mono text-xs text-text hover:bg-bg-elev-2"
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
