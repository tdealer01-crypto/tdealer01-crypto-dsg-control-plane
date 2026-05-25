import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../../../lib/security/secure-token';

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(token: string | null) {
  const headers: Record<string, string> = {};
  if (token !== null) headers['authorization'] = `Bearer ${token}`;
  return new Request('http://localhost/api/cron/test', { headers });
}

describe('requireCronAuth — no secret configured', () => {
  it('returns 503 in production when no secret is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('CRON_SECRET_SHA256', '');

    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('any-token'), 'flush-meter-outbox');

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(503);
  });

  it('returns 401 in development when no secret is set', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('CRON_SECRET_SHA256', '');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('any-token'), 'flush-meter-outbox');

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(401);
  });

  it('includes cron_secret_required error when no secret configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CRON_SECRET', '');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('tok'), 'test-job');
    const body = await result.response.json();

    expect(body.error).toBe('cron_secret_required');
  });
});

describe('requireCronAuth — shared CRON_SECRET', () => {
  it('returns ok:true when Bearer token matches CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', 'shared-secret-value');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('shared-secret-value'), 'any-job');

    expect(result.ok).toBe(true);
  });

  it('returns 401 when Bearer token does not match CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', 'shared-secret-value');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('wrong-token'), 'any-job');

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(401);
  });

  it('returns ok:true when Bearer token sha256 matches CRON_SECRET_SHA256', async () => {
    const secret = 'hashed-cron-secret';
    vi.stubEnv('CRON_SECRET_SHA256', sha256Hex(secret));

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest(secret), 'any-job');

    expect(result.ok).toBe(true);
  });
});

describe('requireCronAuth — job-specific secret', () => {
  it('returns ok:true when token matches job-specific CRON_<JOB>_SECRET', async () => {
    vi.stubEnv('CRON_FLUSH_METER_OUTBOX_SECRET', 'job-specific-secret');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('job-specific-secret'), 'flush-meter-outbox');

    expect(result.ok).toBe(true);
  });

  it('normalizes job name: lowercase with dashes → uppercase with underscores', async () => {
    vi.stubEnv('CRON_AGENT_HEALTH_CHECK_SECRET', 'health-tok');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('health-tok'), 'agent-health-check');

    expect(result.ok).toBe(true);
  });

  it('job-specific secret takes precedence over shared CRON_SECRET mismatch', async () => {
    vi.stubEnv('CRON_SECRET', 'shared-wrong');
    vi.stubEnv('CRON_MY_JOB_SECRET', 'job-correct');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('job-correct'), 'my-job');

    expect(result.ok).toBe(true);
  });
});

describe('requireCronAuth — response headers', () => {
  it('always sets Cache-Control: no-store header', async () => {
    vi.stubEnv('CRON_SECRET', 'tok');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('tok'), 'any-job');

    expect(result.headers).toMatchObject({ 'Cache-Control': 'no-store' });
  });

  it('sets Cache-Control: no-store even on auth failure', async () => {
    vi.stubEnv('CRON_SECRET', 'tok');

    vi.resetModules();
    const { requireCronAuth } = await import('../../../lib/security/cron-auth');
    const result = requireCronAuth(makeRequest('wrong'), 'any-job');

    expect(result.headers).toMatchObject({ 'Cache-Control': 'no-store' });
  });
});
