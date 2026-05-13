import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../api/transactions';

const TOTAL_KEY = ['stat-strip', 'total'] as const;
const PENDING_KEY = ['stat-strip', 'pending'] as const;

export function useTotalTransactionsCount() {
  return useQuery({
    queryKey: TOTAL_KEY,
    queryFn: ({ signal }) =>
      fetchTransactions({ page: 1, pageSize: 1, sortBy: 'date', sortDir: 'desc' }, signal).then(
        (r) => r.total,
      ),
    staleTime: 60_000,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: PENDING_KEY,
    queryFn: ({ signal }) =>
      fetchTransactions(
        { page: 1, pageSize: 1, sortBy: 'date', sortDir: 'desc', status: 'Pending' },
        signal,
      ).then((r) => r.total),
    staleTime: 60_000,
  });
}

/**
 * Atmospheric values — disclosed in README. No SUM/DISTINCT endpoints exist
 * for these aggregates and we're not adding any. Same honest-disclosure
 * pattern as the LIVE indicator and session ID in the Header.
 */
export const ATMOSPHERIC_VOLUME_M = 47;
export const ATMOSPHERIC_ADVISORS = 38;
