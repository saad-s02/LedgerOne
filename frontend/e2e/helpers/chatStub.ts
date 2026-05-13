import type { Page } from '@playwright/test';

export type StubResponse =
  | { kind: 'ok'; body: unknown }
  | { kind: 'error'; status: number; body: string };

export type StubOptions = {
  /** Delay in ms before responding. Useful to assert "Thinking..." appears. */
  delayMs?: number;
};

/**
 * Sets up `page.route` for the chat endpoint. Returns a controller that lets
 * tests script per-call responses. Successive calls dequeue from the script
 * queue; if the queue is exhausted, the last response repeats.
 */
export function chatStub(page: Page) {
  const responses: Array<{ response: StubResponse; options: StubOptions }> = [];
  let lastSetSignalDuringDelay: AbortSignal | null = null;

  void page.route('**/api/chat', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.fallback();
      return;
    }
    const next = responses.shift() ?? responses[responses.length - 1];
    if (!next) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: '(no stub configured)', toolCalls: [] }),
      });
      return;
    }
    if (next.options.delayMs && next.options.delayMs > 0) {
      // Don't block forever — capture abort so the test that aborts can verify cleanup
      const signal = request.timing();
      lastSetSignalDuringDelay = signal as unknown as AbortSignal;
      await new Promise((r) => setTimeout(r, next.options.delayMs));
    }
    if (next.response.kind === 'ok') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(next.response.body),
      });
    } else {
      await route.fulfill({
        status: next.response.status,
        contentType: 'application/problem+json',
        body: next.response.body,
      });
    }
  });

  return {
    queue(response: StubResponse, options: StubOptions = {}) {
      responses.push({ response, options });
    },
    clear() {
      responses.length = 0;
    },
    get lastAbortSignal() {
      return lastSetSignalDuringDelay;
    },
  };
}

export function happyResponse(text: string, toolName = 'search_transactions') {
  return {
    response: text,
    toolCalls: [
      {
        tool: toolName,
        args: { type: 'Buy', status: 'Pending' },
        result: { total: 3, page: 1, pageSize: 20, data: [] },
        isError: false,
      },
    ],
  };
}
