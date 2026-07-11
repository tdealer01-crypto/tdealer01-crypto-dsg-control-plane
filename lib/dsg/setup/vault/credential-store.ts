/**
 * Credential Store
 * Manage encrypted credentials for connectors (AES-256-GCM)
 */

import { encryptSecret, decryptSecret } from '@/lib/security/secret-crypto';
import { canonicalHash } from '@/lib/runtime/canonical';
import { eventBus } from '../events';
import type { ConnectorCredential } from '../types';

export interface StoredCredential {
  id: string;
  org_id: string;
  connector_id: string;
  encrypted_token: string;
  token_type: 'bearer' | 'api_key' | 'pem' | 'json';
  scope?: string;
  expires_at?: Date;
  fingerprint: string;
  health_status: 'healthy' | 'unhealthy' | 'expired' | 'unknown';
  last_used_at?: Date;
  last_health_check_at?: Date;
  created_at: Date;
  revoked_at?: Date;
}

export class CredentialStore {
  private store: Map<string, StoredCredential> = new Map();

  /**
   * Store encrypted credential
   */
  async storeConnectorCredential(
    org_id: string,
    credential: ConnectorCredential,
  ): Promise<{ credential_id: string; fingerprint: string }> {
    const credential_id = crypto.randomUUID();
    const key = `${org_id}:${credential.connector_id}`;

    // Encrypt credential value
    const credentialJson = JSON.stringify(credential);
    const encrypted_token = encryptSecret(credentialJson);

    // Generate fingerprint for audit trail (never log raw token)
    const fingerprint = canonicalHash({
      connector_id: credential.connector_id,
      token_type: credential.token_type,
      scope: credential.scope,
      created_at: new Date().toISOString(),
    });

    const stored: StoredCredential = {
      id: credential_id,
      org_id,
      connector_id: credential.connector_id,
      encrypted_token,
      token_type: credential.token_type,
      scope: credential.scope,
      expires_at: credential.expires_at,
      fingerprint: fingerprint.substring(0, 16), // Short fingerprint
      health_status: 'unknown',
      created_at: new Date(),
    };

    this.store.set(key, stored);

    // Emit secret:stored event
    await eventBus.emit({
      id: crypto.randomUUID(),
      type: 'secret:stored',
      org_id,
      timestamp: new Date(),
      data: {
        secret_id: credential_id,
        connector_id: credential.connector_id,
        secret_type: 'oauth', // or api_key, ssh, etc.
        scope: credential.scope,
        fingerprint: stored.fingerprint,
        created_at: new Date(),
      },
    });

    return { credential_id, fingerprint: stored.fingerprint };
  }

  /**
   * Retrieve decrypted credential
   */
  async getConnectorCredential(
    org_id: string,
    connector_id: string,
  ): Promise<ConnectorCredential | null> {
    const key = `${org_id}:${connector_id}`;
    const stored = this.store.get(key);

    if (!stored) return null;

    // Check expiration
    if (stored.expires_at && new Date() > stored.expires_at) {
      stored.health_status = 'expired';
      return null;
    }

    // Decrypt credential
    try {
      // Decrypt the credential
      const decrypted = decryptSecret(stored.encrypted_token);

      // Emit secret:accessed event
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'secret:accessed',
        org_id,
        timestamp: new Date(),
        data: {
          secret_id: stored.id,
          connector_id,
          fingerprint: stored.fingerprint,
          action: 'read',
          accessed_at: new Date(),
        },
      });

      // Update last used
      stored.last_used_at = new Date();

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[credential-store] Failed to decrypt credential:', error);
      return null;
    }
  }

  /**
   * List credentials for org
   */
  listConnectorCredentials(org_id: string): StoredCredential[] {
    return Array.from(this.store.values()).filter(
      (c) => c.org_id === org_id && !c.revoked_at,
    );
  }

  /**
   * Revoke credential
   */
  async revokeConnectorCredential(org_id: string, connector_id: string): Promise<void> {
    const key = `${org_id}:${connector_id}`;
    const stored = this.store.get(key);

    if (stored) {
      stored.revoked_at = new Date();
      console.info(`[credential-store] Revoked credential for ${connector_id}`);
    }
  }

  /**
   * Update health status
   */
  async updateHealthStatus(
    org_id: string,
    connector_id: string,
    status: 'healthy' | 'unhealthy' | 'expired',
  ): Promise<void> {
    const key = `${org_id}:${connector_id}`;
    const stored = this.store.get(key);

    if (stored) {
      stored.health_status = status;
      stored.last_health_check_at = new Date();
    }
  }

  /**
   * Get unhealthy credentials
   */
  getUnhealthyCredentials(org_id: string): StoredCredential[] {
    return this.listConnectorCredentials(org_id).filter(
      (c) => c.health_status === 'unhealthy' || c.health_status === 'expired',
    );
  }

  /**
   * Clear store (for testing)
   */
  clearStore(): void {
    this.store.clear();
  }
}

export const credentialStore = new CredentialStore();
