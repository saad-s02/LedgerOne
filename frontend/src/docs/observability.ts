export interface ObservabilityPoint {
  title: string;
  body: string;
}

export const OBSERVABILITY_POINTS: ObservabilityPoint[] = [
  {
    title: 'X-Correlation-Id on every response',
    body: 'CorrelationIdMiddleware accepts an inbound X-Correlation-Id header (if the caller provides one) or generates a new GUID. The id is echoed back on the response, pushed into the Serilog log scope under the CorrelationId property, and surfaced in error bodies as traceId. Try It below shows the id for every call.',
  },
  {
    title: 'RFC 7807 problem details on every error',
    body: 'AddProblemDetails() + a global exception handler ensure both validation failures and unexpected exceptions return application/problem+json with a stable shape: type, title, status, detail, traceId. Frontend distinguishes 4xx from 5xx from network failures using this contract.',
  },
  {
    title: 'Structured Serilog',
    body: 'Logs go to console with the correlation id rendered in the prefix: [HH:mm:ss INF] [<corr>] message. The same enrichment makes Application Insights / ELK shipping a config change away — no source code changes needed.',
  },
  {
    title: "Explicit indexes, no 'EnsureCreated'",
    body: 'The two declared indexes (IX_Transactions_Status_Date composite + IX_Transactions_AccountId) are real EF Core migrations, not auto-generated. dotnet ef migrations script shows exactly what runs in production.',
  },
  {
    title: 'Environment-gated test endpoints',
    body: '/api/test/* is gated in Program.cs: outside the Testing environment it short-circuits to 404 before the controller ever sees the request. Playwright sets ASPNETCORE_ENVIRONMENT=Testing automatically via the WebApplicationFactory.',
  },
];
