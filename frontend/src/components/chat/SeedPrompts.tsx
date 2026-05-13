const PROMPTS = [
  'Show me all pending Buy transactions from Sarah Chen in the last 30 days',
  "What's the largest fee transaction this quarter and which advisor handled it?",
  'Find any cancelled transactions over 50,000 dollars',
];

export function SeedPrompts({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 p-4" data-testid="seed-prompts">
      <div className="text-sm font-medium text-slate-700">Try asking…</div>
      <div className="space-y-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p)}
            className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
