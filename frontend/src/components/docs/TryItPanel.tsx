import { useState } from 'react';
import type { HttpMethod, OpenApiDocument, OpenApiOperation, OpenApiParameter } from '../../api/openapi';
import { apiBaseUrl, resolveRef } from '../../api/openapi';
import { StatusBadge } from './MethodBadge';

interface Props {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
  spec: OpenApiDocument;
  disabled?: boolean;
  disabledReason?: string;
}

interface FetchResult {
  status: number;
  statusText: string;
  correlationId: string | null;
  body: string;
  elapsedMs: number;
  error?: string;
}

export function TryItPanel({ method, path, operation, spec, disabled, disabledReason }: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    defaultParamValues(operation.parameters ?? []),
  );
  const [requestBody, setRequestBody] = useState<string>(() => defaultRequestBody(spec, operation));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);

  const builtPath = buildPath(path, operation.parameters ?? [], paramValues);
  const builtQuery = buildQuery(operation.parameters ?? [], paramValues);
  const requestUrl = `${apiBaseUrl()}${builtPath}${builtQuery}`;
  const hasBody = method === 'post' || method === 'put' || method === 'patch';

  async function send() {
    if (disabled) return;
    setLoading(true);
    setResult(null);
    const started = performance.now();
    try {
      const res = await fetch(requestUrl, {
        method: method.toUpperCase(),
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
        body: hasBody ? requestBody : undefined,
      });
      const text = await res.text();
      const correlationId = res.headers.get('X-Correlation-Id');
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* leave as text */
      }
      setResult({
        status: res.status,
        statusText: res.statusText,
        correlationId,
        body,
        elapsedMs: Math.round(performance.now() - started),
      });
    } catch (err) {
      setResult({
        status: 0,
        statusText: 'Network error',
        correlationId: null,
        body: '',
        elapsedMs: Math.round(performance.now() - started),
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-bg-elev p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-text-dim">Try it</div>
        <div className="font-mono text-xs text-text-dim">{requestUrl}</div>
      </div>

      {operation.parameters && operation.parameters.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="text-xs font-medium text-text">Parameters</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {operation.parameters.map((p) => (
              <ParameterInput
                key={p.name}
                parameter={p}
                value={paramValues[p.name] ?? ''}
                onChange={(v) => setParamValues((prev) => ({ ...prev, [p.name]: v }))}
              />
            ))}
          </div>
        </div>
      )}

      {hasBody && (
        <div className="mb-3 space-y-1">
          <div className="text-xs font-medium text-text">Request body (JSON)</div>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className="h-32 w-full rounded border border-line bg-bg-elev px-3 py-2 font-mono text-xs"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={send}
          disabled={disabled || loading}
          className="rounded-md border border-cyan/40 bg-cyan/[0.12] px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-cyan shadow-sm hover:bg-cyan/[0.2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send request'}
        </button>
        {disabled && disabledReason && <span className="text-xs text-text-dim">{disabledReason}</span>}
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {result.error ? (
              <span className="rounded border border-rose-500/40 bg-rose-500/[0.05] px-2 py-1 text-xs font-medium text-rose-300">
                {result.error}
              </span>
            ) : (
              <>
                <StatusBadge code={String(result.status)} />
                <span className="text-text">{result.statusText}</span>
                <span className="text-text-dim">·</span>
                <span className="font-mono text-xs text-text-dim">{result.elapsedMs} ms</span>
                {result.correlationId && (
                  <>
                    <span className="text-text-dim">·</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.correlationId!)}
                      className="rounded border border-line bg-bg-elev px-2 py-0.5 font-mono text-xs text-text hover:bg-bg-elev-2"
                      title="Click to copy"
                    >
                      X-Correlation-Id: {result.correlationId}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {result.body && (
            <pre className="max-h-80 overflow-auto rounded border border-line bg-bg p-3 font-mono text-xs leading-relaxed text-emerald-300">
              {result.body}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ParameterInput({
  parameter,
  value,
  onChange,
}: {
  parameter: OpenApiParameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const enumValues = parameter.schema?.enum as string[] | undefined;
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-mono text-text">
        {parameter.name}
        {parameter.required && <span className="text-rose-400"> *</span>}
        <span className="ml-1 text-text-dim">({parameter.in})</span>
      </span>
      {enumValues ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-line bg-bg-elev px-2 py-1 font-mono text-xs"
        >
          <option value="">—</option>
          {enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={parameter.schema?.format ?? parameter.schema?.type ?? ''}
          className="rounded border border-line bg-bg-elev px-2 py-1 font-mono text-xs"
        />
      )}
    </label>
  );
}

function defaultParamValues(parameters: OpenApiParameter[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of parameters) {
    const def = p.schema?.default;
    if (def !== undefined && def !== null) out[p.name] = String(def);
    else if (p.in === 'path' && p.name === 'id') out[p.name] = '1';
  }
  return out;
}

function buildPath(template: string, parameters: OpenApiParameter[], values: Record<string, string>): string {
  let out = template;
  for (const p of parameters.filter((x) => x.in === 'path')) {
    const v = values[p.name] ?? '';
    out = out.replace(`{${p.name}}`, encodeURIComponent(v));
  }
  return out;
}

function buildQuery(parameters: OpenApiParameter[], values: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const p of parameters.filter((x) => x.in === 'query')) {
    const v = values[p.name];
    if (v !== undefined && v !== '') qs.set(p.name, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function defaultRequestBody(spec: OpenApiDocument, operation: OpenApiOperation): string {
  const schema = operation.requestBody?.content?.['application/json']?.schema;
  const resolved = resolveRef<import('../../api/openapi').OpenApiSchema>(spec, schema);
  if (!resolved) return '{}';
  return JSON.stringify(sampleFromSchema(spec, resolved), null, 2);
}

function sampleFromSchema(spec: OpenApiDocument, schema: import('../../api/openapi').OpenApiSchema): unknown {
  if (schema.$ref) {
    const resolved = resolveRef<import('../../api/openapi').OpenApiSchema>(spec, schema);
    return resolved ? sampleFromSchema(spec, resolved) : {};
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  if (schema.type === 'array') {
    const inner = schema.items ? sampleFromSchema(spec, schema.items) : null;
    return inner !== null && inner !== undefined ? [inner] : [];
  }
  if (schema.type === 'object' || schema.properties) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      out[key] = sampleFromSchema(spec, child);
    }
    return out;
  }
  switch (schema.type) {
    case 'string':
      return '';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}
