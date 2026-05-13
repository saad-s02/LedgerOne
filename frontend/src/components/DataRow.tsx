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
        'cursor-pointer border-b border-line border-l-2 border-l-transparent',
        'transition-colors duration-150',
        'hover:border-l-cyan hover:bg-cyan/[0.04]',
        'focus:border-l-cyan focus:bg-cyan/[0.04] focus:outline-none',
      ].join(' ')}
    >
      {children}
    </tr>
  );
}
