import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: 'cyan' | 'amber';
}

export const Chip = forwardRef<HTMLButtonElement, Props>(function Chip(
  { active = false, tone = 'cyan', className, children, ...rest },
  ref,
) {
  const activeBg = tone === 'amber' ? 'bg-amber-400/[0.12]' : 'bg-cyan/[0.12]';
  const activeText = tone === 'amber' ? 'text-amber-400' : 'text-cyan';
  const activeBorder = tone === 'amber' ? 'border-amber-400' : 'border-cyan';

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      data-motion-state={active ? 'border' : 'static'}
      {...rest}
      className={[
        'rounded-[3px] border px-2.5 py-1 font-mono text-[11px]',
        'transition-all duration-[120ms]',
        active
          ? `${activeBg} ${activeText} ${activeBorder} relative`
          : 'border-cyan/20 bg-cyan/[0.04] text-text hover:text-text-bright hover:border-cyan/40',
        className ?? '',
      ].join(' ')}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-1px] rounded-[3px] bg-[linear-gradient(135deg,var(--color-cyan),transparent,var(--color-cyan))] bg-[length:300%_300%] animate-[border-rotate_3s_linear_infinite] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] [-webkit-mask-composite:xor] [padding:1px]"
        />
      )}
    </button>
  );
});
