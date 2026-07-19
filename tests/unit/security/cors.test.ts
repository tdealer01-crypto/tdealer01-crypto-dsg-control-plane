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
    delete process.env.NODE_ENV;
    delete process.env.DSG_CORS_STRICT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getAllowedCorsOrigins', () => {
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

    it('includes Vercel production URL when set', async () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'myapp.vercel.app';

      const { getAllowedCorsOrigins } = await import('../../../lib/security/cors');
      const origins = getAllowedCorsOrigins();

      expect(origins).toContain('https://myapp.vercel.app');
    });

    it('deduplicates origins', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.APP_URL = 'https://app.example.com';

      const { getAllowedCorsOrigins } = await import('../../../lib/security/cors');
      const origins = getAllowedCorsOrigins();

      const count = origins.filter((o) => o === 'https://app.example.com').length;
      expect(count).toBe(1);
    });

    it('filters out invalid URLs', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://valid.example.com,not-a-url,ftp://invalid.com';

      const { getAllowedCorsOrigins } = await import('../../../lib/security/cors');
      const origins = getAllowedCorsOrigins();

      expect(origins).toContain('https://valid.example.com');
      expect(origins).not.toContain('not-a-url');
      expect(origins).not.toContain('ftp://invalid.com');
    });

    it('returns empty array in development without config', async () => {
      const { getAllowedCorsOrigins } = await import('../../../lib/security/cors');
      const origins = getAllowedCorsOrigins();

      expect(origins).toEqual([]);
    });
  });

  describe('resolveAllowedOrigin', () => {
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

    it('returns null for disallowed origin', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { resolveAllowedOrigin } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: {
          origin: 'https://evil.example.com',
        },
      });

      expect(resolveAllowedOrigin(req)).toBeNull();
    });

    it('returns null when no origin header', async () => {
      const { resolveAllowedOrigin } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: {},
      });

      expect(resolveAllowedOrigin(req)).toBeNull();
    });

    it('handles origin with port', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com:8443';

      const { resolveAllowedOrigin } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: {
          origin: 'https://app.example.com:8443',
        },
      });

      expect(resolveAllowedOrigin(req)).toBe('https://app.example.com:8443');
    });
  });

  describe('buildCorsHeaders', () => {
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

    it('includes all required CORS headers', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildCorsHeaders } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: { origin: 'https://app.example.com' },
      });

      const headers = buildCorsHeaders(req);

      expect(headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(headers.get('Access-Control-Max-Age')).toBe('600');
    });

    it('preserves existing headers', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildCorsHeaders } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: { origin: 'https://app.example.com' },
      });

      const extraHeaders = {
        'X-Custom-Header': 'custom-value',
      };

      const headers = buildCorsHeaders(req, extraHeaders);

      expect(headers.get('X-Custom-Header')).toBe('custom-value');
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    });

    it('sets Vary header to Origin', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildCorsHeaders } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: { origin: 'https://app.example.com' },
      });

      const headers = buildCorsHeaders(req);

      expect(headers.get('Vary')).toBe('Origin');
    });

    it('appends to existing Vary header', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildCorsHeaders } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        headers: { origin: 'https://app.example.com' },
      });

      const extraHeaders = {
        Vary: 'Accept-Encoding',
      };

      const headers = buildCorsHeaders(req, extraHeaders);

      expect(headers.get('Vary')).toContain('Accept-Encoding');
      expect(headers.get('Vary')).toContain('Origin');
    });
  });

  describe('buildPreflightResponse', () => {
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

    it('returns 204 when no origin header', async () => {
      const { buildPreflightResponse } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        method: 'OPTIONS',
      });

      const res = buildPreflightResponse(req);

      expect(res.status).toBe(204);
    });

    it('includes Vary header in error response', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildPreflightResponse } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example.com' },
      });

      const res = buildPreflightResponse(req);

      expect(res.headers.get('Vary')).toBe('Origin');
    });

    it('includes full CORS headers for allowed origin', async () => {
      process.env.DSG_ALLOWED_ORIGINS = 'https://app.example.com';

      const { buildPreflightResponse } = await import('../../../lib/security/cors');

      const req = new Request('http://localhost/api/execute', {
        method: 'OPTIONS',
        headers: { origin: 'https://app.example.com' },
      });

      const res = buildPreflightResponse(req);

      expect(res.headers.get('Access-Control-Allow-Methods')).not.toBeNull();
      expect(res.headers.get('Access-Control-Allow-Headers')).not.toBeNull();
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });
  });
});
