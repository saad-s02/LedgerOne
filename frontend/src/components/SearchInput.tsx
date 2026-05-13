import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../lib/useDebouncedValue';

interface Props {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search account, advisor, or symbol…',
}: Props) {
  const [local, setLocal] = useState(value ?? '');
  const debounced = useDebouncedValue(local, 300);

  useEffect(() => {
    const trimmed = debounced.trim();
    const current = value ?? '';
    if (trimmed === current) return;
    onChange(trimmed.length > 0 ? trimmed : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim">
      <span>Search</span>
      <div className="flex items-center gap-2 rounded-[3px] border border-line-strong bg-bg-elev px-2.5 py-1.5">
        <span aria-hidden="true" className="text-text-dim">⌕</span>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[12px] font-normal normal-case tracking-normal text-text-bright placeholder:text-text-dim/60 focus:outline-none"
        />
      </div>
    </label>
  );
}
