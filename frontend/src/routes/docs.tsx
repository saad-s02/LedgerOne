import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchOpenApiSpec, openApiKey, HTTP_METHODS } from '../api/openapi';
import type { HttpMethod, OpenApiDocument, OpenApiOperation } from '../api/openapi';
import { DocsSidebar, type SidebarSection } from '../components/docs/DocsSidebar';
import { EndpointCard } from '../components/docs/EndpointCard';
import { DecisionCard } from '../components/docs/DecisionCard';
import { DECISIONS } from '../docs/decisions';
import { SCALE_NOTES } from '../docs/scale';
import { OBSERVABILITY_POINTS } from '../docs/observability';
import { FUTURE_IMPROVEMENTS } from '../docs/future';

export const Route = createFileRoute('/docs')({
  component: DocsPage,
});

const SECTIONS: SidebarSection[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'data-model', label: 'Data model' },
  { id: 'design-decisions', label: 'Design decisions' },
  { id: 'scale', label: 'Scale considerations' },
  { id: 'observability', label: 'Observability' },
  { id: 'future', label: 'Future improvements' },
];

interface OperationEntry {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
  tag: string;
}

function DocsPage() {
  const { data: spec, isPending, isError, error } = useQuery({
    queryKey: openApiKey,
    queryFn: ({ signal }) => fetchOpenApiSpec(signal),
    staleTime: 60_000,
  });

  if (isPending) {
    return <div className="text-sm text-gray-600">Loading API spec…</div>;
  }
  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Couldn&apos;t load /openapi/v1.json: {error instanceof Error ? error.message : String(error)}
        <div className="mt-2 text-xs text-red-800">
          Is the backend running on{' '}
          <code className="font-mono">
            {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'}
          </code>
          ?
        </div>
      </div>
    );
  }

  const operations = flattenOperations(spec);
  const tags = spec.tags ?? [];
  const operationsByTag = groupByTag(operations, tags);

  return (
    <div className="flex gap-10">
      <DocsSidebar sections={SECTIONS} />
      <div className="min-w-0 flex-1 space-y-16 pb-24">
        <Overview spec={spec} operationCount={operations.length} />
        <Authentication />
        <Endpoints operationsByTag={operationsByTag} spec={spec} />
        <DataModel />
        <DesignDecisions />
        <ScaleConsiderations />
        <Observability />
        <FutureImprovements />
      </div>
    </div>
  );
}

function flattenOperations(spec: OpenApiDocument): OperationEntry[] {
  const out: OperationEntry[] = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, OpenApiOperation | undefined>)[method];
      if (!operation) continue;
      const tag = operation.tags?.[0] ?? 'Other';
      out.push({ method, path, operation, tag });
    }
  }
  return out;
}

function groupByTag(operations: OperationEntry[], tagOrder: { name: string }[]): Map<string, OperationEntry[]> {
  const groups = new Map<string, OperationEntry[]>();
  for (const op of operations) {
    const list = groups.get(op.tag) ?? [];
    list.push(op);
    groups.set(op.tag, list);
  }
  // Sort group order by spec tag order, then alphabetical for unknowns
  const ordered = new Map<string, OperationEntry[]>();
  for (const t of tagOrder) {
    if (groups.has(t.name)) ordered.set(t.name, groups.get(t.name)!);
  }
  for (const [tag, list] of groups) {
    if (!ordered.has(tag)) ordered.set(tag, list);
  }
  return ordered;
}

function SectionHeader({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header id={id} className="scroll-mt-6">
      {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{eyebrow}</div>}
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{description}</p>}
    </header>
  );
}

function Overview({ spec, operationCount }: { spec: OpenApiDocument; operationCount: number }) {
  const server = spec.servers?.[0];
  return (
    <section className="space-y-5">
      <SectionHeader
        id="overview"
        eyebrow="LedgerOne API · v1"
        title={spec.info.title}
        description={spec.info.description}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="OpenAPI" value={spec.openapi} />
        <Stat label="Endpoints" value={String(operationCount)} />
        <Stat label="Base URL" value={server?.url ?? '—'} mono />
        <Stat label="Environment" value={server?.description ?? '—'} />
      </div>
      {spec.info.contact?.email && (
        <p className="text-xs text-gray-500">
          Contact: {spec.info.contact.name}{' '}
          &lt;
          <a className="text-blue-700 hover:underline" href={`mailto:${spec.info.contact.email}`}>
            {spec.info.contact.email}
          </a>
          &gt;
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className={'mt-1 text-sm font-semibold text-gray-900 ' + (mono ? 'font-mono' : '')}>{value}</div>
    </div>
  );
}

function Authentication() {
  return (
    <section className="space-y-3">
      <SectionHeader id="authentication" title="Authentication" />
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm leading-relaxed text-gray-700">
          The prototype runs single-tenant and does not authenticate requests. The dashboard, the agent, and any direct
          API consumer all see the same data.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          For production: JWT bearer tokens at the gateway, tenant claim extracted at the controller boundary, and an EF
          Core global query filter that pins every query to <code className="font-mono text-xs">WHERE TenantId = @currentTenant</code>.
          The chat endpoint additionally needs rate limiting and prompt-injection guardrails. See{' '}
          <a className="text-blue-700 hover:underline" href="#decision-no-multi-tenant">
            Decision #4 — No multi-tenant model
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function Endpoints({
  operationsByTag,
  spec,
}: {
  operationsByTag: Map<string, OperationEntry[]>;
  spec: OpenApiDocument;
}) {
  return (
    <section className="space-y-8">
      <SectionHeader
        id="endpoints"
        title="Endpoints"
        description="Grouped by tag, in the order they appear in the OpenAPI spec. Each card carries the design notes and Decisions cross-refs that informed the contract."
      />
      {Array.from(operationsByTag.entries()).map(([tag, ops]) => (
        <div key={tag} className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{tag}</h3>
          <div className="space-y-5">
            {ops.map((op) => (
              <EndpointCard
                key={op.operation.operationId ?? `${op.method}-${op.path}`}
                method={op.method}
                path={op.path}
                operation={op.operation}
                spec={spec}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function DataModel() {
  const transactionFields: { field: string; type: string; notes: string }[] = [
    { field: 'Id', type: 'int', notes: 'Primary key, identity' },
    { field: 'TransactionDate', type: 'datetime', notes: 'Indexed via composite (Status, Date DESC)' },
    { field: 'AccountId', type: 'string', notes: 'ACCT-NNNNN; secondary index' },
    { field: 'AdvisorName', type: 'string', notes: 'Denormalized — see Decision #3' },
    { field: 'Type', type: 'enum', notes: 'Buy, Sell, Fee, Transfer, Dividend' },
    { field: 'SecuritySymbol', type: 'string?', notes: 'Null for Fee, Transfer' },
    { field: 'Amount', type: 'decimal(18,2)', notes: 'Always positive, in account currency' },
    { field: 'Currency', type: 'enum', notes: 'CAD, USD' },
    { field: 'Status', type: 'enum', notes: 'Pending, Settled, Cancelled' },
    { field: 'Notes', type: 'string?', notes: 'Detail view only' },
    { field: 'CreatedAt', type: 'datetime', notes: 'Audit timestamp' },
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        id="data-model"
        title="Data model"
        description="The entire dashboard is one entity, by design. A single denormalized table is faster to query, simpler to seed, and easier to reason about — we documented the tradeoff rather than hiding it behind joins."
      />
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Transaction</h4>
        <div className="overflow-hidden rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactionFields.map((f) => (
                <tr key={f.field} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs text-gray-900">{f.field}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{f.type}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{f.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold text-gray-900">Indexes</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>
              <code className="font-mono text-xs">IX_Transactions_Status_Date</code> — composite on{' '}
              <code className="font-mono text-xs">(Status, TransactionDate DESC)</code>. Serves &quot;recent pending&quot; and
              &quot;recent settled&quot; without a sort step.
            </li>
            <li>
              <code className="font-mono text-xs">IX_Transactions_AccountId</code> — single column. Supports account
              drill-downs from the agent and direct API consumers.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function DesignDecisions() {
  return (
    <section className="space-y-4">
      <SectionHeader
        id="design-decisions"
        title="Design decisions"
        description="The choices that shaped this API. Each one has a real production-grade alternative that costs more or buys more than this prototype needed."
      />
      <div className="space-y-4">
        {DECISIONS.map((d) => (
          <DecisionCard key={d.id} decision={d} />
        ))}
      </div>
    </section>
  );
}

function ScaleConsiderations() {
  return (
    <section className="space-y-4">
      <SectionHeader
        id="scale"
        title="Scale considerations"
        description="What changes when this design meets PriceMetrix's actual data volumes — 30M accounts, 25 years of history, 8T AUM. None of this is implemented; all of it is on the table for a production build."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SCALE_NOTES.map((n) => (
          <div key={n.topic} className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-gray-900">{n.topic}</h4>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{n.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Observability() {
  return (
    <section className="space-y-4">
      <SectionHeader
        id="observability"
        title="Observability &amp; errors"
        description="The non-functional spine: correlation, structured logging, RFC 7807. Visible end-to-end in the Try It panels above."
      />
      <div className="space-y-3">
        {OBSERVABILITY_POINTS.map((p) => (
          <div key={p.title} className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FutureImprovements() {
  return (
    <section className="space-y-4">
      <SectionHeader
        id="future"
        title="Future improvements"
        description="Roadmap, ranked. Most of these are scope rather than architectural changes — the contract was designed to absorb them."
      />
      <ol className="space-y-3">
        {FUTURE_IMPROVEMENTS.map((f) => (
          <li key={f.rank} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 font-mono text-xs font-semibold text-gray-700">
              {f.rank}
            </span>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{f.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{f.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
