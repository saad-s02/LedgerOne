import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('row click opens detail sheet with all fields visible', async ({ page }) => {
  await page.goto('/');
  const realRow = page.locator('tbody tr[role="button"]').first();
  await expect(realRow).toBeVisible();
  await realRow.click();

  await expect(page).toHaveURL(/\/transactions\/\d+(\?.*)?$/);
  const sheet = page.getByTestId('detail-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Account', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Advisor', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Notes')).toBeVisible();
  await expect(sheet.locator('[data-status]').first()).toBeVisible();
});

test('Esc closes the detail sheet and URL returns to filtered list', async ({ page }) => {
  await page.goto('/?type=Buy');
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.keyboard.press('Escape');

  await expect(page).not.toHaveURL(/\/transactions\//);
  await expect(page).toHaveURL(/[?&]type=Buy(&|$)/);
});

test('Close button closes the detail sheet', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page).toHaveURL(/\/transactions\/\d+/);

  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('list stays mounted underneath the detail sheet', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('tbody tr[role="button"]')).toHaveCount(25);
});

test('opening detail closes the chat drawer (mutex)', async ({ page }) => {
  await page.goto('/');
  // Open chat
  await page.getByTestId('chat-toggle').click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  // Click a row → chat should close, detail should open
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  await expect(page.getByTestId('chat-panel')).not.toBeVisible();
});

test('opening chat closes the detail sheet (mutex)', async ({ page }) => {
  await page.goto('/');
  await page.locator('tbody tr[role="button"]').first().click();
  await expect(page.getByTestId('detail-sheet')).toBeVisible();
  // Open chat → detail should close
  await page.getByTestId('chat-toggle').click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  await expect(page.getByTestId('detail-sheet')).not.toBeVisible();
  // URL returns to /
  await expect(page).not.toHaveURL(/\/transactions\//);
});

test('detail sheet shows "Transaction not found" for missing id', async ({ page }) => {
  await page.goto('/transactions/999999');
  const sheet = page.getByTestId('detail-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/Transaction not found/i)).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Return to the list' })).toBeVisible();
});
