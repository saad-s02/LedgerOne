import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });

test('docs page renders all sections from the live OpenAPI spec', async ({ page }) => {
  await seedFixture();
  await page.goto('/docs');

  await expect(page.getByRole('heading', { name: 'LedgerOne API', exact: true })).toBeVisible();

  // Sidebar covers all sections
  const sidebar = page.getByRole('navigation');
  for (const label of [
    'Overview',
    'Authentication',
    'Endpoints',
    'Data model',
    'SQL schema',
    'Design decisions',
    'Scale considerations',
    'Observability',
    'Future improvements',
  ]) {
    await expect(sidebar.getByRole('link', { name: label })).toBeVisible();
  }

  // Endpoints from the spec render with their paths
  await expect(page.getByText('/api/transactions', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('/api/transactions/{id}', { exact: true })).toBeVisible();
  await expect(page.getByText('/api/chat', { exact: true })).toBeVisible();

  // SQL schema section renders real DDL
  await expect(page.getByText('CREATE TABLE "Transactions"').first()).toBeVisible();
  await expect(page.getByText('IX_Transactions_Status_TransactionDate').first()).toBeVisible();

  // All 6 design decisions render
  for (let i = 1; i <= 6; i++) {
    await expect(
      page.getByRole('heading', { level: 3 }).filter({ hasText: getDecisionTitle(i) }),
    ).toBeVisible();
  }
});

test('Try It panel hits the live backend and surfaces X-Correlation-Id', async ({ page }) => {
  await seedFixture();
  await page.goto('/docs');

  // Open Try It on the first endpoint card (Transactions_List)
  const tryItButtons = page.getByRole('button', { name: /Try this endpoint/ });
  await tryItButtons.first().click();

  const sendButton = page.getByRole('button', { name: 'Send request' });
  await expect(sendButton.first()).toBeVisible();
  await sendButton.first().click();

  // Status badge should show 200
  await expect(page.locator('text=200').first()).toBeVisible({ timeout: 10_000 });

  // X-Correlation-Id callout is rendered
  await expect(page.getByText(/X-Correlation-Id:/i).first()).toBeVisible();
});

function getDecisionTitle(num: number): string {
  return [
    'SQLite vs SQL Server',
    'Offset pagination vs cursor',
    'Denormalized AdvisorName',
    'No multi-tenant model',
    'Composite index strategy',
    'Agent tools call REST endpoints, not the DB',
  ][num - 1];
}
