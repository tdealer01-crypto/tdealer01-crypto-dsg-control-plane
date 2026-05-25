import { describe, it, expect, vi, afterEach } from 'vitest';

// We import the GET handler directly — no network calls needed.
import { GET } from '../../app/api/agent/status/route';

describe('GET /api/agent/status', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 200 with ok:true and required fields', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc123');
    vi.stubEnv('VERCEL_ENV', 'production');

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.repo).toBe('dsg-one-v1');
    expect(body.version).toBe('abc123');
    expect(body.env).toBe('production');
    expect(typeof body.ts).toBe('string');
    expect(body.checks).toBeDefined();
    expect(typeof body.checks).toBe('object');
  });

  it('version falls back to "local" when VERCEL_GIT_COMMIT_SHA is not set', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    // Ensure VERCEL_GIT_COMMIT_SHA is truly absent
    const originalEnv = process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_SHA;

    const response = await GET();
    const body = await response.json();
    expect(body.version).toBe('local');

    // Restore
    if (originalEnv !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = originalEnv;
  });

  it('env falls back to "local" when VERCEL_ENV is not set', async () => {
    const originalEnv = process.env.VERCEL_ENV;
    delete process.env.VERCEL_ENV;

    const response = await GET();
    const body = await response.json();
    expect(body.env).toBe('local');

    // Restore
    if (originalEnv !== undefined) process.env.VERCEL_ENV = originalEnv;
  });

  it('ts field is a valid ISO 8601 timestamp', async () => {
    const response = await GET();
    const body = await response.json();
    const date = new Date(body.ts);
    expect(Number.isNaN(date.getTime())).toBe(false);
  });

  it('checks field contains db key', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.checks).toHaveProperty('db');
  });

  it('returns consistent repo name regardless of env', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    const response = await GET();
    const body = await response.json();
    expect(body.repo).toBe('dsg-one-v1');
  });
});
