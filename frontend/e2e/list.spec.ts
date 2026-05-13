import { test, expect } from '@playwright/test';
import { seedFixture, clearFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => { await seedFixture(); });

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

  const newFirstRowAccount = await page.locator('tbody tr').first().locator('td').nth(1).textContent();
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
