import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

// Encryption for sensitive values (webhook secrets, API keys, etc.)
// Uses AES-256-GCM with a key derived from environment variable

const ENCRYPTION_KEY_ENV = 'DSG_SECRET_ENCRYPTION_KEY';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyHex = process.env[ENCRYPTION_KEY_ENV];
  if (!keyHex) {
    throw new Error(`Missing ${ENCRYPTION_KEY_ENV} environment variable. Generate with: openssl rand -hex 32`);
  }
  if (keyHex.length !== 64) {
    throw new Error(`${ENCRYPTION_KEY_ENV} must be 64 hex characters (32 bytes)`);
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64 encoded: salt + iv + ciphertext + tag
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key from password + salt using PBKDF2
  const derivedKey = createHash('sha256').update(Buffer.concat([key, salt])).digest();
  
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + ciphertext + tag
  const combined = Buffer.concat([salt, iv, ciphertext, tag]);
  return combined.toString('base64');
}

/**
 * Decrypt a secret encrypted with encryptSecret
 */
export function decryptSecret(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');
  
  if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted secret format');
  }
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - TAG_LENGTH);
  
  const derivedKey = createHash('sha256').update(Buffer.concat([key, salt])).digest();
  
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);
  
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Generate a new webhook secret and its encrypted form
 */
export function generateWebhookSecret(): { secret: string; secretEncrypted: string } {
  const secret = `whsec_${randomBytes(24).toString('base64url')}`;
  const secretEncrypted = encryptSecret(secret);
  return { secret, secretEncrypted };
}

/**
 * Verify webhook signature (HMAC-SHA256)
 */
export function verifyWebhookSignature(secret: string, payloadStr: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const providedSig = signatureHeader.slice(7);
  const expectedSig = createHash('sha256').update(secret + '|' + payloadStr).digest('hex');
  
  // Constant-time comparison
  if (providedSig.length !== expectedSig.length) return false;
  let result = 0;
  for (let i = 0; i < providedSig.length; i++) {
    result |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create webhook signature for outgoing requests
 */
export function createWebhookSignature(secret: string, payloadStr: string): string {
  return `sha256=${createHash('sha256').update(secret + '|' + payloadStr).digest('hex')}`;
}

/**
 * Hash an API key for storage (one-way, for authentication)
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}