import type { DecisionId } from './decisions';

export type ImplementationStatus = 'live' | 'preview' | 'testing-only';

export interface DesignNote {
  summary: string;
  references: DecisionId[];
}

export interface Overlay {
  /** Editorial sidebar shown on each endpoint card, keyed by operationId. */
  designNotes: Record<string, DesignNote>;
  /** Override the implementation status badge for an operationId. Defaults to "live". */
  statusOverride: Record<string, ImplementationStatus>;
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
        'Design preview. Contract is locked, validation pipeline is wired, but the ReAct loop and tool implementations ship in sub-project 3. Today every request returns 501.',
      references: ['rest-tools-vs-db', 'no-multi-tenant'],
    },
    Test_Seed: {
      summary:
        'Testing-only. Wipes the database and seeds the deterministic 60-row Playwright fixture. Returns 404 unless ASPNETCORE_ENVIRONMENT=Testing.',
      references: [],
    },
    Test_Clear: {
      summary: 'Testing-only. Wipes every transaction without seeding. Returns 404 outside the Testing environment.',
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
    Chat_Post: 'preview',
    Test_Seed: 'testing-only',
    Test_Clear: 'testing-only',
    Test_Boom: 'testing-only',
  },
};
