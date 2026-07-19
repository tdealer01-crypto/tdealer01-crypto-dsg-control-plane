/**
 * Secrets Vault Integration
 *
 * Encrypts/decrypts secrets using Supabase pgcrypto or Supabase Vault.
 * Used for storing encrypted credentials (API keys, webhook secrets, SSO client secrets).
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface VaultEncryptResult {
  ok: boolean;
  encrypted?: string;
  error?: string;
}

export interface VaultDecryptResult {
  ok: boolean;
  decrypted?: string;
  error?: string;
}

const ENCRYPTION_KEY_ID = 'dsg-enterprise-key';

/**
 * Encrypt a secret using Supabase pgcrypto
 * @param secret The secret to encrypt (string)
 * @param keyId Encryption key ID (optional, uses default if not provided)
 * @returns VaultEncryptResult with encrypted secret
 */
export async function encryptSecret(secret: string, keyId: string = ENCRYPTION_KEY_ID): Promise<VaultEncryptResult> {
  try {
    if (!secret) {
      return { ok: false, error: 'Secret cannot be empty' };
    }

    const supabase = getSupabaseAdmin() as any;

    // Use Supabase pgcrypto: PGP_SYM_ENCRYPT(secret, key)
    const result = await supabase.rpc('pgp_sym_encrypt', {
      secret_text: secret,
      secret_key: process.env.DSG_ENCRYPTION_KEY || keyId,
    });

    if (result.error) {
      console.error('[vault-encrypt] Error:', result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true, encrypted: result.data };
  } catch (error) {
    console.error('[vault-encrypt] Exception:', error);
    return { ok: false, error: `Encryption failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Decrypt a secret using Supabase pgcrypto
 * @param encryptedSecret The encrypted secret (string)
 * @param keyId Encryption key ID (optional, uses default if not provided)
 * @returns VaultDecryptResult with decrypted secret
 */
export async function decryptSecret(
  encryptedSecret: string,
  keyId: string = ENCRYPTION_KEY_ID,
): Promise<VaultDecryptResult> {
  try {
    if (!encryptedSecret) {
      return { ok: false, error: 'Encrypted secret cannot be empty' };
    }

    const supabase = getSupabaseAdmin() as any;

    // Use Supabase pgcrypto: PGP_SYM_DECRYPT(encrypted, key)
    const result = await supabase.rpc('pgp_sym_decrypt', {
      secret_text: encryptedSecret,
      secret_key: process.env.DSG_ENCRYPTION_KEY || keyId,
    });

    if (result.error) {
      console.error('[vault-decrypt] Error:', result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true, decrypted: result.data };
  } catch (error) {
    console.error('[vault-decrypt] Exception:', error);
    return { ok: false, error: `Decryption failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Check if encryption key is available
 * @returns boolean indicating if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.DSG_ENCRYPTION_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Store an encrypted secret in a table
 * @param table Table name
 * @param id Record ID
 * @param secretField Field name for encrypted secret
 * @param secret The secret to encrypt and store
 * @returns Result of the operation
 */
export async function storeEncryptedSecret(
  table: string,
  id: string,
  secretField: string,
  secret: string,
): Promise<VaultEncryptResult> {
  try {
    if (!secret) {
      return { ok: false, error: 'Secret cannot be empty' };
    }

    const encrypted = await encryptSecret(secret);
    if (!encrypted.ok) {
      return encrypted;
    }

    const supabase = getSupabaseAdmin() as any;

    const updateData: Record<string, string> = {};
    updateData[secretField] = encrypted.encrypted!;

    const result = await supabase.from(table).update(updateData).eq('id', id);

    if (result.error) {
      console.error('[vault-store] Error:', result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('[vault-store] Exception:', error);
    return { ok: false, error: `Failed to store secret: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Retrieve and decrypt a secret from a table
 * @param table Table name
 * @param id Record ID
 * @param secretField Field name for encrypted secret
 * @returns Decrypted secret
 */
export async function retrieveEncryptedSecret(
  table: string,
  id: string,
  secretField: string,
): Promise<VaultDecryptResult> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const selectData = await supabase.from(table).select(secretField).eq('id', id).single();

    if (selectData.error) {
      console.error('[vault-retrieve] Error:', selectData.error);
      return { ok: false, error: selectData.error.message };
    }

    const encryptedSecret = selectData.data?.[secretField];
    if (!encryptedSecret) {
      return { ok: false, error: 'Secret not found' };
    }

    return await decryptSecret(encryptedSecret);
  } catch (error) {
    console.error('[vault-retrieve] Exception:', error);
    return { ok: false, error: `Failed to retrieve secret: ${String(error).slice(0, 100)}` };
  }
}
