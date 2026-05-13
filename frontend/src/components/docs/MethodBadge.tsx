import type { HttpMethod } from '../../api/openapi';

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: 'bg-blue-100 text-blue-800 border-blue-200',
  post: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  put: 'bg-amber-100 text-amber-800 border-amber-200',
  patch: 'bg-orange-100 text-orange-800 border-orange-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={
        'inline-flex h-6 items-center rounded border px-2 font-mono text-xs font-semibold uppercase tracking-wider ' +
        METHOD_COLORS[method]
      }
    >
      {method}
    </span>
  );
}

export function StatusBadge({ code }: { code: string }) {
  const num = parseInt(code, 10);
  let color = 'bg-gray-100 text-gray-800 border-gray-200';
  if (num >= 200 && num < 300) color = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  else if (num >= 300 && num < 400) color = 'bg-sky-100 text-sky-800 border-sky-200';
  else if (num >= 400 && num < 500) color = 'bg-amber-100 text-amber-800 border-amber-200';
  else if (num >= 500) color = 'bg-red-100 text-red-800 border-red-200';
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
      <span className="inline-flex h-6 items-center rounded border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-800">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  if (status === 'preview') {
    return (
      <span className="inline-flex h-6 items-center rounded border border-violet-200 bg-violet-50 px-2 text-xs font-medium text-violet-800">
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
        Design preview
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded border border-gray-200 bg-gray-50 px-2 text-xs font-medium text-gray-700">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-500" />
      Testing env only
    </span>
  );
}
