# Investment Transactions Dashboard

**PRD v1.0**
**Author:** Saad
**Date:** May 12, 2026
**Status:** Build spec for PriceMetrix interview take-home

-----

## 1. Overview

A web application for wealth management firms to view, filter, and analyze investment transaction records across all advisors and accounts. Includes a natural language agent that uses the dashboard's own REST APIs as tools, allowing users to query the data conversationally.

Built to demonstrate full-stack engineering on the PriceMetrix stack (React, .NET, SQL) and signal the AI-over-enterprise-data pattern that aligns with SignalOne and broader S&P Global direction.

## 2. Goals

- Deliver a working full-stack feature that meets every requirement in the take-home brief
- Demonstrate production-minded engineering: clean API design, indexed queries, error handling, URL-driven state, loading states
- Showcase the AI agent pattern as a tangible "where I can add value on day one" signal
- Make architectural choices that scale conceptually to PriceMetrix's actual data volumes (8T AUM, 30M accounts)

## 3. Non-Goals

- Authentication and user management
- Multi-tenant isolation (called out in tradeoffs section instead)
- Full test coverage (one or two meaningful tests, rest documented as future work)
- Production deployment, CI/CD, Docker
- Accessibility audit beyond basic semantic HTML
- Dark mode, animations, design polish beyond clean Tailwind

## 4. Users

**Primary:** A branch manager at a wealth management firm reviewing recent advisor activity. Wants to spot unusual transactions, follow up on pending settlements, and look up specific records.

**Secondary:** An advisor checking their own transaction history before a client meeting.

The agent is for both, lowering the barrier to exploring data without learning the filter UI.

## 5. Domain Model

### Transaction (single entity)

|Field          |Type           |Notes                                       |
|---------------|---------------|--------------------------------------------|
|Id             |int            |Primary key, identity                       |
|TransactionDate|datetime       |Indexed                                     |
|AccountId      |string         |Format: "ACCT-NNNNN"                        |
|AdvisorName    |string         |Denormalized for simplicity                 |
|Type           |enum           |Buy, Sell, Fee, Transfer, Dividend          |
|SecuritySymbol |string nullable|e.g. "AAPL", "RY.TO". Null for Fee, Transfer|
|Amount         |decimal(18,2)  |Positive, in account currency               |
|Currency       |enum           |CAD, USD                                    |
|Status         |enum           |Pending, Settled, Cancelled                 |
|Notes          |string nullable|Free text, shown only on detail view        |
|CreatedAt      |datetime       |Audit timestamp                             |

### Indexes

- `IX_Transactions_Status_Date` composite on (Status, TransactionDate DESC). Justified: most queries filter by status and sort by date.
- `IX_Transactions_AccountId` on AccountId. Justified: account lookups are a common query path.

## 6. Functional Requirements

### 6.1 List View (`/`)

**Filter bar (top of page)**

- Date range: From and To pickers (default: last 90 days)
- Type: single-select dropdown (All, Buy, Sell, Fee, Transfer, Dividend)
- Status: single-select dropdown (All, Pending, Settled, Cancelled)
- Search: text input, matches AccountId or SecuritySymbol (contains, case-insensitive), debounced 300ms

**Sort control**

- Dropdown: Date (newest), Date (oldest), Amount (high to low), Amount (low to high)
- Default: Date (newest)

**Table**

- Columns: Date | Account | Advisor | Type | Symbol | Amount | Status
- Each row clickable, navigates to detail view
- Status rendered as a colored pill (green Settled, yellow Pending, red Cancelled)
- Amount right-aligned with currency suffix

**Pagination**

- Bottom of table: Prev | Page X of Y | Next
- Page size selector: 25 (default), 50, 100
- Total count shown: "Showing 26-50 of 8,421"

**URL state**

- All filters, sort, page encoded in query params
- Reloading or sharing the URL preserves state
- Back button works after navigating to detail

**Loading state**

- Skeleton rows in the table (8 placeholder rows)
- Filter bar remains interactive

**Error state**

- Red banner at top of table: "Couldn't load transactions" with Retry button
- Filter bar remains interactive

**Empty state**

- "No transactions match these filters" with a Clear Filters button

### 6.2 Detail View (`/transactions/:id`)

- Two-column layout, all fields displayed with labels
- Notes section at bottom (or "No notes" placeholder)
- Back button preserves list filters via URL state
- Loading state: skeleton card
- Error state: red banner if fetch fails
- 404 state: "Transaction not found" with link back to list

### 6.3 AI Agent Layer

**Entry point**

- Chat panel as a collapsible right-side drawer on the list page
- "Try asking…" section with three example prompts to seed the conversation

**Conversation UI**

- User messages right-aligned
- Agent responses left-aligned
- Tool calls rendered inline as collapsible cards: "🔍 Searching transactions (Type: Buy, Status: Pending)" → expandable to show full tool call JSON
- Loading: "Thinking…" indicator while model processes
- Error: red message bubble with retry

**Example queries to support**

- "Show me all pending Buy transactions from Sarah Chen in the last 30 days"
- "What's the largest fee transaction this quarter and which advisor handled it?"
- "Find any cancelled transactions over 50,000 dollars"

## 7. API Specification

### Base path

`/api`

### GET /api/transactions

**Query parameters**

|Param   |Type    |Required|Default|Notes                                        |
|--------|--------|--------|-------|---------------------------------------------|
|fromDate|ISO date|no      |(none) |Inclusive lower bound on TransactionDate     |
|toDate  |ISO date|no      |(none) |Inclusive upper bound on TransactionDate     |
|type    |enum    |no      |(none) |One of Buy, Sell, Fee, Transfer, Dividend    |
|status  |enum    |no      |(none) |One of Pending, Settled, Cancelled           |
|search  |string  |no      |(none) |Contains match on AccountId OR SecuritySymbol|
|sortBy  |enum    |no      |date   |One of date, amount                          |
|sortDir |enum    |no      |desc   |One of asc, desc                             |
|page    |int     |no      |1      |1-indexed                                    |
|pageSize|int     |no      |25     |Max 100, validated server-side               |

**Response (200)**

```json
{
  "data": [
    {
      "id": 1234,
      "transactionDate": "2026-04-15T10:23:00Z",
      "accountId": "ACCT-04827",
      "advisorName": "Sarah Chen",
      "type": "Buy",
      "securitySymbol": "AAPL",
      "amount": 12500.00,
      "currency": "CAD",
      "status": "Settled"
    }
  ],
  "total": 8421,
  "page": 1,
  "pageSize": 25,
  "totalPages": 337
}
```

**Errors**

- 400 Bad Request: invalid query params, RFC 7807 Problem Details body
- 500 Internal Server Error: same format

### GET /api/transactions/{id}

**Response (200)**: full Transaction object including Notes
**Response (404)**: Problem Details body

### POST /api/chat

**Request body**

```json
{
  "message": "Show me pending Buy transactions from Sarah Chen this month",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**

```json
{
  "response": "Found 3 pending Buy transactions from Sarah Chen...",
  "toolCalls": [
    {
      "tool": "search_transactions",
      "args": { "type": "Buy", "status": "Pending", "search": "Sarah Chen", "fromDate": "2026-05-01" },
      "result": { "count": 3, "summary": "..." }
    }
  ]
}
```

## 8. AI Agent Specification

### Model

Azure OpenAI (gpt-4o-mini or gpt-4o) for cost-efficient tool use. Or Anthropic Claude Sonnet if more convenient. Either works, justify in README.

### Tools

**search_transactions**

- Mirrors the list endpoint's query parameters
- Returns up to 20 results with key fields, plus total count
- Used for filtered queries

**get_transaction**

- Takes an id, returns full transaction
- Used when user asks about a specific transaction

**aggregate_transactions** (stretch goal if time allows)

- Group by advisor, type, or status
- Returns sums and counts
- Used for "largest", "total", "how many" questions

### System prompt

Brief system prompt establishing:

- You are an assistant for a wealth management dashboard
- Use the tools to answer questions about transactions
- Summarize results clearly, format amounts with currency
- If a query is ambiguous, ask one clarifying question rather than guessing

### Tool-call loop

Standard ReAct pattern:

1. User message in
1. Call model with tools
1. If model returns tool calls, execute them, append results
1. Call model again with tool results
1. Repeat until model returns final assistant message
1. Cap at 5 iterations to prevent runaway loops

## 9. Data Seed Plan

- 8,000 transaction rows
- 50 unique advisors (use Bogus for realistic names)
- 500 unique accounts ("ACCT-00001" through "ACCT-00500")
- Date range: 24 months back from today
- Type distribution: 35% Buy, 25% Sell, 20% Dividend, 15% Fee, 5% Transfer
- Status distribution: 80% Settled, 15% Pending, 5% Cancelled
- Securities: rotate through 30 common symbols (AAPL, MSFT, TSLA, GOOGL, RY.TO, TD.TO, BNS.TO, SHOP.TO, etc.)
- Amounts: skewed log-normal distribution, range $50 to $250,000
- Currency: 70% CAD, 30% USD
- ~30% of records get a Notes value, rest null

Seed script runs on application startup if table is empty.

## 10. Non-Functional Requirements

**Performance**

- List endpoint returns in under 200ms with 8K rows (verified locally)
- Indexes on filter and sort columns
- Pagination always required, no unbounded queries

**Observability**

- Serilog structured logging with request correlation IDs
- Log every tool call from the agent with args and duration
- Log slow queries (>500ms)

**Error handling**

- All endpoints return Problem Details on errors (RFC 7807)
- Frontend handles 4xx, 5xx, and network errors distinctly
- Agent gracefully handles tool failures and reports them to the user

**Security (called out as future work)**

- No auth in this prototype
- In production: JWT bearer auth, row-level tenant isolation, rate limiting on chat endpoint, prompt injection guardrails

## 11. Tradeoffs

**SQLite vs SQL Server**

- Chose SQLite for portability (the panel can clone and run with zero setup)
- Production at PriceMetrix would use SQL Server in Azure
- EF Core abstracts the difference, schema migrates cleanly

**Offset pagination vs cursor**

- Chose offset for simplicity and standard UI patterns (Prev/Next/Page X)
- Cursor pagination would be better at scale (offset performance degrades as you go deeper)
- At 8K rows, offset is fine. At 30M, switch to cursor or keyset

**Denormalized AdvisorName**

- Stored as a string on Transaction rather than a separate Advisor table with FK
- Tradeoff: faster queries, no joins, but updates to advisor names require batch updates
- Production: would normalize into Advisors table, denormalize via materialized view for read-heavy workloads

**No multi-tenant model**

- Single tenant for this prototype
- Production: TenantId on every row, filtered globally via EF Core query filter, indexes prefixed with TenantId

**Composite index strategy**

- Indexed (Status, TransactionDate DESC) because most common access pattern is "recent pending" or "recent settled"
- Did not index every filter column to avoid write amplification
- Production: review query plans, add indexes based on observed workload, consider columnstore for analytical queries

**Agent: REST tools vs direct DB access**

- Agent tools call the same REST APIs the UI uses, not the database directly
- Tradeoff: extra serialization overhead, but consistent with how a production system would expose data (auth, audit, rate limiting all happen at the API layer)

## 12. Scale Considerations (for the README and presentation)

At PriceMetrix's actual scale (30M accounts, 8T AUM, 25 years of data):

- Partition Transactions table by date range (monthly or quarterly)
- Read replicas for analytical queries, primary for writes
- Materialized aggregate tables for benchmark calculations, refreshed on a schedule
- Columnstore indexes for slice-and-dice analytics
- Cache hot benchmark queries in Redis
- Use Azure SQL elastic pools or partitioned databases per large client
- For the agent: prompt caching, semantic search to scope tool inputs, observability dashboards on tool latency and cost, structured output validation, eval harness for query accuracy

## 13. Out of Scope

- Authentication and authorization
- Multi-tenant data isolation
- Realtime updates (websockets, SSE)
- Bulk export (CSV, Excel)
- Advanced analytics (charts, trends, benchmarks)
- Mobile responsive optimization beyond default Tailwind
- Internationalization

## 14. Open Questions (would ask product before building in real life)

- What's the cardinality of advisors and accounts? Drives normalization decisions.
- How fresh does the data need to be? Affects caching and read replica strategy.
- What's the expected concurrent user load? Drives pagination and rate limiting design.
- Are there compliance constraints on data retention or audit logging?
- What's the most common access pattern: drilling into specific accounts, or rolling up across advisors?

## 15. Future Improvements (priority order)

1. Authentication and tenant scoping (table-stakes for production)
1. Cursor pagination on the list endpoint for deep scrolling
1. Aggregate endpoints for advisor and account rollups
1. Realtime updates for Pending status transitions
1. Export to CSV
1. Agent observability dashboard (tool call latency, cost per query, accuracy eval harness)
1. Saved filter presets
1. Anomaly detection on the agent side (auto-surface unusual transactions, mirroring SignalOne pattern)

-----

## Build order tonight

1. .NET project scaffold, EF Core, SQLite, Transaction entity, migration
1. Seed script with Bogus
1. List endpoint with full query support
1. Detail endpoint
1. React scaffold with Vite, Tailwind, TanStack Query
1. List page with filters, sort, pagination, URL state
1. Detail page with back button
1. Loading and error states everywhere
1. Chat endpoint with one tool (search_transactions)
1. Chat UI on list page
1. README (do this tomorrow morning)
1. Slides (tomorrow morning)
