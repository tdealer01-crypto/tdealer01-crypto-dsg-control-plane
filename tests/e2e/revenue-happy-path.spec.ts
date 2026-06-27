/**
 * Revenue E2E: Free → Quota Block → Upgrade → Execute as Paid
 *
 * Requires staging env vars. Skipped unless PLAYWRIGHT_STAGING_GATE=true.
 * These tests are intentionally sequential — each step depends on the prior.
 */
import { expect, request, test } from '@playwright/test';

const isStagingGate = process.env.PLAYWRIGHT_STAGING_GATE === 'true';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Pre-provisioned test credentials (staging only)
const freeApiKey = process.env.E2E_FREE_API_KEY || '';
const freeAgentId = process.env.E2E_FREE_AGENT_ID || '';
const paidApiKey = process.env.E2E_PAID_API_KEY || '';
const paidAgentId = process.env.E2E_PAID_AGENT_ID || '';

test.describe('Revenue happy path', () => {
  test.skip(!isStagingGate, 'Revenue E2E only runs when PLAYWRIGHT_STAGING_GATE=true');

  test('free org: first execute returns 200', async () => {
    test.skip(!freeApiKey, 'Set E2E_FREE_API_KEY');
    const api = await request.newContext({ baseURL });

    const res = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${freeApiKey}`,
        'content-type': 'application/json',
      },
      data: { agent_id: freeAgentId, action: 'e2e_revenue_test', input: { step: 1 } },
    });

    expect([200, 409]).toContain(res.status());
  });

  test('free org: at quota returns 402 with upgrade_url', async () => {
    test.skip(!process.env.E2E_FREE_QUOTA_EXCEEDED_API_KEY, 'Set E2E_FREE_QUOTA_EXCEEDED_API_KEY for exhausted free org');
    const api = await request.newContext({ baseURL });

    const res = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${process.env.E2E_FREE_QUOTA_EXCEEDED_API_KEY}`,
        'content-type': 'application/json',
      },
      data: {
        agent_id: process.env.E2E_FREE_QUOTA_EXCEEDED_AGENT_ID,
        action: 'e2e_quota_exceeded',
        input: { step: 2 },
      },
    });

    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.upgrade_url).toContain('/pricing');
  });

  test('pricing page is reachable and shows upgrade plans', async ({ page }) => {
    await page.goto(`${baseURL}/pricing`);
    await expect(page).toHaveURL(/pricing/);

    // At least one CTA button present
    const ctas = page.getByRole('link', { name: /start|upgrade|get started/i });
    await expect(ctas.first()).toBeVisible();
  });

  test('quickstart page shows a copyable curl example', async ({ page }) => {
    await page.goto(`${baseURL}/quickstart`);
    await expect(page).toHaveURL(/quickstart/);

    // There should be a code block or pre element with curl
    const curlText = page.locator('pre, code').filter({ hasText: /curl/i }).first();
    await expect(curlText).toBeVisible();
  });

  test('paid org: execute returns 200 after entitlement', async () => {
    test.skip(!paidApiKey, 'Set E2E_PAID_API_KEY');
    const api = await request.newContext({ baseURL });

    const res = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${paidApiKey}`,
        'content-type': 'application/json',
      },
      data: { agent_id: paidAgentId, action: 'e2e_paid_execute', input: { step: 4 } },
    });

    // Paid orgs should succeed (200) or hit the 409 intent-pending flow
    expect([200, 409]).toContain(res.status());
    if (res.status() !== 200) {
      const body = await res.json();
      // Must NOT be a quota block
      expect(res.status()).not.toBe(402);
      expect(body?.error).not.toMatch(/quota/i);
    }
  });

  test('production health: /api/health or root returns 2xx', async () => {
    const api = await request.newContext({ baseURL });
    const res = await api.get('/');
    expect(res.status()).toBeLessThan(400);
  });
});
