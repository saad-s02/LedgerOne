import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  label: string;
  children: ReactNode;
  index?: number;
}

export function DetailField({ label, children, index = 0 }: Props) {
  const reduced = useReducedMotion();
  const initial = reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const transition = reduced ? { duration: 0 } : { duration: 0.2, delay: 0.05 + index * 0.025 };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="flex flex-col gap-1"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
        {label}
      </span>
      <span className="text-[13px] text-text-bright">{children}</span>
    </motion.div>
  );
}
