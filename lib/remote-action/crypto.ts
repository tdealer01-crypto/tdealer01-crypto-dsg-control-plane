import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function readKey(): Buffer {
  const raw = process.env.REMOTE_ACTION_ENDPOINT_KEY;
  if (!raw) throw new Error('REMOTE_ACTION_ENDPOINT_KEY is required');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('REMOTE_ACTION_ENDPOINT_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

export function sealRemoteEndpoint(endpoint: string): { ciphertext: string; iv: string } {
  const key = readKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(endpoint, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function openRemoteEndpoint(ciphertext: string, iv: string): string {
  const key = readKey();
  const packed = Buffer.from(ciphertext, 'base64');
  if (packed.length < 17) throw new Error('invalid remote endpoint ciphertext');
  const encrypted = packed.subarray(0, -16);
  const tag = packed.subarray(-16);
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
