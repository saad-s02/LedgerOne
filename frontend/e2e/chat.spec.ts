import { test, expect } from '@playwright/test';
import { chatStub, happyResponse } from './helpers/chatStub';

test.describe('Chat drawer', () => {
  test('opens via the Chat button and shows seed prompts', async ({ page }) => {
    chatStub(page);
    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await expect(page.getByTestId('seed-prompts')).toBeVisible();
    await expect(page.getByText('Try asking…')).toBeVisible();
  });

  test('clicking a seed prompt sends a user message and renders the response with a tool card', async ({
    page,
  }) => {
    const stub = chatStub(page);
    stub.queue({ kind: 'ok', body: happyResponse('Found 3 pending buys.') });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByTestId('seed-prompts').getByRole('button').first().click();

    await expect(page.getByTestId('message-user').first()).toBeVisible();
    await expect(page.getByTestId('message-assistant').first()).toContainText(
      'Found 3 pending buys.',
    );
    await expect(page.getByTestId('tool-call-card')).toHaveCount(1);
  });

  test('tool card is collapsed by default and expands on click', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({ kind: 'ok', body: happyResponse('Result') });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByTestId('seed-prompts').getByRole('button').first().click();

    const card = page.getByTestId('tool-call-card');
    await expect(card).toBeVisible();
    await expect(card.getByText('Arguments')).not.toBeVisible();
    await card.locator('summary').click();
    await expect(card.getByText('Arguments')).toBeVisible();
    await expect(card.getByText('Result')).toBeVisible();
  });

  test('composer disabled while pending; "Thinking…" visible', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({ kind: 'ok', body: happyResponse('Result') }, { delayMs: 500 });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByLabel('Chat message').fill('Hi');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByTestId('thinking-indicator')).toBeVisible();
    await expect(page.getByLabel('Chat message')).toBeDisabled();
    await expect(page.getByTestId('message-assistant').first()).toBeVisible();
    await expect(page.getByLabel('Chat message')).not.toBeDisabled();
  });

  test('error response shows red bubble + Retry button', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({
      kind: 'error',
      status: 502,
      body: JSON.stringify({ title: 'Chat service is unavailable.', traceId: 'abc123' }),
    });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByLabel('Chat message').fill('Hi');
    await page.getByRole('button', { name: 'Send' }).click();

    const errBubble = page.locator('[data-testid="message-assistant"][data-error="true"]');
    await expect(errBubble).toBeVisible();
    await expect(page.getByTestId('chat-retry')).toBeVisible();
  });

  test('Retry resends the last user message', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({
      kind: 'error',
      status: 502,
      body: JSON.stringify({ title: 'Chat service is unavailable.' }),
    });
    stub.queue({ kind: 'ok', body: happyResponse('Now it worked.') });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByLabel('Chat message').fill('Hi');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByTestId('chat-retry')).toBeVisible();
    await page.getByTestId('chat-retry').click();

    await expect(page.getByTestId('message-assistant').last()).toContainText('Now it worked.');
  });

  test('isError tool result renders the card with a red border', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({
      kind: 'ok',
      body: {
        response: 'That id does not exist.',
        toolCalls: [
          {
            tool: 'get_transaction',
            args: { id: 999999 },
            result: { error: 'Transaction 999999 not found.' },
            isError: true,
          },
        ],
      },
    });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByLabel('Chat message').fill('show id 999999');
    await page.getByRole('button', { name: 'Send' }).click();

    const errCard = page.locator('[data-testid="tool-call-card"][data-error="true"]');
    await expect(errCard).toBeVisible();
  });

  test('Markdown in response renders to HTML elements', async ({ page }) => {
    const stub = chatStub(page);
    stub.queue({
      kind: 'ok',
      body: {
        response: 'Top transaction: **AAPL** for `12,500.00 CAD`.',
        toolCalls: [],
      },
    });

    await page.goto('/');
    await page.getByTestId('chat-toggle').click();
    await page.getByLabel('Chat message').fill('show top');
    await page.getByRole('button', { name: 'Send' }).click();

    const bubble = page.getByTestId('message-assistant').first();
    await expect(bubble.locator('strong')).toHaveText('AAPL');
    await expect(bubble.locator('code')).toHaveText('12,500.00 CAD');
  });
});
