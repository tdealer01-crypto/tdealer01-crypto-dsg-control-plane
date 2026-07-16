import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePKCE,
  validatePKCE,
  generateSignedState,
  verifySignedState,
  generateAuthorizationCode,
  hashAuthorizationCode,
  generateAccessToken,
  hashAccessToken,
  generateNonce,
  validateRedirectUri,
  getOAuthClientConfig,
  validateClientCredentials,
} from '@/lib/mcp/oauth-helper';

describe('MCP OAuth Helpers', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret-key-for-oauth';
    process.env.MCP_OAUTH_CLIENT_ID = 'claude-ai-connector-v1';
    process.env.MCP_OAUTH_CLIENT_SECRET = 'test-client-secret';
    process.env.MCP_OAUTH_REDIRECT_URIS = 'https://claude.ai/auth/callback/dsg-mcp,https://localhost:3000/callback';
  });

  describe('PKCE', () => {
    it('should generate valid PKCE verifier and challenge', () => {
      const { codeVerifier, codeChallenge } = generatePKCE();

      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    });

    it('should validate correct PKCE pair', () => {
      const { codeVerifier, codeChallenge } = generatePKCE();
      const isValid = validatePKCE(codeVerifier, codeChallenge);
      expect(isValid).toBe(true);
    });

    it('should reject invalid code_verifier', () => {
      const { codeChallenge } = generatePKCE();
      const isValid = validatePKCE('invalid-verifier', codeChallenge);
      expect(isValid).toBe(false);
    });
  });

  describe('State Token', () => {
    it('should sign and verify state payload', () => {
      const payload = {
        codeChallenge: 'test-challenge',
        nonce: 'test-nonce',
        actor_id: 'user-123',
        iat: Math.floor(Date.now() / 1000),
      };

      const signedState = generateSignedState(payload);
      expect(signedState).toContain('.');

      const verified = verifySignedState(signedState);
      expect(verified).toEqual(payload);
    });

    it('should reject tampered state', () => {
      const payload = {
        codeChallenge: 'test-challenge',
        nonce: 'test-nonce',
        actor_id: 'user-123',
        iat: Math.floor(Date.now() / 1000),
      };

      const signedState = generateSignedState(payload);
      const [encoded] = signedState.split('.');
      const tamperedState = `${encoded}.invalid-signature`;

      const verified = verifySignedState(tamperedState);
      expect(verified).toBeNull();
    });

    it('should reject expired state', () => {
      const payload = {
        codeChallenge: 'test-challenge',
        nonce: 'test-nonce',
        actor_id: 'user-123',
        iat: Math.floor(Date.now() / 1000) - 31 * 60, // 31 minutes ago
      };

      const signedState = generateSignedState(payload);
      const verified = verifySignedState(signedState);
      expect(verified).toBeNull();
    });
  });

  describe('Authorization Code', () => {
    it('should generate authorization code', () => {
      const code = generateAuthorizationCode();
      expect(code).toMatch(/^code_[a-f0-9]+$/);
    });

    it('should hash authorization code', () => {
      const code = generateAuthorizationCode();
      const hash = hashAuthorizationCode(code);
      expect(hash).toMatch(/^[a-f0-9]+$/);
      expect(hash.length).toBe(64); // SHA-256 hex
    });

    it('should produce consistent hashes', () => {
      const code = generateAuthorizationCode();
      const hash1 = hashAuthorizationCode(code);
      const hash2 = hashAuthorizationCode(code);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Access Token', () => {
    it('should generate access token', () => {
      const token = generateAccessToken();
      expect(token).toMatch(/^mcp_[a-f0-9]+$/);
    });

    it('should hash access token', () => {
      const token = generateAccessToken();
      const hash = hashAccessToken(token);
      expect(hash).toMatch(/^[a-f0-9]+$/);
      expect(hash.length).toBe(64); // SHA-256 hex
    });
  });

  describe('Nonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('Redirect URI Validation', () => {
    it('should accept allowed redirect URIs', () => {
      expect(validateRedirectUri('https://claude.ai/auth/callback/dsg-mcp')).toBe(true);
      expect(validateRedirectUri('https://localhost:3000/callback')).toBe(true);
    });

    it('should reject disallowed redirect URIs', () => {
      expect(validateRedirectUri('https://evil.com/callback')).toBe(false);
      expect(validateRedirectUri('http://localhost:3000/callback')).toBe(false);
    });
  });

  describe('Client Configuration', () => {
    it('should return OAuth client config', () => {
      const config = getOAuthClientConfig();
      expect(config.clientId).toBe('claude-ai-connector-v1');
      expect(config.clientSecret).toBe('test-client-secret');
      expect(config.redirectUris).toContain('https://claude.ai/auth/callback/dsg-mcp');
      expect(config.tokenTtl).toBe(3600);
      expect(config.codeTtl).toBe(600);
    });

    it('should validate client credentials', () => {
      expect(validateClientCredentials('claude-ai-connector-v1', 'test-client-secret')).toBe(true);
      expect(validateClientCredentials('claude-ai-connector-v1', 'wrong-secret')).toBe(false);
      expect(validateClientCredentials('wrong-client', 'test-client-secret')).toBe(false);
    });
  });
});
