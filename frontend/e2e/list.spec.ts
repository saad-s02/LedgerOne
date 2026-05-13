import { test, expect } from '@playwright/test';
import { seedFixture, clearFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('list page loads and shows table with rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'LedgerOne' })).toBeVisible();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(7);
  await expect(table.locator('tbody tr')).toHaveCount(25);
});

test('Next button advances to page 2 and updates URL', async ({ page }) => {
  await page.goto('/');
  const firstRowAccount = await page.locator('tbody tr').first().locator('td').nth(1).textContent();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/[?&]page=2(&|$)/);

  const newFirstRowAccount = await page
    .locator('tbody tr')
    .first()
    .locator('td')
    .nth(1)
    .textContent();
  expect(newFirstRowAccount).not.toBe(firstRowAccount);
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
});

test('Prev button returns to page 1', async ({ page }) => {
  await page.goto('/?page=2');
  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page).toHaveURL(/^[^?]*\/?$|[?&]page=1(&|$)/);
  await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
});

test('Prev button is disabled on page 1', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();
});

test('Next button is disabled on last page', async ({ page }) => {
  // 60 fixture rows / 25 page size = 3 pages
  await page.goto('/?page=3');
  await expect(page.getByText('Page 3 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('shows skeleton rows before data arrives', async ({ page }) => {
  await page.route('http://localhost:5000/api/transactions*', async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  const navigation = page.goto('/');
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(8);
  await navigation;
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('shows error banner with Retry on 500, retry recovers', async ({ page }) => {
  // React StrictMode double-invokes effects in development, so we must always
  // return 500 until explicitly unrouted, then let the retry through.
  const errorHandler = async (route: import('@playwright/test').Route) => {
    await route.fulfill({
      status: 500,
      body: '{"title":"boom","status":500}',
      contentType: 'application/json',
    });
  };
  await page.route('http://localhost:5000/api/transactions*', errorHandler);

  await page.goto('/?page=1');
  await expect(page.getByText("Couldn't load transactions")).toBeVisible();

  // Remove the error route before clicking Retry so the real call succeeds
  await page.unroute('http://localhost:5000/api/transactions*', errorHandler);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('shows empty-state message when no transactions', async ({ page }) => {
  await clearFixture();
  await page.goto('/');
  await expect(page.getByText('No transactions')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('status pill renders with semantic color class', async ({ page }) => {
  await page.goto('/');
  const firstStatusCell = page.locator('tbody tr').first().locator('td').last();
  const pill = firstStatusCell.locator('span');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveClass(/bg-(green|yellow|red)-100/);
});

test('Type filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Type').selectOption('Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  await expect(page.locator('tbody tr')).toHaveCount(12);
});

test('Status filter updates URL and reduces rows to matching only', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Status').selectOption('Pending');
  await expect(page).toHaveURL(/[?&]status=Pending(&|$)/);
  await expect(page.locator('tbody tr')).toHaveCount(20);
});

test('Sort dropdown changes URL and reorders rows by amount desc', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Sort').selectOption('amount:desc');
  await expect(page).toHaveURL(/[?&]sortBy=amount(&|$)/);
  await expect(page).toHaveURL(/[?&]sortDir=desc(&|$)/);
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);

  const firstAmount = await page.locator('tbody tr').first().locator('td').nth(5).textContent();
  const secondAmount = await page.locator('tbody tr').nth(1).locator('td').nth(5).textContent();
  const parse = (s: string | null) => parseFloat((s ?? '').replace(/[^\d.]/g, ''));
  expect(parse(firstAmount)).toBeGreaterThanOrEqual(parse(secondAmount));
});

test('Page-size selector changes rows-per-page and resets page to 1', async ({ page }) => {
  await page.goto('/?page=2');
  await expect(page.getByText('Page 2 of 3')).toBeVisible();

  await page.getByLabel('Page size').selectOption('50');

  await expect(page).toHaveURL(/[?&]pageSize=50(&|$)/);
  await expect(page).toHaveURL(/[?&]page=1(&|$)/);
  await expect(page.locator('tbody tr[data-testid="skeleton-row"]')).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(50);
});
