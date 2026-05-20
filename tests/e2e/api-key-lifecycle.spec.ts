import { expect, request, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const testSession = process.env.PLAYWRIGHT_TEST_SESSION_COOKIE;

test.describe('API key lifecycle', () => {
  test.skip(!testSession, 'Set PLAYWRIGHT_TEST_SESSION_COOKIE for authenticated API-key lifecycle tests.');

  test('create key, use key, revoke key, then execution is rejected', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'session',
        value: testSession || '',
        domain: new URL(baseURL).hostname,
        path: '/',
        httpOnly: true,
        secure: baseURL.startsWith('https://'),
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${baseURL}/dashboard/api-keys`);
    await page.getByRole('button', { name: /create|new api key/i }).click();

    const rawKey = await page.getByTestId('api-key-secret').textContent();
    expect(rawKey).toMatch(/^sk_/);

    const agentId = await page.getByTestId('api-key-agent-id').textContent();
    expect(agentId).toBeTruthy();

    const api = await request.newContext({ baseURL });
    const ok = await api.post('/api/execute', {
      headers: { authorization: `Bearer ${rawKey}`, 'content-type': 'application/json' },
      data: { agent_id: agentId, action: 'api_key_lifecycle_test', input: { ok: true } },
    });
    expect([200, 409]).toContain(ok.status());

    await page.getByRole('button', { name: /revoke|delete/i }).click();
    await page.getByRole('button', { name: /confirm|revoke|delete/i }).click();

    const rejected = await api.post('/api/execute', {
      headers: { authorization: `Bearer ${rawKey}`, 'content-type': 'application/json' },
      data: { agent_id: agentId, action: 'api_key_revoked_test', input: { ok: false } },
    });
    expect([401, 403]).toContain(rejected.status());
  });
});
