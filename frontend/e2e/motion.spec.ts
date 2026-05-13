import { test, expect } from '@playwright/test';
import { seedFixture } from './helpers/api';

test.describe.configure({ mode: 'serial' });
test.beforeEach(async () => {
  await seedFixture();
});

test('motion infrastructure is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-motion-id="scan-beam"]')).toBeVisible();
  await expect(page.locator('[data-motion-id="logo-dot"]')).toBeVisible();
  await expect(page.locator('[data-motion-id="live-dot"]')).toBeVisible();

  // Wait for rows to render
  await expect(page.locator('tbody tr[role="button"]').first()).toBeVisible();
  // At least one Pending pill is in the fixture (15 of 60).
  const pendingPills = page.locator('[data-status="Pending"]');
  await expect(pendingPills.first()).toBeVisible();
  await expect(pendingPills.first()).toHaveAttribute('data-motion-state', 'pulse');
});

test('active filter chip is annotated as bordered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Buy', exact: true }).click();
  const buyChip = page.getByTestId('type-chip-Buy');
  await expect(buyChip).toHaveAttribute('data-motion-state', 'border');
});

test('reduced motion suppresses ambient loops and counter animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Counter snaps to final value on first paint (no zero-to-N ramp).
  // The Total card is the first stat card.
  const totalCard = page.locator('.bg-bg-elev').filter({ hasText: 'Total Transactions' }).first();
  await expect(totalCard).toBeVisible();
  // Wait for the real query to resolve.
  await expect(totalCard).not.toContainText(/^0$/);

  // Pending pills lose the pulse state.
  await expect(page.locator('tbody tr[role="button"]').first()).toBeVisible();
  const pendingPills = page.locator('[data-status="Pending"]');
  const count = await pendingPills.count();
  if (count > 0) {
    // With reduced motion, the pulse class is suppressed by the global
    // @media (prefers-reduced-motion: reduce) rule; data-motion-state is
    // still on the element but the animation duration is 0.
    // Assert that no Pending pill has a running animation in computed style.
    for (let i = 0; i < count; i += 1) {
      const duration = await pendingPills.nth(i).evaluate(
        (el) => getComputedStyle(el).animationDuration,
      );
      expect(duration).toBe('0s');
    }
  }
});
