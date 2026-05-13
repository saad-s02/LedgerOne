import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

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
