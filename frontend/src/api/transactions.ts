import { apiGet } from './client';

export interface TransactionDto {
  id: number;
  transactionDate: string;
  accountId: string;
  advisorName: string;
  type: 'Buy' | 'Sell' | 'Fee' | 'Transfer' | 'Dividend';
  securitySymbol: string | null;
  amount: number;
  currency: 'CAD' | 'USD';
  status: 'Pending' | 'Settled' | 'Cancelled';
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function transactionsKey(params: { page: number; pageSize: number }) {
  return ['transactions', params] as const;
}

export function fetchTransactions(
  params: { page: number; pageSize: number },
  signal?: AbortSignal,
): Promise<ListTransactionsResponse> {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  return apiGet<ListTransactionsResponse>(`/api/transactions?${qs}`, signal);
}
