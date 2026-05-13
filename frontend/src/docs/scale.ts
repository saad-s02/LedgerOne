export interface ScaleNote {
  topic: string;
  body: string;
}

export const SCALE_NOTES: ScaleNote[] = [
  {
    topic: 'Partitioning',
    body: 'Transactions partition naturally by date range. At 25 years × 30M accounts, monthly or quarterly partitions on TransactionDate keep working sets small and let cold partitions move to cheaper storage tiers.',
  },
  {
    topic: 'Read replicas',
    body: 'Reporting and analytical queries go to read replicas; the primary handles transactional writes and the dashboard list endpoint. This is invisible from the API contract — the change is in the EF Core connection routing, not the controllers.',
  },
  {
    topic: 'Materialized aggregates',
    body: "Advisor and account rollups (totals, counts, recent activity) refresh on a schedule into precomputed tables. The agent's aggregate_transactions tool reads these directly instead of scanning the fact table.",
  },
  {
    topic: 'Columnstore for slice-and-dice',
    body: 'Once we move to SQL Server, columnstore indexes turn aggregate queries from minutes to seconds without affecting OLTP write paths.',
  },
  {
    topic: 'Hot benchmark cache',
    body: 'The same benchmark queries get asked over and over (top advisors this month, pending exposure). Redis with a 60-second TTL absorbs the read load.',
  },
  {
    topic: 'Elastic / partitioned databases per large client',
    body: "At PriceMetrix's tenant cardinality, the noisy-neighbor problem is real. Per-tenant or per-pool databases isolate workloads while keeping a single API surface in front.",
  },
  {
    topic: 'Agent observability',
    body: 'Once the chat endpoint ships, every tool call gets latency and cost telemetry, plus an eval harness that scores query accuracy against a labeled set. Cache prompts on Anthropic to cut input cost.',
  },
];
