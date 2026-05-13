import type { ReactNode, KeyboardEvent } from 'react';

interface Props {
  onActivate: () => void;
  children: ReactNode;
}

export function DataRow({ onActivate, children }: Props) {
  const handleKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKey}
      className={[
        'group cursor-pointer border-b border-line',
        'transition-colors duration-150',
        'hover:bg-cyan/[0.04]',
        'focus:bg-cyan/[0.04] focus:outline-none',
        'relative',
      ].join(' ')}
    >
      <td
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      />
      {children}
    </tr>
  );
}
