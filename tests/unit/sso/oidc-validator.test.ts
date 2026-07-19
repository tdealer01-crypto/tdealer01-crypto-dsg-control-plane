import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseJwt,
  validateOidcClaims,
  extractUserInfo,
  isEmailVerified,
  extractGroups,
  buildClientAssertion,
  parseOidcDiscovery,
} from '@/lib/sso/oidc-validator';

describe('OIDC Validator', () => {
  describe('parseJwt', () => {
    it('parses valid JWT token', () => {
      const header = { alg: 'HS256', typ: 'JWT' };
      const claims = { sub: 'user-123', email: 'user@example.com' };
      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64');
      const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64');
      const token = `${headerB64}.${claimsB64}.signature123`;

      const result = parseJwt(token);

      expect(result).not.toBeNull();
      expect(result?.header.alg).toBe('HS256');
      expect(result?.claims.sub).toBe('user-123');
      expect(result?.signature).toBe('signature123');
    });

    it('returns null for malformed token', () => {
      const result = parseJwt('not.a.valid.token.with.parts');

      expect(result).toBeNull();
    });

    it('returns null for token without three parts', () => {
      const result = parseJwt('only.two.parts');

      expect(result).toBeNull();
    });

    it('returns null for invalid base64', () => {
      const result = parseJwt('!!!invalid!!!.!!!base64!!!.signature');

      expect(result).toBeNull();
    });

    it('returns null for token with only two parts', () => {
      const result = parseJwt('header.payload');

      expect(result).toBeNull();
    });
  });

  describe('validateOidcClaims', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    it('validates correct claims', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'client-123',
        sub: 'user-456',
        iat: nowSeconds - 10,
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(true);
      expect(result.claims).toEqual(claims);
    });

    it('rejects invalid issuer', () => {
      const claims = {
        iss: 'https://wrong.idp.com',
        aud: 'client-123',
        sub: 'user-456',
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid issuer');
    });

    it('rejects invalid audience', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'wrong-client',
        sub: 'user-456',
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid audience');
    });

    it('accepts audience as array containing expected value', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: ['client-123', 'other-client'],
        sub: 'user-456',
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(true);
    });

    it('rejects expired token', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'client-123',
        sub: 'user-456',
        iat: nowSeconds - 3600,
        exp: nowSeconds - 10,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token expired');
    });

    it('rejects token issued in future (beyond clock skew)', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'client-123',
        sub: 'user-456',
        iat: nowSeconds + 600, // 10 minutes in future
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token issued in the future');
    });

    it('allows token issued within clock skew', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'client-123',
        sub: 'user-456',
        iat: nowSeconds + 120, // 2 minutes in future (within 5 min skew)
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(true);
    });

    it('rejects token missing subject', () => {
      const claims = {
        iss: 'https://idp.example.com',
        aud: 'client-123',
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token missing subject');
    });

    it('collects multiple validation errors', () => {
      const claims = {
        iss: 'wrong-issuer',
        aud: 'wrong-client',
        iat: nowSeconds + 600,
        exp: nowSeconds - 10,
      };

      const result = validateOidcClaims(claims, 'https://idp.example.com', 'client-123', nowSeconds);

      expect(result.valid).toBe(false);
      expect(result.error?.split(';').length).toBeGreaterThan(1);
    });
  });

  describe('extractUserInfo', () => {
    it('extracts user info from claims', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/photo.jpg',
        groups: ['admin', 'developers'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.externalId).toBe('user-123');
      expect(userInfo.displayName).toBe('John Doe');
      expect(userInfo.givenName).toBe('John');
      expect(userInfo.familyName).toBe('Doe');
      expect(userInfo.pictureUrl).toBe('https://example.com/photo.jpg');
      expect(userInfo.groups).toEqual(['admin', 'developers']);
    });

    it('generates fallback email when missing', () => {
      const claims = {
        sub: 'user-123',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.email).toBe('user-123@identity');
    });

    it('uses email for displayName when name is missing', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.displayName).toBe('user@example.com');
    });

    it('uses subject for displayName when both missing', () => {
      const claims = {
        sub: 'user-123',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.displayName).toBe('user-123');
    });

    it('extracts groups from custom namespace claim', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        'https://dsg.pics/groups': ['team-a', 'team-b'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.groups).toEqual(['team-a', 'team-b']);
    });

    it('handles non-array groups gracefully', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        groups: 'not-an-array',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const userInfo = extractUserInfo(claims);

      expect(userInfo.groups).toEqual([]);
    });
  });

  describe('isEmailVerified', () => {
    it('returns true when email_verified is true', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        email_verified: true,
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      expect(isEmailVerified(claims)).toBe(true);
    });

    it('returns false when email_verified is false', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        email_verified: false,
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      expect(isEmailVerified(claims)).toBe(false);
    });

    it('returns false when email_verified is missing', () => {
      const claims = {
        sub: 'user-123',
        email: 'user@example.com',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      expect(isEmailVerified(claims)).toBe(false);
    });
  });

  describe('extractGroups', () => {
    it('extracts groups from standard claim', () => {
      const claims = {
        sub: 'user-123',
        groups: ['admin', 'developers'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const groups = extractGroups(claims);

      expect(groups).toEqual(['admin', 'developers']);
    });

    it('extracts groups from namespace claim', () => {
      const claims = {
        sub: 'user-123',
        'https://dsg.pics/groups': ['team-a', 'team-b'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const groups = extractGroups(claims);

      expect(groups).toEqual(['team-a', 'team-b']);
    });

    it('extracts groups from SOAP schema claim', () => {
      const claims = {
        sub: 'user-123',
        'http://schemas.xmlsoap.org/claims/Group': ['group1', 'group2'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const groups = extractGroups(claims);

      expect(groups).toEqual(['group1', 'group2']);
    });

    it('returns empty array when no groups present', () => {
      const claims = {
        sub: 'user-123',
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const groups = extractGroups(claims);

      expect(groups).toEqual([]);
    });

    it('prioritizes standard claim over namespace claim', () => {
      const claims = {
        sub: 'user-123',
        groups: ['standard'],
        'https://dsg.pics/groups': ['namespace'],
        aud: 'client',
        iss: 'idp',
        iat: 0,
        exp: 0,
      };

      const groups = extractGroups(claims);

      expect(groups).toEqual(['standard']);
    });
  });

  describe('buildClientAssertion', () => {
    it('builds client assertion with timestamp', () => {
      const issuedAt = 1000;
      const assertion = buildClientAssertion('client-123', 'secret', 'https://idp.example.com/token', issuedAt);

      expect(assertion).toContain('.');
      expect(assertion.split('.').length).toBe(2); // payload.signature
    });

    it('builds assertion with correct payload', () => {
      const issuedAt = 1000;
      const assertion = buildClientAssertion('client-123', 'secret', 'https://idp.example.com/token', issuedAt);

      const payload = Buffer.from(assertion.split('.')[0], 'base64url').toString();
      const parsed = JSON.parse(payload);

      expect(parsed.iss).toBe('client-123');
      expect(parsed.sub).toBe('client-123');
      expect(parsed.aud).toBe('https://idp.example.com/token');
      expect(parsed.iat).toBe(1000);
      expect(parsed.exp).toBe(1000 + 3600);
    });

    it('uses current time by default', () => {
      const beforeCall = Math.floor(Date.now() / 1000);
      const assertion = buildClientAssertion('client-123', 'secret', 'https://idp.example.com/token');
      const afterCall = Math.floor(Date.now() / 1000);

      const payload = Buffer.from(assertion.split('.')[0], 'base64url').toString();
      const parsed = JSON.parse(payload);

      expect(parsed.iat).toBeGreaterThanOrEqual(beforeCall);
      expect(parsed.iat).toBeLessThanOrEqual(afterCall + 1);
    });
  });

  describe('parseOidcDiscovery', () => {
    it('parses valid discovery document', () => {
      const discovery = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
        userinfo_endpoint: 'https://idp.example.com/userinfo',
        jwks_uri: 'https://idp.example.com/.well-known/jwks.json',
        scopes_supported: ['openid', 'profile', 'email'],
        response_types_supported: ['code', 'id_token'],
        grant_types_supported: ['authorization_code'],
      };

      const result = parseOidcDiscovery(discovery);

      expect(result).not.toBeNull();
      expect(result?.issuer).toBe('https://idp.example.com');
      expect(result?.authorization_endpoint).toBe('https://idp.example.com/authorize');
      expect(result?.token_endpoint).toBe('https://idp.example.com/token');
    });

    it('returns null when missing issuer', () => {
      const discovery = {
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
      };

      const result = parseOidcDiscovery(discovery);

      expect(result).toBeNull();
    });

    it('returns null when missing token_endpoint', () => {
      const discovery = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
      };

      const result = parseOidcDiscovery(discovery);

      expect(result).toBeNull();
    });

    it('returns null when missing authorization_endpoint', () => {
      const discovery = {
        issuer: 'https://idp.example.com',
        token_endpoint: 'https://idp.example.com/token',
      };

      const result = parseOidcDiscovery(discovery);

      expect(result).toBeNull();
    });

    it('provides defaults for optional fields', () => {
      const discovery = {
        issuer: 'https://idp.example.com',
        authorization_endpoint: 'https://idp.example.com/authorize',
        token_endpoint: 'https://idp.example.com/token',
      };

      const result = parseOidcDiscovery(discovery);

      expect(result?.userinfo_endpoint).toBe('');
      expect(result?.jwks_uri).toBe('');
      expect(result?.scopes_supported).toContain('openid');
      expect(result?.response_types_supported).toContain('code');
      expect(result?.grant_types_supported).toContain('authorization_code');
    });
  });
});
