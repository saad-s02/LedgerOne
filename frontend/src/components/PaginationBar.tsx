import { AnimatePresence, motion } from 'motion/react';
import { Button } from './Button';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (next: number) => void;
}

export function PaginationBar({ page, totalPages, pageSize, total, onPage }: Props) {
  const reduced = useReducedMotion();
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const motionProps = reduced
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 },
      }
    : {
        initial: { opacity: 0, x: 12 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -12 },
        transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
      };

  return (
    <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-dim">
      <span>
        Showing {startIdx.toLocaleString()}–{endIdx.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-3">
        <Button
          aria-label="Prev"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ‹ Prev
        </Button>
        <span className="text-text-bright">
          Page{' '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={page} {...motionProps} className="inline-block tabular-nums">
              {page}
            </motion.span>
          </AnimatePresence>{' '}
          of {totalPages}
        </span>
        <Button
          aria-label="Next"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </Button>
      </div>
    </div>
  );
}
