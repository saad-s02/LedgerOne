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
    <div className="flex items-end gap-2 border-t border-slate-200 bg-white p-3" data-testid="composer">
      <textarea
        aria-label="Chat message"
        className="min-h-[60px] flex-1 resize-none rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Ask about transactions… (Cmd/Ctrl+Enter to send)"
        value={value}
        maxLength={2000}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:bg-slate-300"
        disabled={disabled || value.trim().length === 0}
        onClick={submit}
      >
        Send
      </button>
    </div>
  );
}
