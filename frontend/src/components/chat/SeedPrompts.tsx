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
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
        Try asking…
      </div>
      <div className="space-y-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onSend(p)}
            className="w-full rounded-[3px] border border-line bg-bg px-3 py-2 text-left text-[12px] text-text transition-colors duration-[120ms] hover:border-cyan/40 hover:bg-cyan/[0.04] hover:text-text-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
