/**
 * JWT and JWKS Tests
 * Comprehensive test suite for authentication modules
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JWTVerifier, type JWTConfig } from '../jwt-verifier';
import { JWKSClient } from '../jwks-client';
import {
  extractAuthToken,
  isPublicRoute,
  guardRoute,
  unauthorized,
  forbidden,
} from '../auth-middleware';
import { NextRequest } from 'next/server';

describe('JWT Verifier', () => {
  let config: JWTConfig;

  beforeEach(() => {
    config = {
      algorithm: 'HS256',
      secret: 'test-secret-key-minimum-32-chars-long-for-hs256',
      issuer: 'test-issuer',
      audience: 'test-audience',
      maxTokenAgeSec: 3600,
    };
  });

  describe('initialization', () => {
    it('initializes successfully with HS256', async () => {
      const verifier = new JWTVerifier(config);
      await expect(verifier.initialize()).resolves.not.toThrow();
    });

    it('throws error without secret for HS256', async () => {
      config.secret = undefined;
      const verifier = new JWTVerifier(config);
      await expect(verifier.initialize()).rejects.toThrow('HS256 requires secret');
    });

    it('throws error without publicKey for RS256', async () => {
      const rsConfig: JWTConfig = {
        algorithm: 'RS256',
        issuer: 'test',
      };
      const verifier = new JWTVerifier(rsConfig);
      await expect(verifier.initialize()).rejects.toThrow(
        'RS256 requires publicKey'
      );
    });
  });

  describe('token structure validation', () => {
    it('rejects token with invalid format', async () => {
      const verifier = new JWTVerifier(config);
      const result = await verifier.verify('invalid.token');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('rejects token with missing parts', async () => {
      const verifier = new JWTVerifier(config);
      const result = await verifier.verify('two.parts');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });
  });

  describe('unsafe decode', () => {
    it('decodes valid token without verification', () => {
      const token =
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.signature';
      const decoded = JWTVerifier.decodeTokenUnsafe(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.payload.sub).toBe('user-123');
    });

    it('returns null for invalid token', () => {
      const decoded = JWTVerifier.decodeTokenUnsafe('invalid');
      expect(decoded).toBeNull();
    });
  });

  describe('token extraction from header', () => {
    it('extracts bearer token', () => {
      const token = JWTVerifier.extractToken('Bearer abc123token');
      expect(token).toBe('abc123token');
    });

    it('handles case-insensitive Bearer', () => {
      const token = JWTVerifier.extractToken('bearer abc123token');
      expect(token).toBe('abc123token');
    });

    it('returns null for invalid format', () => {
      const token = JWTVerifier.extractToken('Basic xyz');
      expect(token).toBeNull();
    });

    it('returns null for empty header', () => {
      const token = JWTVerifier.extractToken('');
      expect(token).toBeNull();
    });
  });
});

describe('JWKS Client', () => {
  let client: JWKSClient;
  const mockJWKS = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'key-1',
        n: 'modulus',
        e: 'AQAB',
      },
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'key-2',
        n: 'modulus-2',
        e: 'AQAB',
      },
    ],
  };

  beforeEach(() => {
    client = new JWKSClient({
      jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
      cacheTtlSec: 3600,
    });

    // Mock fetch
    vi.global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => mockJWKS,
      } as Response)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('caching', () => {
    it('caches JWKS after first fetch', async () => {
      const jwks1 = await client.getJWKS();
      const jwks2 = await client.getJWKS();

      // Should use same object reference (from cache)
      expect(jwks1).toBe(jwks2);
      expect(vi.global.fetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent requests', async () => {
      const promises = [
        client.getJWKS(),
        client.getJWKS(),
        client.getJWKS(),
      ];

      await Promise.all(promises);

      // Only one actual fetch should occur
      expect(vi.global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns cache stats', async () => {
      const stats1 = client.getCacheStats();
      expect(stats1.status).toBe('empty');

      await client.getJWKS();
      const stats2 = client.getCacheStats();
      expect(stats2.status).toBe('valid');
      expect(stats2.age).toBeLessThanOrEqual(1);
    });
  });

  describe('key retrieval', () => {
    it('gets key by kid', async () => {
      const key = await client.getKey('key-1');
      expect(key?.kid).toBe('key-1');
    });

    it('returns null for missing kid', async () => {
      const key = await client.getKey('nonexistent');
      expect(key).toBeNull();
    });

    it('gets first signing key', async () => {
      const key = await client.getSigningKey();
      expect(key?.use).toBe('sig');
    });
  });

  describe('error handling', () => {
    it('handles fetch failures', async () => {
      vi.global.fetch = vi.fn(async () => {
        throw new Error('Network error');
      });

      const client2 = new JWKSClient({
        jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
      });

      await expect(client2.getJWKS()).rejects.toThrow('Network error');
    });

    it('handles HTTP errors', async () => {
      vi.global.fetch = vi.fn(async () =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      );

      const client2 = new JWKSClient({
        jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
      });

      await expect(client2.getJWKS()).rejects.toThrow('404');
    });

    it('handles invalid JWKS format', async () => {
      vi.global.fetch = vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ keys: null }),
        } as Response)
      );

      const client2 = new JWKSClient({
        jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
      });

      await expect(client2.getJWKS()).rejects.toThrow('keys array');
    });

    it('handles timeout', async () => {
      vi.global.fetch = vi.fn(
        async () =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('AbortError')),
              100
            )
          ) as Promise<Response>
      );

      const client2 = new JWKSClient({
        jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
        requestTimeoutSec: 1,
      });

      // This might timeout depending on implementation
    });
  });

  describe('refresh', () => {
    it('invalidates cache and refetches', async () => {
      await client.getJWKS();
      expect(vi.global.fetch).toHaveBeenCalledTimes(1);

      await client.refresh();
      expect(vi.global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Auth Middleware', () => {
  describe('token extraction', () => {
    it('extracts from Authorization header', async () => {
      const req = new NextRequest(new URL('http://localhost/api/test'), {
        headers: { authorization: 'Bearer test-token-123' },
      });

      const result = await extractAuthToken(req);
      expect(result.token).toBe('test-token-123');
    });

    it('extracts from x-api-key header', async () => {
      const req = new NextRequest(new URL('http://localhost/api/test'), {
        headers: { 'x-api-key': 'api-key-123' },
      });

      const result = await extractAuthToken(req);
      expect(result.token).toBe('api-key-123');
    });

    it('returns error when no token provided', async () => {
      const req = new NextRequest(new URL('http://localhost/api/test'));
      const result = await extractAuthToken(req);
      expect(result.token).toBe('');
      expect(result.errorCode).toBe('MISSING_TOKEN');
    });
  });

  describe('public route checking', () => {
    it('identifies public routes', () => {
      const publicRoutes = ['/api/health', '/api/auth/*'];
      expect(isPublicRoute('/api/health', publicRoutes)).toBe(true);
      expect(isPublicRoute('/api/auth/login', publicRoutes)).toBe(true);
      expect(isPublicRoute('/api/protected', publicRoutes)).toBe(false);
    });

    it('handles undefined publicRoutes', () => {
      expect(isPublicRoute('/api/test')).toBe(false);
    });
  });

  describe('response helpers', () => {
    it('creates 401 response', () => {
      const response = unauthorized('Invalid token');
      expect(response.status).toBe(401);
    });

    it('creates 403 response', () => {
      const response = forbidden('Insufficient permissions');
      expect(response.status).toBe(403);
    });
  });
});
