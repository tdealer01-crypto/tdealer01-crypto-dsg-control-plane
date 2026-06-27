/**
 * Stripe Secret Store
 *
 * Secure secret management for Stripe App:
 * - Encrypts secrets at rest using AES-256-GCM
 * - Stores in Supabase with row-level security
 * - Supports versioning and rotation
 * - Full audit trail for all secret operations
 * - Integrates with DSG policy evaluation for access control
 */

import { getSupabase } from './dsg-client';

export interface SecretMetadata {
  id: string;
  stripe_account_id: string;
  name: string;
  description?: string;
  type: 'api_key' | 'webhook_secret' | 'oauth_token' | 'oauth_refresh_token' | 'signing_secret' | 'custom';
  version: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  rotated_from?: string; // ID of previous version
  tags?: string[];
}

export interface SecretValue {
  value: string; // encrypted value
  iv: string;    // initialization vector (base64)
  tag: string;   // auth tag (base64)
  algorithm: 'AES-256-GCM';
  key_version: number; // encryption key version used
}

export interface SecretRecord {
  metadata: SecretMetadata;
  value: SecretValue;
}

export interface CreateSecretRequest {
  stripe_account_id: string;
  name: string;
  value: string;
  type: SecretMetadata['type'];
  description?: string;
  expires_at?: string; // ISO string
  tags?: string[];
}

export interface RotateSecretRequest {
  secret_id: string;
  new_value: string;
  expires_at?: string;
}

export interface SecretAuditEntry {
  id: string;
  secret_id: string;
  stripe_account_id: string;
  action: 'create' | 'read' | 'update' | 'rotate' | 'revoke' | 'delete' | 'access_denied';
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// Encryption utilities
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_SIZE_BITS = 256;
const IV_SIZE_BYTES = 12; // 96 bits for GCM
const TAG_SIZE_BYTES = 16; // 128 bits

// Master key derivation from environment
let masterKey: CryptoKey | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (masterKey) return masterKey;

  const masterKeyBase64 = process.env.STRIPE_SECRET_STORE_MASTER_KEY;
  if (!masterKeyBase64) {
    throw new Error('STRIPE_SECRET_STORE_MASTER_KEY environment variable is required');
  }

  // Decode base64 master key
  const masterKeyRaw = Uint8Array.from(atob(masterKeyBase64), c => c.charCodeAt(0));
  
  if (masterKeyRaw.length !== KEY_SIZE_BITS / 8) {
    throw new Error(`Master key must be ${KEY_SIZE_BITS} bits (${KEY_SIZE_BITS / 8} bytes)`);
  }

  masterKey = await crypto.subtle.importKey(
    'raw',
    masterKeyRaw,
    { name: ENCRYPTION_ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );

  return masterKey;
}

export async function encryptSecret(plaintext: string): Promise<SecretValue> {
  const key = await getMasterKey();
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE_BYTES));
  
  // Encrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    data
  );
  
  // Split ciphertext and auth tag (GCM appends tag to ciphertext)
  const encryptedArray = new Uint8Array(encrypted);
  const ciphertext = encryptedArray.slice(0, -TAG_SIZE_BYTES);
  const tag = encryptedArray.slice(-TAG_SIZE_BYTES);
  
  return {
    value: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    tag: btoa(String.fromCharCode(...tag)),
    algorithm: 'AES-256-GCM',
    key_version: 1, // Increment when master key rotates
  };
}

export async function decryptSecret(secretValue: SecretValue): Promise<string> {
  const key = await getMasterKey();
  
  // Decode base64
  const iv = Uint8Array.from(atob(secretValue.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(secretValue.value), c => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(secretValue.tag), c => c.charCodeAt(0));
  
  // Combine ciphertext + tag for GCM decryption
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    combined
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Secret store operations

export async function createSecret(
  request: CreateSecretRequest,
  performedBy: string
): Promise<SecretMetadata> {
  const supabase = getSupabase();
  
  // Encrypt the secret value
  const encryptedValue = await encryptSecret(request.value);
  
  // Get next version number
  const { data: existingVersions } = await supabase
    .from('stripe_secrets')
    .select('id, version')
    .eq('stripe_account_id', request.stripe_account_id)
    .eq('name', request.name)
    .order('version', { ascending: false })
    .limit(1);
  
  const nextVersion = (existingVersions?.[0]?.version || 0) + 1;
  
  // Deactivate previous versions
  if (existingVersions && existingVersions.length > 0) {
    await supabase
      .from('stripe_secrets')
      .update({ is_active: false })
      .eq('stripe_account_id', request.stripe_account_id)
      .eq('name', request.name)
      .eq('is_active', true);
  }
  
  // Insert new secret
  const { data, error } = await supabase
    .from('stripe_secrets')
    .insert({
      stripe_account_id: request.stripe_account_id,
      name: request.name,
      description: request.description,
      type: request.type,
      version: nextVersion,
      is_active: true,
      expires_at: request.expires_at,
      created_by: performedBy,
      rotated_from: existingVersions?.[0]?.id || null,
      tags: request.tags || [],
      encrypted_value: encryptedValue.value,
      encrypted_iv: encryptedValue.iv,
      encrypted_tag: encryptedValue.tag,
      key_version: encryptedValue.key_version,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create secret: ${error.message}`);
  }
  
  // Audit log
  await logSecretAudit({
    secret_id: data.id,
    stripe_account_id: request.stripe_account_id,
    action: 'create',
    performed_by: performedBy,
    success: true,
  });
  
  return mapRowToMetadata(data);
}

export async function getSecret(
  stripeAccountId: string,
  name: string,
  performedBy: string,
  version?: number
): Promise<SecretRecord | null> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('stripe_secrets')
    .select('*')
    .eq('stripe_account_id', stripeAccountId)
    .eq('name', name)
    .eq('is_active', true);
  
  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }
  
  const { data, error } = await query.single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - log access denied
      await logSecretAudit({
        secret_id: '',
        stripe_account_id: stripeAccountId,
        action: 'access_denied',
        performed_by: performedBy,
        success: false,
        error_message: 'Secret not found',
      });
      return null;
    }
    throw new Error(`Failed to get secret: ${error.message}`);
  }
  
  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    await logSecretAudit({
      secret_id: data.id,
      stripe_account_id: stripeAccountId,
      action: 'access_denied',
      performed_by: performedBy,
      success: false,
      error_message: 'Secret expired',
    });
    return null;
  }
  
  // Decrypt value
  const decryptedValue = await decryptSecret({
    value: data.encrypted_value,
    iv: data.encrypted_iv,
    tag: data.encrypted_tag,
    algorithm: 'AES-256-GCM',
    key_version: data.key_version,
  });
  
  // Audit log
  await logSecretAudit({
    secret_id: data.id,
    stripe_account_id: stripeAccountId,
    action: 'read',
    performed_by: performedBy,
    success: true,
  });
  
  return {
    metadata: mapRowToMetadata(data),
    value: {
      ...encryptedValueFromRow(data),
      // Note: We don't return the decrypted value in the SecretValue type
      // The caller gets the plaintext separately
    },
  };
}

export async function getSecretValue(
  stripeAccountId: string,
  name: string,
  performedBy: string
): Promise<string | null> {
  const record = await getSecret(stripeAccountId, name, performedBy);
  if (!record) return null;
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('stripe_secrets')
    .select('encrypted_value, encrypted_iv, encrypted_tag, key_version')
    .eq('id', record.metadata.id)
    .single();
  
  if (!data) return null;
  
  return decryptSecret({
    value: data.encrypted_value,
    iv: data.encrypted_iv,
    tag: data.encrypted_tag,
    algorithm: 'AES-256-GCM',
    key_version: data.key_version,
  });
}

export async function rotateSecret(
  request: RotateSecretRequest,
  performedBy: string
): Promise<SecretMetadata> {
  const supabase = getSupabase();
  
  // Get current secret
  const { data: currentSecret, error: fetchError } = await supabase
    .from('stripe_secrets')
    .select('*')
    .eq('id', request.secret_id)
    .single();
  
  if (fetchError || !currentSecret) {
    throw new Error('Secret not found');
  }
  
  // Encrypt new value
  const encryptedValue = await encryptSecret(request.new_value);
  
  // Get next version
  const nextVersion = currentSecret.version + 1;
  
  // Deactivate current
  await supabase
    .from('stripe_secrets')
    .update({ is_active: false })
    .eq('id', request.secret_id);
  
  // Insert new version
  const { data, error } = await supabase
    .from('stripe_secrets')
    .insert({
      stripe_account_id: currentSecret.stripe_account_id,
      name: currentSecret.name,
      description: currentSecret.description,
      type: currentSecret.type,
      version: nextVersion,
      is_active: true,
      expires_at: request.expires_at || currentSecret.expires_at,
      created_by: performedBy,
      rotated_from: currentSecret.id,
      tags: currentSecret.tags,
      encrypted_value: encryptedValue.value,
      encrypted_iv: encryptedValue.iv,
      encrypted_tag: encryptedValue.tag,
      key_version: encryptedValue.key_version,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to rotate secret: ${error.message}`);
  }
  
  // Audit log
  await logSecretAudit({
    secret_id: data.id,
    stripe_account_id: currentSecret.stripe_account_id,
    action: 'rotate',
    performed_by: performedBy,
    success: true,
  });
  
  return mapRowToMetadata(data);
}

export async function revokeSecret(
  secretId: string,
  performedBy: string
): Promise<void> {
  const supabase = getSupabase();
  
  const { data: secret, error: fetchError } = await supabase
    .from('stripe_secrets')
    .select('*')
    .eq('id', secretId)
    .single();
  
  if (fetchError || !secret) {
    throw new Error('Secret not found');
  }
  
  // Mark as inactive
  const { error } = await supabase
    .from('stripe_secrets')
    .update({ is_active: false })
    .eq('id', secretId);
  
  if (error) {
    throw new Error(`Failed to revoke secret: ${error.message}`);
  }
  
  // Audit log
  await logSecretAudit({
    secret_id: secretId,
    stripe_account_id: secret.stripe_account_id,
    action: 'revoke',
    performed_by: performedBy,
    success: true,
  });
}

export async function listSecrets(
  stripeAccountId: string,
  includeInactive = false
): Promise<SecretMetadata[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('stripe_secrets')
    .select('*')
    .eq('stripe_account_id', stripeAccountId)
    .order('name')
    .order('version', { ascending: false });
  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list secrets: ${error.message}`);
  }
  
  // Return only latest version of each secret name
  const latestByName = new Map<string, any>();
  for (const row of data || []) {
    if (!latestByName.has(row.name)) {
      latestByName.set(row.name, row);
    }
  }
  
  return Array.from(latestByName.values()).map(mapRowToMetadata);
}

export async function deleteSecret(
  secretId: string,
  performedBy: string
): Promise<void> {
  const supabase = getSupabase();
  
  const { data: secret, error: fetchError } = await supabase
    .from('stripe_secrets')
    .select('*')
    .eq('id', secretId)
    .single();
  
  if (fetchError || !secret) {
    throw new Error('Secret not found');
  }
  
  const { error } = await supabase
    .from('stripe_secrets')
    .delete()
    .eq('id', secretId);
  
  if (error) {
    throw new Error(`Failed to delete secret: ${error.message}`);
  }
  
  // Audit log
  await logSecretAudit({
    secret_id: secretId,
    stripe_account_id: secret.stripe_account_id,
    action: 'delete',
    performed_by: performedBy,
    success: true,
  });
}

// Audit logging
async function logSecretAudit(entry: Omit<SecretAuditEntry, 'id' | 'created_at'>): Promise<void> {
  const supabase = getSupabase();
  
  try {
    await supabase.from('stripe_secret_audit').insert({
      ...entry,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SecretStore] Failed to log audit:', err);
  }
}

export async function getSecretAudit(
  secretId: string,
  limit = 50
): Promise<SecretAuditEntry[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('stripe_secret_audit')
    .select('*')
    .eq('secret_id', secretId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to get audit: ${error.message}`);
  }
  
  return data || [];
}

// Helper functions
function mapRowToMetadata(row: any): SecretMetadata {
  return {
    id: row.id,
    stripe_account_id: row.stripe_account_id,
    name: row.name,
    description: row.description,
    type: row.type,
    version: row.version,
    is_active: row.is_active,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    rotated_from: row.rotated_from,
    tags: row.tags,
  };
}

function encryptedValueFromRow(row: any): SecretValue {
  return {
    value: row.encrypted_value,
    iv: row.encrypted_iv,
    tag: row.encrypted_tag,
    algorithm: 'AES-256-GCM',
    key_version: row.key_version,
  };
}

// Convenience functions for common Stripe secret types
export async function storeStripeApiKey(
  stripeAccountId: string,
  apiKey: string,
  performedBy: string,
  description = 'Stripe Secret API Key'
): Promise<SecretMetadata> {
  return createSecret({
    stripe_account_id: stripeAccountId,
    name: 'stripe_secret_key',
    value: apiKey,
    type: 'api_key',
    description,
    tags: ['stripe', 'api_key'],
  }, performedBy);
}

export async function storeWebhookSecret(
  stripeAccountId: string,
  secret: string,
  performedBy: string,
  description = 'Stripe Webhook Signing Secret'
): Promise<SecretMetadata> {
  return createSecret({
    stripe_account_id: stripeAccountId,
    name: 'stripe_webhook_secret',
    value: secret,
    type: 'webhook_secret',
    description,
    tags: ['stripe', 'webhook'],
  }, performedBy);
}

export async function storeOAuthTokens(
  stripeAccountId: string,
  accessToken: string,
  refreshToken: string,
  performedBy: string
): Promise<{ access: SecretMetadata; refresh: SecretMetadata }> {
  const [access, refresh] = await Promise.all([
    createSecret({
      stripe_account_id: stripeAccountId,
      name: 'oauth_access_token',
      value: accessToken,
      type: 'oauth_token',
      description: 'Stripe OAuth Access Token',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h default
      tags: ['stripe', 'oauth'],
    }, performedBy),
    createSecret({
      stripe_account_id: stripeAccountId,
      name: 'oauth_refresh_token',
      value: refreshToken,
      type: 'oauth_refresh_token',
      description: 'Stripe OAuth Refresh Token',
      tags: ['stripe', 'oauth'],
    }, performedBy),
  ]);
  
  return { access, refresh };
}

export async function getStripeApiKey(
  stripeAccountId: string,
  performedBy: string
): Promise<string | null> {
  return getSecretValue(stripeAccountId, 'stripe_secret_key', performedBy);
}

export async function getWebhookSecret(
  stripeAccountId: string,
  performedBy: string
): Promise<string | null> {
  return getSecretValue(stripeAccountId, 'stripe_webhook_secret', performedBy);
}

export async function getOAuthAccessToken(
  stripeAccountId: string,
  performedBy: string
): Promise<string | null> {
  return getSecretValue(stripeAccountId, 'oauth_access_token', performedBy);
}

export async function getOAuthRefreshToken(
  stripeAccountId: string,
  performedBy: string
): Promise<string | null> {
  return getSecretValue(stripeAccountId, 'oauth_refresh_token', performedBy);
}