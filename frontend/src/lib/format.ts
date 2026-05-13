import type { CurrencyCode } from '../api/transactions';

const amountFormatter = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(amount: number, currency: CurrencyCode): string {
  return `${amountFormatter.format(amount)} ${currency}`;
}

export function formatAmountNumber(amount: number): string {
  return amountFormatter.format(amount);
}

export function formatTransactionDate(iso: string): string {
  // Format "2026-05-12T10:23:00Z" → "05.12 10:23"
  const d = new Date(iso);
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  const hour = d.getUTCHours().toString().padStart(2, '0');
  const minute = d.getUTCMinutes().toString().padStart(2, '0');
  return `${month}.${day} ${hour}:${minute}`;
}
