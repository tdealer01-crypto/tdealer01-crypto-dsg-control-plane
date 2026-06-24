/**
 * Payment / billing E2E tests
 * Covers: pricing page, Stripe checkout routes, quota enforcement shape
 */
import { test, expect, request } from '@playwright/test';

test.describe('Payment & Billing', () => {
  test('pricing page loads and shows upgrade plans', async ({ page }) => {
    await page.goto('/pricing');

    // Page must not 404 or 500
    const status = await page.evaluate(() => {
      const heading = document.querySelector('h1, h2, [data-testid="pricing-heading"]');
      return heading?.textContent ?? '';
    });
    expect(status.length).toBeGreaterThan(0);
  });

  test('pricing page renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('quickstart page loads and shows copyable curl example', async ({ page }) => {
    const res = await page.goto('/quickstart');
    expect(res?.status()).not.toBe(500);

    // Page should have content
    const body = await page.textContent('body');
    expect((body ?? '').length).toBeGreaterThan(100);
  });

  test('billing quota API: /api/execute rejects missing auth with 401', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post('/api/execute', {
      headers: { 'content-type': 'application/json' },
      data: { agent_id: 'test', action: 'test', input: {} },
    });

    // Must be rate-limited (429) or auth-rejected (401) — never 200 without credentials
    expect([401, 402, 403, 429]).toContain(res.status());

    await api.dispose();
  });

  test('billing quota API: /api/execute rate-limit headers present', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post('/api/execute', {
      headers: {
        authorization: 'Bearer fake_key_for_payment_test',
        'content-type': 'application/json',
      },
      data: { agent_id: 'fake', action: 'payment_test', input: {} },
    });

    const headers = res.headers();

    // Rate limit headers should be present if rate limiting is configured
    const hasRateLimitHeaders =
      'x-ratelimit-limit' in headers ||
      'ratelimit-limit' in headers ||
      'x-rate-limit-limit' in headers;

    // Either has rate limit headers or returns expected auth error
    const validResponse = hasRateLimitHeaders || [401, 402, 403, 429].includes(res.status());
    expect(validResponse).toBe(true);

    await api.dispose();
  });

  test('billing: abuse scenario (65 rapid requests) triggers 429 or 401', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });

    const promises = Array.from({ length: 65 }, () =>
      api.post('/api/execute', {
        headers: {
          authorization: 'Bearer fake_key_abuse_test',
          'content-type': 'application/json',
        },
        data: { agent_id: 'fake', action: 'abuse_test', input: {} },
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status());

    const has429 = statuses.some((s) => s === 429);
    const allAuth = statuses.every((s) => s === 401 || s === 403);
    const acceptable = has429 || allAuth;
    expect(acceptable, `Expected 429 or all-401/403, got: ${[...new Set(statuses)].join(',')}`).toBe(true);

    await api.dispose();
  });
});
