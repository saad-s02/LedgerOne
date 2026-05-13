import type { OpenApiDocument, OpenApiSchema } from '../../api/openapi';
import { resolveRef } from '../../api/openapi';

interface Props {
  spec: OpenApiDocument;
  schema: OpenApiSchema | undefined;
}

export function SchemaTable({ spec, schema }: Props) {
  const resolved = resolveRef<OpenApiSchema>(spec, schema);
  if (!resolved) return <div className="text-sm text-gray-500">No schema.</div>;
  const props = resolved.properties;
  if (!props) {
    return <pre className="rounded bg-gray-50 p-3 text-xs text-gray-700">{describeSchema(spec, resolved)}</pre>;
  }
  const required = new Set(resolved.required ?? []);
  return (
    <div className="overflow-hidden rounded border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Field</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Required</th>
            <th className="px-3 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(props).map(([name, child]) => {
            const c = resolveRef<OpenApiSchema>(spec, child) ?? child;
            return (
              <tr key={name} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2 font-mono text-xs text-gray-900">{name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{describeSchema(spec, c)}</td>
                <td className="px-3 py-2 text-xs text-gray-700">{required.has(name) ? 'yes' : ''}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{c.description ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function describeSchema(spec: OpenApiDocument, schema: OpenApiSchema | undefined): string {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop() ?? schema.$ref;
    return refName;
  }
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (schema.type === 'array') {
    const inner = resolveRef<OpenApiSchema>(spec, schema.items);
    return `${describeSchema(spec, inner)}[]`;
  }
  if (schema.format) return `${schema.type} (${schema.format})`;
  return schema.type ?? 'object';
}
