import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('lib/security/cors', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DSG_ALLOWED_ORIGINS;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('builds allowed origins from explicit allowlist and app url', async () => {
    process.env.DSG_ALLOWED_ORIGINS =
      'https://app.example.com, https://admin.example.com';
    process.env.APP_URL = 'https://control.example.com/app';

    const { getAllowedCorsOrigins } = await import('../../../lib/security/cors');
    const origins = getAllowedCorsOrigins();

    expect(origins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
      'https://control.example.com',
    ]);
  });

  it('resolves an allowed request origin', async () => {
    process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

    const { resolveAllowedOrigin } = await import('../../../lib/security/cors');

    const req = new Request('http://localhost/api/execute', {
      headers: {
        origin: 'https://app.example.com',
      },
    });

    expect(resolveAllowedOrigin(req)).toBe('https://app.example.com');
  });

  it('adds CORS headers only for allowed origins', async () => {
    process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

    const { buildCorsHeaders } = await import('../../../lib/security/cors');

    const allowedReq = new Request('http://localhost/api/execute', {
      headers: { origin: 'https://app.example.com' },
    });

    const disallowedReq = new Request('http://localhost/api/execute', {
      headers: { origin: 'https://evil.example.com' },
    });

    const allowedHeaders = buildCorsHeaders(allowedReq);
    const blockedHeaders = buildCorsHeaders(disallowedReq);

    expect(allowedHeaders.get('Access-Control-Allow-Origin')).toBe(
      'https://app.example.com'
    );
    expect(blockedHeaders.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns 204 preflight for allowed origin', async () => {
    process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

    const { buildPreflightResponse } = await import('../../../lib/security/cors');

    const req = new Request('http://localhost/api/execute', {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example.com' },
    });

    const res = buildPreflightResponse(req);

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://app.example.com'
    );
  });

  it('returns 403 preflight for disallowed origin', async () => {
    process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

    const { buildPreflightResponse } = await import('../../../lib/security/cors');

    const req = new Request('http://localhost/api/execute', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.com' },
    });

    const res = buildPreflightResponse(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'Origin not allowed' });
  });
});
