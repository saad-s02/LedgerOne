interface Props {
  /** Seed value (e.g. transaction amount) used to derive a stable shape */
  seed: number;
  /** Color hint — 'positive' for green-ish, 'neutral' for cyan, 'warn' for amber */
  tone?: 'positive' | 'neutral' | 'warn' | 'negative';
}

const TONE_STROKE: Record<NonNullable<Props['tone']>, string> = {
  positive: '#22C55E',
  neutral: '#22D3EE',
  warn: '#FBBF24',
  negative: '#F43F5E',
};

/** Deterministic 7-point polyline derived from the seed so the same row redraws identically. */
function pointsFor(seed: number): string {
  const xs = [0, 6, 12, 18, 24, 30, 38];
  return xs
    .map((x, i) => {
      const wobble = Math.abs(Math.sin(seed * (i + 1) * 0.137)) * 10;
      const y = 12 - wobble;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Sparkline({ seed, tone = 'neutral' }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 38 14"
      className="inline-block h-3.5 w-[38px] opacity-60"
    >
      <polyline fill="none" stroke={TONE_STROKE[tone]} strokeWidth="1" points={pointsFor(seed)} />
    </svg>
  );
}
