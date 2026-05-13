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
    ? 'border-rose-500/40 bg-rose-500/[0.05]'
    : 'border-line bg-bg-elev';

  return (
    <details
      data-testid="tool-call-card"
      data-tool={toolCall.tool}
      data-error={toolCall.isError ? 'true' : 'false'}
      className={`rounded-[3px] border ${borderClass} p-2 font-mono text-[11px] text-text`}
    >
      <summary className="cursor-pointer select-none font-medium text-text-bright">
        {summarizeArgs(toolCall.tool, toolCall.args) || `🛠 ${toolCall.tool}`}
      </summary>
      <div className="mt-2 space-y-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Arguments</div>
          <pre className="overflow-x-auto text-[10px] text-text">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Result</div>
          <pre className="overflow-x-auto text-[10px] text-text">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}
