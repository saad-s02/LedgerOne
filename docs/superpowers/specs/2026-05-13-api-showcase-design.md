# API Showcase — Design

**Date:** 2026-05-13
**Goal:** A first-class `/docs` page inside the React app that doubles as the take-home's "API design portfolio" — endpoints, schemas, design decisions, scale considerations, and an interactive Try It panel — built on top of an auto-generated OpenAPI spec.

## 1. Why this, not stock Swagger

Plain Swashbuckle/Scalar at `/swagger` is a known quantity to every interviewer. The PRD already documents six concrete design tradeoffs (§11), scale considerations (§12), observability promises (§10), and future improvements (§15). Surfacing them next to the endpoints they describe is what makes this a *showcase* rather than a reference. The architecture itself — "OpenAPI is the contract, an overlay file is the editorial layer" — is one of the signals.

## 2. Architecture

```
backend (.NET 10)
  └── Microsoft.AspNetCore.OpenApi  ──>  /openapi/v1.json   (the contract)
                                              │
                                              ▼
frontend (React)
  ├── src/docs/overlay.ts                (editorial layer — design notes, status overrides)
  └── src/routes/docs.tsx                merges spec + overlay, renders page
```

- **Backend** emits OpenAPI from real controllers + DTOs. Chat endpoint is already a 501 stub, so the spec is honest by construction — no fake entries injected.
- **Frontend overlay** adds per-operation editorial: `designNotes[opId]` (paragraph + cross-refs to design decisions), `implementationStatus[opId]` (`"preview"` for chat). Spec is never mutated.
- **/docs page** fetches the spec at runtime via TanStack Query, merges with overlay, renders sidebar-nav layout.

## 3. Backend changes

- `Program.cs`: `builder.Services.AddOpenApi("v1", opts => { … document transformer …})`, then `app.MapOpenApi()`. Allow `/openapi/*` through CORS (existing policy already covers it).
- `LedgerOne.Api.csproj`: `<GenerateDocumentationFile>true</GenerateDocumentationFile>`, suppress CS1591 for files without XML comments to avoid breaking `TreatWarningsAsErrors`.
- `IOpenApiDocumentTransformer` that sets `info.title`, `info.description` (one paragraph framing the API), `info.contact`, server URL, and tags (`Transactions`, `Chat`, `Health`, `Testing surface`).
- XML doc comments on `TransactionsController`, `ChatController`, `HealthController`, `TestController` action methods, plus DTOs (`TransactionDto`, `TransactionDetailDto`, `ListTransactionsRequest`, `ListTransactionsResponse`, `ChatRequest`, `ChatResponse`).
- `[ProducesResponseType]` on every action for known status codes (200, 400, 404, 501 as relevant).

## 4. Frontend changes

### Route
- `frontend/src/routes/docs.tsx` — file-based route at `/docs`. Uses TanStack Query to fetch `/openapi/v1.json`.

### Overlay
- `frontend/src/docs/overlay.ts` — typed config:
  ```ts
  export interface Overlay {
    designNotes: Record<string /* operationId */, DesignNote>;
    statusOverride: Record<string, "preview" | "testingOnly">;
  }
  export interface DesignNote {
    summary: string;        // 1-2 sentences shown inline on the card
    references: DecisionId[]; // cross-refs into Design Decisions section
  }
  ```
- `frontend/src/docs/decisions.ts` — the six PRD §11 tradeoffs as typed records: `{ id, title, body, references: OperationId[] }`.
- `frontend/src/docs/scale.ts`, `observability.ts`, `future.ts` — content for the remaining sections, kept separate so each is editable in isolation.

### Components (all in `src/components/docs/`)
- `DocsSidebar` — sticky nav, active section via IntersectionObserver.
- `EndpointCard` — signature line, params table from spec, request/response examples, inline design-note callouts with anchor links to Decisions, expandable Try It.
- `TryItPanel` — typed param form (inputs derived from OpenAPI parameter types), Send button, response panel showing status badge, `X-Correlation-Id` header callout, response body (pretty JSON), elapsed ms.
- `DecisionCard`, `ScaleSection`, `ObservabilitySection`, `FutureImprovementsList` — narrative content.
- `SchemaTable` — renders a `Transaction` / `ListTransactionsResponse` schema with field, type, required, description.

### Nav
- Update `__root.tsx` to render a header nav with `Dashboard | API Docs` links.

### Page IA (top to bottom)
1. Overview — paragraph + status pill grid (env, base URL, OpenAPI version).
2. Authentication — short "none in prototype; production: JWT + tenant filter."
3. Endpoints — grouped by tag; chat card flagged as Preview (501).
4. Data Model — Transaction entity, enums, declared indexes.
5. Design Decisions — six cards.
6. Scale Considerations — PRD §12.
7. Observability & Errors — correlation ID lifecycle, ProblemDetails contract.
8. Future Improvements — PRD §15.

## 5. Try It panel — what it proves

For every implemented endpoint, the Try It panel runs a real request against the dev backend and surfaces:
- HTTP status + status text.
- `X-Correlation-Id` from response headers (clickable to copy).
- Response body, pretty-printed.
- Round-trip time in ms.
- On error: full ProblemDetails body, with `traceId` highlighted matching `X-Correlation-Id`.

This is the live evidence that the observability story in §10 actually works end-to-end.

## 6. Testing

- Backend: snapshot test (Verify) on `/openapi/v1.json` content. Catches accidental spec drift.
- Frontend: Playwright test loading `/docs`, verifying sidebar nav renders, expanding the `GET /api/transactions` card, hitting Try It, asserting status 200 + correlation header present.

## 7. Out of scope

- Implementing the actual chat endpoint behavior (sub-project 3).
- Auth/RBAC on /docs (matches "no auth in prototype" stance).
- Client SDK codegen from the OpenAPI spec (mention as future improvement).
- Custom OpenAPI extensions (`x-` vendor fields) — keeping the spec clean for external consumers.
