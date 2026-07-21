import { test, expect } from '@playwright/test';

/**
 * Real-UI proof for the Gatekeeper ReviewGatePanel (Phase B Feature 1).
 *
 * Unlike phase-b-ux-features.spec.ts (which simulates the markup on
 * about:blank), this opens the real /dashboard/hermes page, stubs the chat
 * API with an SSE stream whose execution decision is REVIEW, and asserts the
 * real <ReviewGatePanel> renders and resolves through its operator buttons.
 */

const SSE_REVIEW_RESPONSE = [
  'data: {"type":"content","content":"About to execute a HIGH-risk action affecting 50 users..."}',
  '',
  'data: {"type":"execution","decision":"REVIEW","steps":2,"completed":false}',
  '',
  '',
].join('\n');

test.describe('ReviewGatePanel (real UI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/dashboard/hermes/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: SSE_REVIEW_RESPONSE,
      });
    });
    await page.goto('/dashboard/hermes');
  });

  async function triggerReviewGate(page: import('@playwright/test').Page) {
    const input = page.locator('textarea[placeholder*="ถามเอเจนต์"]');
    await expect(input).toBeVisible();
    // Retry until hydration has attached handlers and the panel appears.
    await expect(async () => {
      await input.fill('delete 50 user accounts');
      await input.press('Enter');
      await expect(page.locator('.border-amber-400\\/30').first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20_000 });
  }

  test('renders pending review gate for REVIEW decision', async ({ page }) => {
    await triggerReviewGate(page);

    await expect(page.locator('text=⏳ Pending Review')).toBeVisible();
    await expect(page.locator('text=HIGH Risk')).toBeVisible();
    await expect(page.locator('button:has-text("✅ Confirm")')).toBeVisible();
    await expect(page.locator('button:has-text("❌ Block")')).toBeVisible();
    await expect(page.locator('button:has-text("🤔 Delegate")')).toBeVisible();
  });

  test('confirm resolves the gate and records an audit line', async ({ page }) => {
    await triggerReviewGate(page);

    await page.locator('button:has-text("✅ Confirm")').click();
    await expect(page.locator('text=✅ Approved')).toBeVisible();
    await expect(page.locator('text=Operator confirmed the REVIEW-gated action')).toBeVisible();
    // Action buttons disappear once resolved.
    await expect(page.locator('button:has-text("✅ Confirm")')).toHaveCount(0);
  });

  test('block resolves the gate', async ({ page }) => {
    await triggerReviewGate(page);

    await page.locator('button:has-text("❌ Block")').click();
    await expect(page.locator('text=❌ Blocked')).toBeVisible();
    await expect(page.locator('text=Operator blocked the REVIEW-gated action')).toBeVisible();
  });
});
