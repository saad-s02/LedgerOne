export interface FutureItem {
  rank: number;
  title: string;
  body: string;
}

export const FUTURE_IMPROVEMENTS: FutureItem[] = [
  {
    rank: 1,
    title: 'Authentication and tenant scoping',
    body: 'JWT bearer + per-tenant row filter is table-stakes for production. Until then, every endpoint is implicitly single-tenant.',
  },
  {
    rank: 2,
    title: 'Cursor pagination on the list endpoint',
    body: 'For deep scrolling. Today the URL carries page numbers; tomorrow it carries an opaque cursor that encodes (TransactionDate, Id).',
  },
  {
    rank: 3,
    title: 'Aggregate endpoints for advisor and account rollups',
    body: "GET /api/advisors/{id}/summary returning totals, counts, status breakdown. The chat agent's aggregate_transactions tool calls this once it exists.",
  },
  {
    rank: 4,
    title: 'Chat endpoint (sub-project 3)',
    body: 'ReAct loop over Anthropic Sonnet with search_transactions and get_transaction tools. Capped at 5 iterations to prevent runaway loops.',
  },
  {
    rank: 5,
    title: 'Real-time pending status updates',
    body: 'WebSocket or SSE channel pushing Pending → Settled transitions so the dashboard refreshes without polling.',
  },
  {
    rank: 6,
    title: 'Export to CSV',
    body: 'GET /api/transactions.csv with the same query parameters. Streamed response for large exports.',
  },
  {
    rank: 7,
    title: 'Agent observability dashboard',
    body: 'Per-query tool call latency, token cost, accuracy eval scores. Surfaces regressions before users see them.',
  },
  {
    rank: 8,
    title: 'Saved filter presets',
    body: 'POST /api/filter-presets so users can name and recall common views ("My pending Buys this month").',
  },
];
