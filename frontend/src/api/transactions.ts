import { apiGet } from './client';

export type TransactionType = 'Buy' | 'Sell' | 'Fee' | 'Transfer' | 'Dividend';
export type TransactionStatus = 'Pending' | 'Settled' | 'Cancelled';
export type CurrencyCode = 'CAD' | 'USD';
export type SortField = 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

export interface TransactionDto {
  id: number;
  transactionDate: string;
  accountId: string;
  advisorName: string;
  type: TransactionType;
  securitySymbol: string | null;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
}

export interface TransactionDetailDto extends TransactionDto {
  notes: string | null;
  createdAt: string;
}

export interface ListTransactionsResponse {
  data: TransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListTransactionsParams {
  page: number;
  pageSize: number;
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy: SortField;
  sortDir: SortDirection;
}

export function transactionsKey(params: ListTransactionsParams) {
  return ['transactions', params] as const;
}

export function transactionDetailKey(id: number) {
  return ['transactions', 'detail', id] as const;
}

export function fetchTransactions(
  params: ListTransactionsParams,
  signal?: AbortSignal,
): Promise<ListTransactionsResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize));
  qs.set('sortBy', params.sortBy);
  qs.set('sortDir', params.sortDir);
  if (params.fromDate) qs.set('fromDate', params.fromDate);
  if (params.toDate) qs.set('toDate', params.toDate);
  if (params.type) qs.set('type', params.type);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.minAmount !== undefined) qs.set('minAmount', String(params.minAmount));
  if (params.maxAmount !== undefined) qs.set('maxAmount', String(params.maxAmount));
  return apiGet<ListTransactionsResponse>(`/api/transactions?${qs}`, signal);
}

export function fetchTransaction(id: number, signal?: AbortSignal): Promise<TransactionDetailDto> {
  return apiGet<TransactionDetailDto>(`/api/transactions/${id}`, signal);
}
