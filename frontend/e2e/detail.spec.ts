import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('row click navigates to detail page with all fields visible', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await expect(realRow).toBeVisible();
  await realRow.click();

  await expect(page).toHaveURL(/\/transactions\/\d+(\?.*)?$/);
  await expect(page.getByText('Account', { exact: true })).toBeVisible();
  await expect(page.getByText('Advisor', { exact: true })).toBeVisible();
  await expect(page.getByText('Notes')).toBeVisible();
  await expect(
    page
      .locator('[data-status]')
      .filter({ hasText: /^(SETTLED|PENDING|CANCELLED)$/ })
      .first(),
  ).toBeVisible();
});

test('Back to list link returns to the same filtered URL', async ({ page }) => {
  await page.goto('/?type=Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  const realRow = page.locator('tbody tr[role="button"]').first();
  await expect(realRow).toBeVisible();
  await realRow.click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.getByRole('link', { name: /Back to list/ }).click();

  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
});

test('detail page shows "Transaction not found" for missing id', async ({ page }) => {
  await page.goto('/transactions/999999');
  await expect(page.getByText('Transaction not found')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the list' })).toBeVisible();
});
