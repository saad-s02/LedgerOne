import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Counter({ value, format = (n) => n.toLocaleString(), durationMs = 1100 }: Props) {
  const [display, setDisplay] = useState(0);
  const previousRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      previousRef.current = value;
      return;
    }
    const from = previousRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        previousRef.current = to;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reducedMotion]);

  return <span className="tabular-nums">{format(display)}</span>;
}
