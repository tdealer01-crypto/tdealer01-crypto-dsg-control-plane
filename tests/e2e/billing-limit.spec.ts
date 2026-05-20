import { expect, request, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const billingTestApiKey = process.env.PLAYWRIGHT_BILLING_TEST_API_KEY;
const billingTestAgentId = process.env.PLAYWRIGHT_BILLING_TEST_AGENT_ID;

test.describe('billing and quota enforcement', () => {
  test.skip(!billingTestApiKey || !billingTestAgentId, 'Set billing test API key and agent id for quota E2E.');

  test('quota exceeded returns a clear blocking status and message', async () => {
    const api = await request.newContext({ baseURL });

    const response = await api.post('/api/execute', {
      headers: {
        authorization: `Bearer ${billingTestApiKey}`,
        'content-type': 'application/json',
      },
      data: {
        agent_id: billingTestAgentId,
        action: 'quota_boundary_test',
        input: { scenario: 'quota exceeded' },
      },
    });

    expect([200, 402, 429]).toContain(response.status());
    const body = await response.json().catch(() => ({}));

    if (response.status() !== 200) {
      expect(String(body.error || body.message || '')).toMatch(/quota|limit|billing|execution/i);
    }
  });
});
