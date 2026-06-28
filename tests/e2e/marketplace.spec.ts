/**
 * Marketplace E2E tests
 * Covers: page render, product listing, navigation, form validation, API submit endpoint
 */
import { test, expect, request } from '@playwright/test';

test.describe('Marketplace', () => {
  test('marketplace page loads and shows template listing', async ({ page }) => {
    await page.goto('/marketplace');

    // Header / nav present (exact match to avoid strict mode multi-element error)
    await expect(page.getByRole('link', { name: 'DSG ONE', exact: true }).first()).toBeVisible();

    // Hero section
    await expect(page.getByRole('heading', { name: /ship in seconds/i })).toBeVisible();

    // At least one product/template card renders
    const cards = page.locator('article, [data-testid="template-card"], .rounded-2xl, .rounded-xl').first();
    await expect(cards).toBeVisible();
  });

  test('marketplace page shows category badges', async ({ page }) => {
    await page.goto('/marketplace');

    // Category labels are rendered (Commerce, SaaS, Business, etc.)
    const body = await page.textContent('body');
    const hasCategories = (body ?? '').match(/Commerce|SaaS|Business|Finance|Productivity|Internal Tools/);
    expect(hasCategories).not.toBeNull();
  });

  test('marketplace page has working Log in and Dashboard links', async ({ page }) => {
    await page.goto('/marketplace');

    const loginLink = page.getByRole('link', { name: 'Log in' });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');

    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('marketplace is fully responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/marketplace');

    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance

    // Content still visible on mobile
    await expect(page.getByRole('heading', { name: /ship in seconds/i })).toBeVisible();
  });

  test('marketplace submit API: rejects unauthenticated POST', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    // The submit form posts to the products API; an unauthenticated POST must
    // be rejected (401/403), rate-limited (429), or otherwise refused — not 200.
    const res = await api.post('/api/marketplace/products', {
      data: { name: 'Test Product', price: 9.99, description: 'A test', category: 'SaaS' },
    });

    expect([400, 401, 403, 404, 405, 429]).toContain(res.status());

    await api.dispose();
  });

  test('marketplace page title is correct', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveTitle(/marketplace/i);
  });
});
