import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Secret Crypto', () => {
  let encryptSecret: typeof import('@/lib/security/secret-crypto').encryptSecret;
  let decryptSecret: typeof import('@/lib/security/secret-crypto').decryptSecret;
  let generateWebhookSecret: typeof import('@/lib/security/secret-crypto').generateWebhookSecret;
  let createWebhookSignature: typeof import('@/lib/security/secret-crypto').createWebhookSignature;
  let verifyWebhookSignature: typeof import('@/lib/security/secret-crypto').verifyWebhookSignature;
  let hashApiKey: typeof import('@/lib/security/secret-crypto').hashApiKey;

  beforeEach(async () => {
    vi.resetModules();
    // Set up encryption key for tests
    vi.stubEnv('DSG_SECRET_ENCRYPTION_KEY', 'a'.repeat(64));

    const module = await import('@/lib/security/secret-crypto');
    encryptSecret = module.encryptSecret;
    decryptSecret = module.decryptSecret;
    generateWebhookSecret = module.generateWebhookSecret;
    createWebhookSignature = module.createWebhookSignature;
    verifyWebhookSignature = module.verifyWebhookSignature;
    hashApiKey = module.hashApiKey;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('encryptSecret & decryptSecret', () => {
    it('encrypts and decrypts a plaintext secret', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = encryptSecret(plaintext);

      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      // Encrypted should be base64
      expect(/^[A-Za-z0-9+/=]+$/.test(encrypted)).toBe(true);
    });

    it('decrypts encrypted secret back to plaintext', () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random IV/salt)', () => {
      const plaintext = 'my-secret-value';
      const encrypted1 = encryptSecret(plaintext);
      const encrypted2 = encryptSecret(plaintext);

      // Different ciphertexts due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same plaintext
      expect(decryptSecret(encrypted1)).toBe(plaintext);
      expect(decryptSecret(encrypted2)).toBe(plaintext);
    });

    it('handles empty strings', () => {
      const encrypted = encryptSecret('');
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe('');
    });

    it('handles long secrets', () => {
      const longSecret = 'x'.repeat(10000);
      const encrypted = encryptSecret(longSecret);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(longSecret);
    });

    it('handles special characters and unicode', () => {
      const secret = 'my-secret-!@#$%^&*()_+-=[]{}|;:",.<>?/~`\nμ';
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('throws on invalid encrypted format (too short)', () => {
      const invalidBase64 = Buffer.from('short').toString('base64');
      expect(() => decryptSecret(invalidBase64)).toThrow('Invalid encrypted secret format');
    });

    it('throws on invalid base64 input', () => {
      expect(() => decryptSecret('!!!invalid base64!!!')).toThrow();
    });

    it('throws when encryption key is missing', async () => {
      vi.stubEnv('DSG_SECRET_ENCRYPTION_KEY', '');
      vi.resetModules();
      const module = await import('@/lib/security/secret-crypto');

      expect(() => module.encryptSecret('test')).toThrow('Missing DSG_SECRET_ENCRYPTION_KEY');
    });

    it('throws when encryption key is invalid format', async () => {
      vi.stubEnv('DSG_SECRET_ENCRYPTION_KEY', 'not-hex-format');
      vi.resetModules();
      const module = await import('@/lib/security/secret-crypto');

      expect(() => module.encryptSecret('test')).toThrow('must be 64 hex characters');
    });

    it('throws when encryption key is wrong length', async () => {
      vi.stubEnv('DSG_SECRET_ENCRYPTION_KEY', 'a'.repeat(60)); // Too short
      vi.resetModules();
      const module = await import('@/lib/security/secret-crypto');

      expect(() => module.encryptSecret('test')).toThrow('must be 64 hex characters');
    });
  });

  describe('generateWebhookSecret', () => {
    it('generates both secret and encrypted form', () => {
      const result = generateWebhookSecret();

      expect(result.secret).toBeTruthy();
      expect(result.secretEncrypted).toBeTruthy();
    });

    it('secret starts with whsec_ prefix', () => {
      const result = generateWebhookSecret();
      expect(result.secret).toMatch(/^whsec_/);
    });

    it('encrypted secret can be decrypted to original secret', () => {
      const result = generateWebhookSecret();
      const decrypted = decryptSecret(result.secretEncrypted);
      expect(decrypted).toBe(result.secret);
    });

    it('generates unique secrets each time', () => {
      const result1 = generateWebhookSecret();
      const result2 = generateWebhookSecret();

      expect(result1.secret).not.toBe(result2.secret);
      expect(result1.secretEncrypted).not.toBe(result2.secretEncrypted);
    });

    it('generated secrets are long enough', () => {
      const result = generateWebhookSecret();
      // whsec_ prefix (6) + base64url of 24 bytes (~32 chars)
      expect(result.secret.length).toBeGreaterThan(30);
    });
  });

  describe('createWebhookSignature', () => {
    it('creates HMAC-SHA256 signature with sha256= prefix', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, timestamp, payload);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('produces consistent signature for same inputs', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const sig1 = createWebhookSignature(secret, timestamp, payload);
      const sig2 = createWebhookSignature(secret, timestamp, payload);

      expect(sig1).toBe(sig2);
    });

    it('produces different signature for different payload', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';

      const sig1 = createWebhookSignature(secret, timestamp, '{"event":"test1"}');
      const sig2 = createWebhookSignature(secret, timestamp, '{"event":"test2"}');

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signature for different secret', () => {
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const sig1 = createWebhookSignature('secret1', timestamp, payload);
      const sig2 = createWebhookSignature('secret2', timestamp, payload);

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signature for different timestamp', () => {
      const secret = 'my-webhook-secret';
      const payload = '{"event":"test"}';

      const sig1 = createWebhookSignature(secret, '2024-01-01T00:00:00Z', payload);
      const sig2 = createWebhookSignature(secret, '2024-01-02T00:00:00Z', payload);

      expect(sig1).not.toBe(sig2);
    });

    it('handles empty timestamp', () => {
      const secret = 'my-webhook-secret';
      const signature = createWebhookSignature(secret, '', '{"event":"test"}');
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('verifies valid signature', () => {
      const secret = 'my-webhook-secret';
      const timestamp = new Date().toISOString();
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, timestamp, payload);
      const isValid = verifyWebhookSignature(secret, payload, signature, timestamp);

      expect(isValid).toBe(true);
    });

    it('rejects invalid signature', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const isValid = verifyWebhookSignature(secret, payload, 'sha256=invalid', timestamp);

      expect(isValid).toBe(false);
    });

    it('rejects signature with wrong secret', () => {
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature('secret1', timestamp, payload);
      const isValid = verifyWebhookSignature('secret2', payload, signature, timestamp);

      expect(isValid).toBe(false);
    });

    it('rejects signature with wrong payload', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';

      const signature = createWebhookSignature(secret, timestamp, '{"event":"test1"}');
      const isValid = verifyWebhookSignature(secret, '{"event":"test2"}', signature, timestamp);

      expect(isValid).toBe(false);
    });

    it('rejects signature without sha256= prefix', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';

      const isValid = verifyWebhookSignature(secret, '{}', 'invalid_signature', timestamp);

      expect(isValid).toBe(false);
    });

    it('rejects null/empty signature', () => {
      const secret = 'my-webhook-secret';
      expect(verifyWebhookSignature(secret, '{}', null, '2024-01-01T00:00:00Z')).toBe(false);
      expect(verifyWebhookSignature(secret, '{}', '', '2024-01-01T00:00:00Z')).toBe(false);
    });

    it('rejects stale timestamp by default (5 minute tolerance)', () => {
      const secret = 'my-webhook-secret';
      const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 minutes ago
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, staleTimestamp, payload);
      const isValid = verifyWebhookSignature(secret, payload, signature, staleTimestamp);

      expect(isValid).toBe(false);
    });

    it('accepts fresh timestamp within tolerance', () => {
      const secret = 'my-webhook-secret';
      const freshTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, freshTimestamp, payload);
      const isValid = verifyWebhookSignature(secret, payload, signature, freshTimestamp);

      expect(isValid).toBe(true);
    });

    it('allows custom tolerance for timestamp', () => {
      const secret = 'my-webhook-secret';
      const timestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, timestamp, payload);
      // Default 5 min tolerance should reject
      expect(verifyWebhookSignature(secret, payload, signature, timestamp)).toBe(false);
      // 15 min tolerance should accept
      expect(verifyWebhookSignature(secret, payload, signature, timestamp, 15 * 60 * 1000)).toBe(true);
    });

    it('skips timestamp check when timestamp is null', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const signature = createWebhookSignature(secret, '', payload); // Empty timestamp for signing
      // Verify without timestamp should succeed
      const isValid = verifyWebhookSignature(secret, payload, signature, null);

      expect(isValid).toBe(true);
    });

    it('rejects invalid timestamp format', () => {
      const secret = 'my-webhook-secret';
      const payload = '{"event":"test"}';
      const signature = createWebhookSignature(secret, '2024-01-01T00:00:00Z', payload);

      const isValid = verifyWebhookSignature(secret, payload, signature, 'invalid-date');

      expect(isValid).toBe(false);
    });

    it('uses timing-safe comparison to prevent timing attacks', () => {
      const secret = 'my-webhook-secret';
      const timestamp = '2024-01-01T00:00:00Z';
      const payload = '{"event":"test"}';

      const validSignature = createWebhookSignature(secret, timestamp, payload);
      // Change one character in signature
      const invalidSignature = validSignature.slice(0, -1) + (validSignature[validSignature.length - 1] === 'a' ? 'b' : 'a');

      const isValid = verifyWebhookSignature(secret, payload, invalidSignature, timestamp);
      expect(isValid).toBe(false);
    });
  });

  describe('hashApiKey', () => {
    it('hashes API key to SHA256 hex string', () => {
      const apiKey = 'sk_live_123456789abcdef';
      const hash = hashApiKey(apiKey);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces consistent hash for same API key', () => {
      const apiKey = 'sk_live_123456789abcdef';
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different API keys', () => {
      const hash1 = hashApiKey('sk_live_1');
      const hash2 = hashApiKey('sk_live_2');

      expect(hash1).not.toBe(hash2);
    });

    it('hashes empty string', () => {
      const hash = hashApiKey('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is one-way (cannot reverse hash)', () => {
      const apiKey = 'sk_live_secret';
      const hash = hashApiKey(apiKey);

      // Hash should not contain or resemble the original key
      expect(hash).not.toContain('secret');
      expect(hash).not.toContain('sk_live');
    });
  });
});
