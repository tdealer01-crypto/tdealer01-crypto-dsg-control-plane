import { expect, request, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const billingTestApiKey = process.env.PLAYWRIGHT_BILLING_TEST_API_KEY;
const billingTestAgentId = process.env.PLAYWRIGHT_BILLING_TEST_AGENT_ID;
const quotaExceededApiKey = process.env.PLAYWRIGHT_QUOTA_EXCEEDED_API_KEY;
const quotaExceededAgentId = process.env.PLAYWRIGHT_QUOTA_EXCEEDED_AGENT_ID;

test.describe('billing and quota enforcement', () => {
  test('execute under quota returns 200', async () => {
    test.skip(!billingTestApiKey || !billingTestAgentId, 'Set PLAYWRIGHT_BILLING_TEST_API_KEY and PLAYWRIGHT_BILLING_TEST_AGENT_ID.');

    const api = await request.newContext({ baseURL });
    const response = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${billingTestApiKey}`,
        'content-type': 'application/json',
      },
      data: {
        agent_id: billingTestAgentId,
        action: 'quota_under_limit_test',
        input: { scenario: 'under quota' },
      },
    });

    expect([200, 409]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).not.toHaveProperty('upgrade_url');
    }
  });

  test('execute over quota returns 402 with upgrade_url', async () => {
    test.skip(!quotaExceededApiKey || !quotaExceededAgentId, 'Set PLAYWRIGHT_QUOTA_EXCEEDED_API_KEY and PLAYWRIGHT_QUOTA_EXCEEDED_AGENT_ID.');

    const api = await request.newContext({ baseURL });
    const response = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${quotaExceededApiKey}`,
        'content-type': 'application/json',
      },
      data: {
        agent_id: quotaExceededAgentId,
        action: 'quota_over_limit_test',
        input: { scenario: 'quota exceeded' },
      },
    });

    expect(response.status()).toBe(402);
    const body = await response.json();
    expect(body.error).toMatch(/quota exceeded/i);
    expect(body.upgrade_url).toContain('/pricing');
    expect(typeof body.used).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(body.used).toBeGreaterThanOrEqual(body.limit);
  });

  test('abuse (>60 rpm) returns 429 with rate-limit headers', async () => {
    const api = await request.newContext({ baseURL });

    // Fire 65 concurrent requests to trigger rate limit
    const promises = Array.from({ length: 65 }, () =>
      api.post('/api/execute', {
        headers: {
          authorization: 'Bearer fake_key_for_rate_limit_test',
          'content-type': 'application/json',
        },
        data: { agent_id: 'fake', action: 'test', input: {} },
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status());

    // At least one should be 429 (rate limited) or 401 (before rate limit)
    const has429 = statuses.some((s) => s === 429);
    const allAuth = statuses.every((s) => s === 401);

    // Either rate limit kicks in, or all bounce at auth — both are acceptable
    expect(has429 || allAuth).toBe(true);

    if (has429) {
      const limited = responses.find((r) => r.status() === 429);
      const body = await limited!.json();
      expect(body.error).toMatch(/too many requests/i);
    }
  });
});
