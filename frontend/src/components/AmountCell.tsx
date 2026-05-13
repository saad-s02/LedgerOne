import { Sparkline } from './Sparkline';
import { formatAmount } from '../lib/format';
import type { CurrencyCode, TransactionStatus } from '../api/transactions';

interface Props {
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
}

function toneFor(status: TransactionStatus): 'positive' | 'neutral' | 'warn' | 'negative' {
  if (status === 'Pending') return 'warn';
  if (status === 'Cancelled') return 'negative';
  return 'neutral';
}

export function AmountCell({ amount, currency, status }: Props) {
  return (
    <div className="flex items-center justify-end gap-2 font-mono tabular-nums">
      <Sparkline seed={amount} tone={toneFor(status)} />
      <span className="text-text-bright">{formatAmount(amount, currency)}</span>
    </div>
  );
}
