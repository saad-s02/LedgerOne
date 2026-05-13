import { z } from 'zod';

export const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;

export const listSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => (ALLOWED_PAGE_SIZES as readonly number[]).includes(n), {
      message: 'pageSize must be 25, 50, or 100',
    })
    .default(25),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  type: z.enum(['Buy', 'Sell', 'Fee', 'Transfer', 'Dividend']).optional(),
  status: z.enum(['Pending', 'Settled', 'Cancelled']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'amount']).default('date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const DEFAULT_LIST_SEARCH: ListSearch = {
  page: 1,
  pageSize: 25,
  sortBy: 'date',
  sortDir: 'desc',
};

export function isAnyFilterActive(search: ListSearch): boolean {
  return Boolean(
    search.fromDate ||
    search.toDate ||
    search.type ||
    search.status ||
    (search.search && search.search.trim().length > 0),
  );
}
