import { useState } from 'react';
import type { HttpMethod, OpenApiDocument, OpenApiOperation } from '../../api/openapi';
import { OVERLAY } from '../../docs/overlay';
import { DECISIONS, findDecision } from '../../docs/decisions';
import { MethodBadge, StatusBadge, ImplStatusBadge } from './MethodBadge';
import { SchemaTable } from './SchemaTable';
import { TryItPanel } from './TryItPanel';

interface Props {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
  spec: OpenApiDocument;
}

export function EndpointCard({ method, path, operation, spec }: Props) {
  const [tryItOpen, setTryItOpen] = useState(false);
  const opId = operation.operationId ?? '';
  const note = OVERLAY.designNotes[opId];
  const status = OVERLAY.statusOverride[opId] ?? 'live';
  const tryDisabled = status === 'preview' || status === 'testing-only';
  const tryDisabledReason =
    status === 'preview'
      ? 'Endpoint is a design preview — returns 501. Send anyway to verify the validation and 501 contract.'
      : status === 'testing-only'
        ? 'Gated to the Testing environment — will return 404 against the Development server.'
        : undefined;

  const jsonResponses = Object.entries(operation.responses ?? {});
  const bodySchema = operation.requestBody?.content?.['application/json']?.schema;

  return (
    <article id={`op-${opId}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <MethodBadge method={method} />
          <code className="font-mono text-sm font-semibold text-gray-900">{path}</code>
          <div className="ml-auto">
            <ImplStatusBadge status={status} />
          </div>
        </div>
        {operation.summary && <p className="mt-2 text-sm text-gray-700">{operation.summary}</p>}
      </header>

      <div className="space-y-5 px-5 py-5">
        {operation.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{operation.description}</p>
        )}

        {note && (
          <DesignNoteCallout summary={note.summary} references={note.references} />
        )}

        {operation.parameters && operation.parameters.length > 0 && (
          <Section title="Parameters">
            <div className="overflow-hidden rounded border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">In</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Required</th>
                    <th className="px-3 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {operation.parameters.map((p) => (
                    <tr key={p.name} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2 font-mono text-xs text-gray-900">{p.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.in}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">
                        {p.schema?.enum ? p.schema.enum.join(' | ') : (p.schema?.format ?? p.schema?.type ?? 'string')}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{p.required ? 'yes' : ''}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{p.description ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {bodySchema && (
          <Section title="Request body">
            <SchemaTable spec={spec} schema={bodySchema} />
          </Section>
        )}

        {jsonResponses.length > 0 && (
          <Section title="Responses">
            <div className="space-y-3">
              {jsonResponses.map(([code, resp]) => {
                const respSchema = resp.content?.['application/json']?.schema;
                return (
                  <div key={code} className="rounded border border-gray-200">
                    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
                      <StatusBadge code={code} />
                      {resp.description && <span className="text-xs text-gray-700">{resp.description}</span>}
                    </div>
                    {respSchema ? (
                      <div className="p-3">
                        <SchemaTable spec={spec} schema={respSchema} />
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500">No body.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <div>
          <button
            onClick={() => setTryItOpen((o) => !o)}
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            {tryItOpen ? '▾ Hide Try It' : '▸ Try this endpoint'}
          </button>
        </div>
        {tryItOpen && (
          <TryItPanel
            method={method}
            path={path}
            operation={operation}
            spec={spec}
            disabled={false}
            disabledReason={tryDisabledReason}
          />
        )}
        {!tryItOpen && tryDisabled && tryDisabledReason && (
          <p className="-mt-3 text-xs text-gray-500">{tryDisabledReason}</p>
        )}
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h4>
      {children}
    </section>
  );
}

function DesignNoteCallout({
  summary,
  references,
}: {
  summary: string;
  references: import('../../docs/decisions').DecisionId[];
}) {
  return (
    <aside className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-900">Design notes</div>
      <p className="text-sm leading-relaxed text-amber-950">{summary}</p>
      {references.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {references.map((id) => {
            const d = findDecision(id);
            return (
              <a
                key={id}
                href={`#decision-${id}`}
                className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                title={d.title}
              >
                Decision #{d.number} · {d.shortLabel}
              </a>
            );
          })}
        </div>
      )}
      {references.length === 0 && DECISIONS.length === 0 && null}
    </aside>
  );
}
