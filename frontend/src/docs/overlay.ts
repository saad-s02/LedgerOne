import type { DecisionId } from './decisions';

export type ImplementationStatus = 'live' | 'preview' | 'testing-only';

export interface DesignNote {
  summary: string;
  references: DecisionId[];
}

export interface TryItExample {
  /** Query / path parameter values, keyed by parameter name. */
  parameters?: Record<string, string>;
  /** Realistic request body. Stringified into the textarea. */
  requestBody?: unknown;
}

export interface Overlay {
  /** Editorial sidebar shown on each endpoint card, keyed by operationId. */
  designNotes: Record<string, DesignNote>;
  /** Override the implementation status badge for an operationId. Defaults to "live". */
  statusOverride: Record<string, ImplementationStatus>;
  /** Prefilled "Try it" inputs, keyed by operationId. Falls back to schema defaults. */
  tryItExamples: Record<string, TryItExample>;
}

export const OVERLAY: Overlay = {
  designNotes: {
    Transactions_List: {
      summary:
        'The hot path of the app. Backed by the composite index on (Status, TransactionDate DESC) and capped at pageSize=100. Search matches AccountId, SecuritySymbol, and AdvisorName via case-insensitive contains.',
      references: ['offset-vs-cursor', 'composite-index', 'denormalized-advisor'],
    },
    Transactions_Get: {
      summary:
        'Single-row lookup by primary key. Returns the full record including Notes and CreatedAt. 404 returns RFC 7807 problem details with the X-Correlation-Id echoed in the body as traceId.',
      references: ['composite-index'],
    },
    Chat_Post: {
      summary:
        'Claude Haiku 4.5 runs a ReAct loop (max 5 iterations, 60s deadline) over read-only search_transactions / get_transaction tools that share the REST handlers. Missing API key surfaces as 503, upstream failure as 502, deadline overrun as 504.',
      references: ['rest-tools-vs-db', 'no-multi-tenant'],
    },
    Test_Seed: {
      summary:
        'Testing-only. Wipes the database and seeds the deterministic 60-row Playwright fixture. Returns 404 unless ASPNETCORE_ENVIRONMENT=Testing.',
      references: [],
    },
    Test_Clear: {
      summary:
        'Testing-only. Wipes every transaction without seeding. Returns 404 outside the Testing environment.',
      references: [],
    },
    Test_Boom: {
      summary:
        'Testing-only. Deliberately throws so integration tests can assert the global exception handler emits RFC 7807 problem details with the request correlation id.',
      references: [],
    },
    Health_Get: {
      summary: 'Liveness probe. Stateless, no DB access, cheap to poll.',
      references: [],
    },
  },
  statusOverride: {
    Test_Seed: 'testing-only',
    Test_Clear: 'testing-only',
    Test_Boom: 'testing-only',
  },
  tryItExamples: {
    Transactions_List: {
      parameters: {
        page: '1',
        pageSize: '25',
        search: 'Sarah',
        status: 'Pending',
        type: 'Buy',
      },
    },
    Transactions_Get: {
      parameters: { id: '1' },
    },
    Chat_Post: {
      requestBody: {
        message: 'Show me all pending Buy transactions from Sarah Chen in the last 30 days.',
        conversationHistory: [],
      },
    },
  },
};
