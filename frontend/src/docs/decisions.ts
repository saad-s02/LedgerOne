export type DecisionId =
  | 'sqlite-vs-sqlserver'
  | 'offset-vs-cursor'
  | 'denormalized-advisor'
  | 'no-multi-tenant'
  | 'composite-index'
  | 'rest-tools-vs-db';

export interface Decision {
  id: DecisionId;
  number: number;
  title: string;
  shortLabel: string;
  body: string;
  relatedOperationIds: string[];
}

export const DECISIONS: Decision[] = [
  {
    id: 'sqlite-vs-sqlserver',
    number: 1,
    title: 'SQLite vs SQL Server',
    shortLabel: 'SQLite locally',
    body:
      'Chose SQLite so the panel can clone the repo, run `make dev`, and have a working app with seed data in under a minute. ' +
      'EF Core abstracts the SQL dialect — the same migrations and queries would target Azure SQL in production. The schema is portable; the only real concession is no advanced indexing primitives (filtered indexes, columnstore) until we move provider.',
    relatedOperationIds: ['Transactions_List', 'Transactions_Get'],
  },
  {
    id: 'offset-vs-cursor',
    number: 2,
    title: 'Offset pagination vs cursor',
    shortLabel: 'Offset pagination',
    body:
      'Offset pagination wins on UI familiarity — Prev / Page X of Y / Next is the pattern users expect from a transaction blotter. ' +
      'It also lets the table show a total count, which informs the filter UX (`Showing 26-50 of 8,421`). Offset performance degrades when paging deep into millions of rows, so production scale would switch to keyset/cursor pagination on `(TransactionDate, Id)`. At the 8K-row demo size this is a non-issue.',
    relatedOperationIds: ['Transactions_List'],
  },
  {
    id: 'denormalized-advisor',
    number: 3,
    title: 'Denormalized AdvisorName',
    shortLabel: 'Advisor denormalization',
    body:
      '`AdvisorName` is stored as a string on `Transaction` rather than an FK to an `Advisors` table. ' +
      'Queries become a single table scan, no joins, which keeps the list endpoint fast and the seed script trivial. The cost: an advisor rename requires a batch UPDATE across every row they own. Production would normalize the entity and serve reads from a materialized projection so the read shape stays the same.',
    relatedOperationIds: ['Transactions_List', 'Transactions_Get'],
  },
  {
    id: 'no-multi-tenant',
    number: 4,
    title: 'No multi-tenant model',
    shortLabel: 'Single tenant',
    body:
      'Single-tenant in the prototype to keep the surface clean — adding `TenantId` to every row would dominate the schema without informing the design conversation. ' +
      'Production adds a `TenantId` column on every table, an EF Core global query filter that injects `WHERE TenantId = @current`, and prefixes every index with `TenantId`. Auth middleware would set the current tenant from the JWT before any handler runs.',
    relatedOperationIds: ['Transactions_List', 'Transactions_Get', 'Chat_Post'],
  },
  {
    id: 'composite-index',
    number: 5,
    title: 'Composite index strategy',
    shortLabel: 'Composite (Status, Date) index',
    body:
      "`(Status, TransactionDate DESC)` is indexed because the most common access pattern — `WHERE Status = 'Pending' ORDER BY TransactionDate DESC` — gets fully served from the index. " +
      'A separate single-column index on `(AccountId)` supports account drill-downs. Resisted indexing every filter column: write amplification is real, and most filters are selective enough on top of the composite key to be fine. Production would profile query plans and add indexes based on observed workload.',
    relatedOperationIds: ['Transactions_List', 'Transactions_Get'],
  },
  {
    id: 'rest-tools-vs-db',
    number: 6,
    title: 'Agent tools call REST endpoints, not the DB',
    shortLabel: 'Agent uses REST',
    body:
      'When the chat endpoint ships, its `search_transactions` and `get_transaction` tools will dispatch to the same handlers the controllers use — not the EF DbContext directly. ' +
      'Extra serialization cost is the tradeoff; the win is that auth, validation, audit logging, rate limiting, and tenant scoping all happen once at the API boundary instead of being duplicated for the agent. The agent sees exactly the data the dashboard sees, no more, no less.',
    relatedOperationIds: ['Chat_Post'],
  },
];

export function findDecision(id: DecisionId): Decision {
  const d = DECISIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown decision id: ${id}`);
  return d;
}
