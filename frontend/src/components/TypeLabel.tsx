import type { TransactionType } from '../api/transactions';

const COLOR: Record<TransactionType, string> = {
  Buy: 'text-emerald-400',
  Sell: 'text-rose-400',
  Dividend: 'text-cyan',
  Fee: 'text-amber-400',
  Transfer: 'text-text-dim',
};

const SHORT: Record<TransactionType, string> = {
  Buy: 'BUY',
  Sell: 'SELL',
  Dividend: 'DIV',
  Fee: 'FEE',
  Transfer: 'TRF',
};

export function TypeLabel({ type }: { type: TransactionType }) {
  return (
    <span className={`font-mono text-[10px] font-semibold tracking-[0.05em] ${COLOR[type]}`}>
      {SHORT[type]}
    </span>
  );
}
