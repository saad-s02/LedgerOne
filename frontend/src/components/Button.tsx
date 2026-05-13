import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'ghost' | 'primary';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  ghost:
    'border-line-strong bg-bg-elev text-text hover:border-cyan hover:text-cyan hover:shadow-[0_0_0_3px_var(--color-cyan-glow)]',
  primary: 'border-cyan bg-cyan/10 text-cyan hover:bg-cyan/15',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={[
        'inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5',
        'font-mono text-[11px] font-medium uppercase tracking-[0.08em]',
        'transition-all duration-[120ms]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line-strong disabled:hover:text-text disabled:hover:shadow-none',
        VARIANTS[variant],
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>
  );
});
