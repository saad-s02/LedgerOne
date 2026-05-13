import type { HttpMethod } from '../../api/openapi';

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: 'bg-cyan/[0.12] text-cyan border-cyan/40',
  post: 'bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/40',
  put: 'bg-amber-400/[0.12] text-amber-400 border-amber-400/40',
  patch: 'bg-amber-400/[0.12] text-amber-400 border-amber-400/40',
  delete: 'bg-rose-500/[0.12] text-rose-400 border-rose-500/40',
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={
        'inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ' +
        METHOD_COLORS[method]
      }
    >
      {method}
    </span>
  );
}

export function StatusBadge({ code }: { code: string }) {
  const num = parseInt(code, 10);
  let color = 'bg-bg-elev-2 text-text-dim border-line';
  if (num >= 200 && num < 300) color = 'bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/40';
  else if (num >= 300 && num < 400) color = 'bg-cyan/[0.12] text-cyan border-cyan/40';
  else if (num >= 400 && num < 500) color = 'bg-amber-400/[0.12] text-amber-400 border-amber-400/40';
  else if (num >= 500) color = 'bg-rose-500/[0.12] text-rose-400 border-rose-500/40';
  return (
    <span className={'inline-flex h-6 items-center rounded border px-2 font-mono text-xs font-semibold ' + color}>
      {code}
    </span>
  );
}

interface ImplStatusBadgeProps {
  status: 'live' | 'preview' | 'testing-only';
}

export function ImplStatusBadge({ status }: ImplStatusBadgeProps) {
  if (status === 'live') {
    return (
      <span className="inline-flex h-6 items-center rounded border border-emerald-500/40 bg-emerald-500/[0.12] px-2 text-xs font-medium text-emerald-400">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Live
      </span>
    );
  }
  if (status === 'preview') {
    return (
      <span className="inline-flex h-6 items-center rounded border border-violet-500/40 bg-violet-500/[0.12] px-2 text-xs font-medium text-violet-400">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-400" />
        Design preview
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded border border-line bg-bg-elev px-2 text-xs font-medium text-text-dim">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-text-dim" />
      Testing env only
    </span>
  );
}
