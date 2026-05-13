import type { ToolCall } from '../../api/chat';

function summarizeArgs(tool: string, args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    if (v === null || v === undefined || v === '') continue;
    const printed = typeof v === 'string' ? `"${v}"` : String(v);
    parts.push(`${k}: ${printed}`);
  }
  if (parts.length === 0) return '';
  const label = tool === 'search_transactions' ? '🔍 ' : tool === 'get_transaction' ? '📄 ' : '🛠 ';
  return `${label}${tool} (${parts.join(', ')})`;
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const borderClass = toolCall.isError
    ? 'border-red-300 bg-red-50'
    : 'border-slate-200 bg-slate-50';

  return (
    <details
      data-testid="tool-call-card"
      data-tool={toolCall.tool}
      data-error={toolCall.isError ? 'true' : 'false'}
      className={`rounded border ${borderClass} p-2 text-sm`}
    >
      <summary className="cursor-pointer select-none font-medium">
        {summarizeArgs(toolCall.tool, toolCall.args) || `🛠 ${toolCall.tool}`}
      </summary>
      <div className="mt-2 space-y-2">
        <div>
          <div className="text-xs uppercase text-slate-500">Arguments</div>
          <pre className="overflow-x-auto font-mono text-xs">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-500">Result</div>
          <pre className="overflow-x-auto font-mono text-xs">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}
