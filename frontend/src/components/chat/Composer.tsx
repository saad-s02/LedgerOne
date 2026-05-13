import { useState, type KeyboardEvent } from 'react';

export function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed.slice(0, 2000));
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex items-end gap-2 border-t border-line bg-bg-elev p-3"
      data-testid="composer"
    >
      <textarea
        aria-label="Chat message"
        className="min-h-[60px] flex-1 resize-none rounded-[3px] border border-line-strong bg-bg px-2 py-1.5 font-mono text-[12px] text-text-bright placeholder:text-text-dim/60 focus:border-cyan/60 focus:outline-none"
        placeholder="Ask about transactions… (Cmd/Ctrl+Enter to send)"
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="rounded-[3px] border border-cyan/40 bg-cyan/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-cyan transition-colors duration-[120ms] hover:bg-cyan/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || value.trim().length === 0}
        onClick={submit}
      >
        Send
      </button>
    </div>
  );
}
