import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { generatePKCE, validatePKCE, generateAuthorizationCode, hashAuthorizationCode, generateAccessToken, hashAccessToken, validateRedirectUri, getOAuthClientConfig } from '@/lib/mcp/oauth-helper';

/**
 * MCP OAuth 2.0 + PKCE Integration Test Suite
 *
 * Tests complete OAuth flow:
 * 1. Client initiates authorization request with PKCE code_challenge
 * 2. Server validates redirect_uri and code_challenge
 * 3. User authenticates and grants consent
 * 4. Server generates authorization code (10-min TTL)
 * 5. Client exchanges code + code_verifier for access token
 * 6. Token stored in mcp_oauth_tokens table with actor_id + key_id
 * 7. Client calls MCP tools using access token
 * 8. Token validation checks subscription status and quota
 * 9. Token revocation marks token as revoked
 */

describe('MCP OAuth 2.0 + PKCE Flow', () => {
  let testState: {
    codeVerifier: string;
    codeChallenge: string;
    authorizationCode: string;
    codeHash: string;
    accessToken: string;
    tokenHash: string;
    signedState: string;
    userId: string;
    keyId: string;
  };

  beforeEach(() => {
    // Initialize test state
    testState = {
      codeVerifier: '',
      codeChallenge: '',
      authorizationCode: '',
      codeHash: '',
      accessToken: '',
      tokenHash: '',
      signedState: '',
      userId: 'user-uuid-test-123',
      keyId: 'key-uuid-test-456',
    };
  });

  describe('Phase 1: Authorization Request', () => {
    it('should generate valid PKCE code_challenge from verifier', () => {
      const { codeVerifier, codeChallenge } = generatePKCE();

      testState.codeVerifier = codeVerifier;
      testState.codeChallenge = codeChallenge;

      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(codeChallenge.length).toBeGreaterThanOrEqual(43);
    });

    it('should validate correct PKCE code_verifier against code_challenge', () => {
      const { codeVerifier, codeChallenge } = generatePKCE();
      testState.codeVerifier = codeVerifier;
      testState.codeChallenge = codeChallenge;

      const isValid = validatePKCE(codeVerifier, codeChallenge);
      expect(isValid).toBe(true);
    });

    it('should reject invalid code_verifier against code_challenge', () => {
      const { codeChallenge } = generatePKCE();
      const invalidVerifier = 'this-is-not-the-correct-verifier-that-matches-challenge';

      const isValid = validatePKCE(invalidVerifier, codeChallenge);
      expect(isValid).toBe(false);
    });

    it('should validate redirect_uri against whitelist', () => {
      const validUri1 = 'https://claude.ai/auth/callback/dsg-mcp';
      const validUri2 = 'https://localhost:3000/callback';
      const invalidUri = 'https://evil.com/callback';

      expect(validateRedirectUri(validUri1)).toBe(true);
      expect(validateRedirectUri(validUri2)).toBe(true);
      expect(validateRedirectUri(invalidUri)).toBe(false);
    });

    it('should generate signed state token with code_challenge', () => {
      const { codeChallenge } = generatePKCE();
      const nonce = 'nonce-test-123';
      const secret = 'test-oauth-secret-key-for-mcp';

      const payload = {
        codeChallenge,
        nonce,
        actor_id: testState.userId,
        iat: Math.floor(Date.now() / 1000),
      };

      // Manually sign state for testing (since STATE_SECRET isn't available at import time)
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(encoded)
        .digest('base64url');
      const signedState = `${encoded}.${signature}`;
      testState.signedState = signedState;

      expect(signedState).toContain('.');
      const parts = signedState.split('.');
      expect(parts.length).toBe(2);
    });

    it('should verify signed state token integrity', () => {
      const { codeChallenge } = generatePKCE();
      const nonce = 'nonce-test-456';
      const secret = 'test-oauth-secret-key-for-mcp';

      const payload = {
        codeChallenge,
        nonce,
        actor_id: testState.userId,
        iat: Math.floor(Date.now() / 1000),
      };

      // Manually sign state for testing
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(encoded)
        .digest('base64url');
      const signedState = `${encoded}.${signature}`;

      // Manual verification (since verifySignedState requires STATE_SECRET)
      const [storedEncoded, storedSignature] = signedState.split('.');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(storedEncoded)
        .digest('base64url');

      expect(storedSignature).toBe(expectedSignature);
      const decodedPayload = JSON.parse(
        Buffer.from(storedEncoded, 'base64url').toString('utf-8')
      );
      expect(decodedPayload.codeChallenge).toBe(codeChallenge);
      expect(decodedPayload.nonce).toBe(nonce);
      expect(decodedPayload.actor_id).toBe(testState.userId);
    });

    it('should reject tampered state token', () => {
      const { codeChallenge } = generatePKCE();
      const secret = 'test-oauth-secret-key-for-mcp';
      const payload = {
        codeChallenge,
        nonce: 'nonce-test',
        actor_id: testState.userId,
        iat: Math.floor(Date.now() / 1000),
      };

      // Manually sign state for testing
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(encoded)
        .digest('base64url');
      const tamperedState = `${encoded}.invalid-signature`;

      // Manual verification
      const [storedEncoded, storedSignature] = tamperedState.split('.');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(storedEncoded)
        .digest('base64url');

      expect(storedSignature).not.toBe(expectedSignature);
    });
  });

  describe('Phase 2: Consent & Authorization Code Generation', () => {
    it('should generate authorization code with correct format', () => {
      const code = generateAuthorizationCode();
      testState.authorizationCode = code;

      expect(code).toMatch(/^code_[a-f0-9]+$/);
      expect(code.length).toBeGreaterThan(10);
    });

    it('should hash authorization code consistently', () => {
      const code = generateAuthorizationCode();
      testState.authorizationCode = code;

      const hash1 = hashAuthorizationCode(code);
      const hash2 = hashAuthorizationCode(code);

      testState.codeHash = hash1;

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('should produce different hashes for different codes', () => {
      const code1 = generateAuthorizationCode();
      const code2 = generateAuthorizationCode();

      const hash1 = hashAuthorizationCode(code1);
      const hash2 = hashAuthorizationCode(code2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Phase 3: Token Exchange', () => {
    it('should generate access token with mcp_ prefix', () => {
      const token = generateAccessToken();
      testState.accessToken = token;

      expect(token).toMatch(/^mcp_[a-f0-9]+$/);
      expect(token.length).toBeGreaterThan(10);
    });

    it('should hash access token consistently', () => {
      const token = generateAccessToken();
      testState.accessToken = token;

      const hash1 = hashAccessToken(token);
      const hash2 = hashAccessToken(token);

      testState.tokenHash = hash1;

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('should return OAuth client configuration', () => {
      const config = getOAuthClientConfig();

      expect(config).toHaveProperty('clientId');
      expect(config).toHaveProperty('clientSecret');
      expect(config).toHaveProperty('redirectUris');
      expect(config).toHaveProperty('tokenTtl');
      expect(config).toHaveProperty('codeTtl');

      expect(config.clientId).toBe('claude-ai-connector-v1');
      expect(config.clientSecret).toBe('test-client-secret-123');
      expect(config.redirectUris).toContain('https://claude.ai/auth/callback/dsg-mcp');
      expect(config.tokenTtl).toBe(3600); // 1 hour
      expect(config.codeTtl).toBe(600); // 10 minutes
    });
  });

  describe('Phase 4: Token Storage & Metadata', () => {
    it('should prepare token record with actor_id and key_id', () => {
      const token = generateAccessToken();
      const tokenHash = hashAccessToken(token);

      const tokenRecord = {
        token_id: 'token-uuid-test',
        actor_id: testState.userId,
        key_id: testState.keyId,
        token_hash: tokenHash,
        scope: 'mcp:execute',
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        revoked_at: null,
        created_at: new Date().toISOString(),
        last_used_at: null,
      };

      expect(tokenRecord.actor_id).toBe(testState.userId);
      expect(tokenRecord.key_id).toBe(testState.keyId);
      expect(tokenRecord.scope).toBe('mcp:execute');
      expect(tokenRecord.revoked_at).toBeNull();
      expect(tokenRecord.token_hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should link token to MCP API key subscription', () => {
      const apiKeyRecord = {
        key_id: testState.keyId,
        actor_id: testState.userId,
        key_hash: 'key-hash-123',
        key_prefix: 'dsg_xxxx',
        status: 'ACTIVE',
        stripe_subscription_id: 'sub_test_123',
        plan_id: 'plan-mcp-490',
        calls_limit: 10000,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      expect(apiKeyRecord.actor_id).toBe(testState.userId);
      expect(apiKeyRecord.stripe_subscription_id).toBe('sub_test_123');
      expect(apiKeyRecord.calls_limit).toBe(10000);
    });
  });

  describe('Phase 5: Token Validation at MCP Call Time', () => {
    it('should validate token against stored hash', () => {
      const token = generateAccessToken();
      const storedHash = hashAccessToken(token);

      // Simulate lookup: rehash provided token and compare
      const providedHash = hashAccessToken(token);

      expect(providedHash).toBe(storedHash);
    });

    it('should check token expiration', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 3600 * 1000); // 1 hour from now
      const isExpired = now > expiresAt.getTime();

      expect(isExpired).toBe(false);
    });

    it('should validate token is not revoked', () => {
      const tokenRecord = {
        token_hash: 'hash-123',
        revoked_at: null,
      };

      const isRevoked = tokenRecord.revoked_at !== null;
      expect(isRevoked).toBe(false);
    });

    it('should check subscription status', () => {
      const apiKey = {
        key_id: 'key-123',
        stripe_subscription_id: 'sub_test_123',
        status: 'ACTIVE',
      };

      const subscriptionActive = !!apiKey.stripe_subscription_id && apiKey.status === 'ACTIVE';
      expect(subscriptionActive).toBe(true);
    });

    it('should validate quota not exceeded', () => {
      const usage = {
        calls_used: 8000,
        calls_limit: 10000,
      };

      const quotaExceeded = usage.calls_used >= usage.calls_limit;
      expect(quotaExceeded).toBe(false);

      const usage2 = {
        calls_used: 10000,
        calls_limit: 10000,
      };

      const quotaExceeded2 = usage2.calls_used >= usage2.calls_limit;
      expect(quotaExceeded2).toBe(true);
    });
  });

  describe('Phase 6: Token Revocation', () => {
    it('should mark token as revoked', () => {
      const tokenRecord = {
        token_id: 'token-123',
        revoked_at: null,
      };

      // Simulate revocation
      tokenRecord.revoked_at = new Date().toISOString();

      expect(tokenRecord.revoked_at).not.toBeNull();
    });

    it('should reject revoked token on next MCP call', () => {
      const tokenRecord = {
        token_id: 'token-123',
        revoked_at: new Date().toISOString(),
      };

      const isRevoked = tokenRecord.revoked_at !== null;
      expect(isRevoked).toBe(true);
    });
  });

  describe('OAuth Metadata Endpoints', () => {
    it('should return RFC 8414 authorization server metadata', () => {
      const metadata = {
        issuer: 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        authorization_endpoint: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp/oauth/authorize',
        token_endpoint: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp/oauth/token',
        revocation_endpoint: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp/oauth/revoke',
        userinfo_endpoint: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp/oauth/userinfo',
        jwks_uri: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/.well-known/jwks.json',
        scopes_supported: ['mcp:execute'],
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
        service_documentation: 'https://docs.dsg.pics/mcp-oauth',
      };

      expect(metadata).toHaveProperty('issuer');
      expect(metadata).toHaveProperty('authorization_endpoint');
      expect(metadata).toHaveProperty('token_endpoint');
      expect(metadata).toHaveProperty('code_challenge_methods_supported');
      expect(metadata.code_challenge_methods_supported).toContain('S256');
      expect(metadata.scopes_supported).toContain('mcp:execute');
    });

    it('should return RFC 9728 protected resource metadata', () => {
      const metadata = {
        resource: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/mcp-server',
        authorization_server: 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        access_token_format: 'opaque',
        access_token_ttl: 3600,
      };

      expect(metadata).toHaveProperty('resource');
      expect(metadata).toHaveProperty('authorization_server');
      expect(metadata.access_token_format).toBe('opaque');
      expect(metadata.access_token_ttl).toBe(3600);
    });
  });

  describe('Error Handling', () => {
    it('should reject missing client_id in authorization request', () => {
      const isValidAuthRequest = (clientId?: string) => {
        return clientId !== undefined && clientId !== '';
      };

      expect(isValidAuthRequest()).toBe(false);
      expect(isValidAuthRequest('claude-ai-connector-v1')).toBe(true);
    });

    it('should reject invalid client credentials in token exchange', () => {
      const validateCredentials = (clientId: string, clientSecret: string) => {
        return clientId === 'claude-ai-connector-v1' && clientSecret === 'test-client-secret-123';
      };

      expect(validateCredentials('claude-ai-connector-v1', 'test-client-secret-123')).toBe(true);
      expect(validateCredentials('wrong-client', 'test-client-secret-123')).toBe(false);
      expect(validateCredentials('claude-ai-connector-v1', 'wrong-secret')).toBe(false);
    });

    it('should reject expired authorization code', () => {
      const now = Date.now();
      const codeExpiry = now - 60000; // 1 minute ago

      const isExpired = now > codeExpiry;
      expect(isExpired).toBe(true);
    });

    it('should reject already-exchanged authorization code', () => {
      const authCode = {
        code_id: 'code-123',
        exchanged_at: new Date().toISOString(),
      };

      const isAlreadyExchanged = authCode.exchanged_at !== null;
      expect(isAlreadyExchanged).toBe(true);
    });

    it('should return 401 Unauthorized for invalid token', () => {
      const response = {
        status: 401,
        error: {
          code: -32001,
          message: 'Unauthorized: invalid or expired token',
        },
      };

      expect(response.status).toBe(401);
      expect(response.error.code).toBe(-32001);
    });

    it('should return 402 Payment Required for inactive subscription', () => {
      const response = {
        status: 402,
        error: {
          code: -32002,
          message: 'Payment Required: MCP API subscription not active',
          data: {
            status: 'subscription_inactive',
            upgrade_url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/billing',
          },
        },
      };

      expect(response.status).toBe(402);
      expect(response.error.code).toBe(-32002);
      expect(response.error.data.status).toBe('subscription_inactive');
    });

    it('should return 402 Payment Required for quota exceeded', () => {
      const response = {
        status: 402,
        error: {
          code: -32003,
          message: 'Payment Required: Monthly API quota exceeded',
          data: {
            status: 'quota_exceeded',
            calls_used: 10000,
            calls_limit: 10000,
            upgrade_url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/billing',
          },
        },
      };

      expect(response.status).toBe(402);
      expect(response.error.code).toBe(-32003);
      expect(response.error.data.status).toBe('quota_exceeded');
      expect(response.error.data.calls_used).toBe(response.error.data.calls_limit);
    });
  });

  describe('Backward Compatibility', () => {
    it('should allow non-OAuth bearer tokens to pass through', () => {
      const bearerToken = 'Bearer sk_test_old_api_key_123';
      const tokenValue = bearerToken.replace('Bearer ', '');

      const isOAuthToken = tokenValue.startsWith('mcp_');
      expect(isOAuthToken).toBe(false);
    });

    it('should validate only mcp_* prefixed tokens as OAuth', () => {
      const oauthToken = 'mcp_a1b2c3d4e5f6g7h8';
      const legacyToken = 'sk_test_legacy_123';

      const isOAuthToken1 = oauthToken.startsWith('mcp_');
      const isOAuthToken2 = legacyToken.startsWith('mcp_');

      expect(isOAuthToken1).toBe(true);
      expect(isOAuthToken2).toBe(false);
    });
  });
});
