/**
 * Infrastructure health check tests
 * Runs first — verifies all production endpoints are alive before other suites.
 * Azure App Service is the only production authority.
 */
import { test, expect, request } from '@playwright/test';

const PROD_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://dsg-control-plane.azurewebsites.net';
const TUNNEL_URL = process.env.CLOUDFLARE_TUNNEL_URL ?? 'https://shades-powerseller-guys-opposition.trycloudflare.com';

const ENDPOINTS = [
  {
    label: 'Production Azure App Service health',
    url: `${PROD_BASE}/api/health`,
    skipEnv: undefined,
  },
  {
    label: 'Cloudflare Tunnel health',
    url: `${TUNNEL_URL}/health`,
    skipEnv: 'SKIP_TUNNEL_HEALTH',
  },
];

for (const { label, url, skipEnv } of ENDPOINTS) {
  test(`health check: ${label} → ${url}`, async () => {
    if (skipEnv && process.env[skipEnv]) {
      test.skip(true, `Skipped via ${skipEnv} env var`);
    }

    const api = await request.newContext({ ignoreHTTPSErrors: true });
    let res: Awaited<ReturnType<typeof api.get>> | undefined;
    try {
      res = await api.get(url, { timeout: 15_000 });
    } catch (err) {
      if (skipEnv) {
        test.skip(true, `Endpoint unreachable (${String(err)}). Optional tunnel may be offline.`);
        return;
      }
      throw err;
    }

    expect(res.status(), `${label} must return HTTP 200`).toBe(200);

    const body = await res.json();
    expect(body.ok, `${label} body.ok must be true`).toBe(true);

    await api.dispose();
  });
}

test('production readiness: full health payload is valid', async () => {
  const api = await request.newContext({ ignoreHTTPSErrors: true });
  const res = await api.get(`${PROD_BASE}/api/health`, { timeout: 15_000 });

  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.core_ok).toBe(true);
  expect(body.db_ok).toBe(true);

  expect(body.readiness?.ok).toBe(true);
  const checks = body.readiness?.checks ?? {};
  expect(checks.env?.ok).toBe(true);
  expect(checks.nextAuthSecret?.ok).toBe(true);
  expect(checks.supabaseServiceRole?.ok).toBe(true);

  expect(body.rateLimiter?.ok).toBe(true);

  await api.dispose();
});

test('production health: response time is acceptable (<5s)', async () => {
  const api = await request.newContext({ ignoreHTTPSErrors: true });
  const start = Date.now();
  const res = await api.get(`${PROD_BASE}/api/health`, { timeout: 15_000 });
  const duration = Date.now() - start;

  expect(res.status()).toBe(200);
  expect(duration, `Health endpoint responded in ${duration}ms — must be <5000ms`).toBeLessThan(5_000);

  await api.dispose();
});

test('production security headers are present', async () => {
  const api = await request.newContext({ ignoreHTTPSErrors: true });
  const res = await api.get(`${PROD_BASE}/api/health`, { timeout: 15_000 });
  const headers = res.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['strict-transport-security']).toContain('max-age=');

  await api.dispose();
});
