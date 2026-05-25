import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sha256Hex,
  timingSafeStringEqual,
  extractBearerToken,
  verifySecretValue,
  verifyBearerSecret,
} from '../../../lib/security/secure-token';

describe('sha256Hex', () => {
  it('returns a 64-char hex string', () => {
    expect(sha256Hex('hello')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(sha256Hex('test-value')).toBe(sha256Hex('test-value'));
  });

  it('produces different hashes for different inputs', () => {
    expect(sha256Hex('a')).not.toBe(sha256Hex('b'));
  });

  it('handles empty string', () => {
    expect(sha256Hex('')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('timingSafeStringEqual', () => {
  it('returns false when provided is empty', () => {
    expect(timingSafeStringEqual('', 'secret')).toBe(false);
  });

  it('returns false when expected is empty', () => {
    expect(timingSafeStringEqual('provided', '')).toBe(false);
  });

  it('returns true for equal strings', () => {
    expect(timingSafeStringEqual('my-secret', 'my-secret')).toBe(true);
  });

  it('returns false for unequal strings', () => {
    expect(timingSafeStringEqual('my-secret', 'other-secret')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(timingSafeStringEqual('Secret', 'secret')).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('returns empty string when header is null', () => {
    expect(extractBearerToken(null)).toBe('');
  });

  it('returns empty string when header is empty', () => {
    expect(extractBearerToken('')).toBe('');
  });

  it('returns token from valid Bearer header', () => {
    expect(extractBearerToken('Bearer my-token-123')).toBe('my-token-123');
  });

  it('returns empty string when scheme is not Bearer', () => {
    expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBe('');
  });

  it('is case-insensitive for Bearer scheme', () => {
    expect(extractBearerToken('bearer my-token')).toBe('my-token');
    expect(extractBearerToken('BEARER my-token')).toBe('my-token');
  });

  it('returns empty string when no token follows Bearer', () => {
    expect(extractBearerToken('Bearer')).toBe('');
  });

  it('trims trailing whitespace from the token', () => {
    expect(extractBearerToken('Bearer my-token   ')).toBe('my-token');
  });
});

describe('verifySecretValue', () => {
  it('returns false when provided is empty', () => {
    expect(verifySecretValue({ provided: '', expected: 'secret' })).toBe(false);
  });

  it('returns false when provided is only whitespace', () => {
    expect(verifySecretValue({ provided: '   ', expected: 'secret' })).toBe(false);
  });

  it('returns true when provided matches expected exactly', () => {
    expect(verifySecretValue({ provided: 'correct-secret', expected: 'correct-secret' })).toBe(true);
  });

  it('returns false when provided does not match expected', () => {
    expect(verifySecretValue({ provided: 'wrong-secret', expected: 'correct-secret' })).toBe(false);
  });

  it('returns true when sha256(provided) matches expectedSha256', () => {
    const secret = 'my-secret';
    const hash = sha256Hex(secret);
    expect(verifySecretValue({ provided: secret, expectedSha256: hash })).toBe(true);
  });

  it('returns false when sha256 does not match expectedSha256', () => {
    expect(verifySecretValue({ provided: 'wrong', expectedSha256: sha256Hex('correct') })).toBe(false);
  });

  it('returns false when both expected and expectedSha256 are absent', () => {
    expect(verifySecretValue({ provided: 'something' })).toBe(false);
  });

  it('matches expected before falling back to sha256', () => {
    const secret = 'my-secret';
    expect(verifySecretValue({ provided: secret, expected: secret, expectedSha256: 'wrong-hash' })).toBe(true);
  });

  it('trims whitespace from provided before comparison', () => {
    expect(verifySecretValue({ provided: '  my-secret  ', expected: 'my-secret' })).toBe(true);
  });

  it('returns false when expected is null', () => {
    expect(verifySecretValue({ provided: 'secret', expected: null })).toBe(false);
  });
});

describe('verifyBearerSecret', () => {
  function makeRequest(authHeader: string | null) {
    const headers: Record<string, string> = {};
    if (authHeader !== null) headers['authorization'] = authHeader;
    return new Request('http://localhost/', { headers });
  }

  it('returns false when no Authorization header', () => {
    expect(verifyBearerSecret(makeRequest(null), { expected: 'secret' })).toBe(false);
  });

  it('returns false when token does not match expected', () => {
    expect(verifyBearerSecret(makeRequest('Bearer wrong'), { expected: 'correct' })).toBe(false);
  });

  it('returns true when token matches expected', () => {
    expect(verifyBearerSecret(makeRequest('Bearer my-token'), { expected: 'my-token' })).toBe(true);
  });

  it('returns true when token sha256 matches expectedSha256', () => {
    const secret = 'my-cron-secret';
    expect(verifyBearerSecret(
      makeRequest(`Bearer ${secret}`),
      { expectedSha256: sha256Hex(secret) }
    )).toBe(true);
  });

  it('returns false when Authorization is not Bearer scheme', () => {
    expect(verifyBearerSecret(makeRequest('Basic abc123'), { expected: 'abc123' })).toBe(false);
  });
});
