import { createHash } from 'crypto';
import { encryptSecret, decryptSecret } from '@/lib/security/secret-crypto';
import type { ConnectorCredential, CredentialSummary } from '../types';

export interface StoredCredential extends ConnectorCredential {
  id: string;
  created_at: Date;
  revoked_at?: Date;
}

/**
 * Multi-type credential vault extension.
 * Extends lib/security/secret-crypto.ts to support OAuth tokens, SSH keys, certificates, etc.
 */
class MultiCredentialStore {
  /**
   * Store a credential with encryption and fingerprint
   */
  async storeConnectorCredential(
    orgId: string,
    connectorId: string,
    credential: ConnectorCredential,
  ): Promise<{ credential_id: string; fingerprint: string }> {
    const credentialId = crypto.randomUUID();
    const fingerprint = this.createFingerprint(credential.encrypted_token);

    // In production, this would insert into dsg_connector_credentials table
    // For now, return the IDs for the caller to persist
    console.debug(`[vault] Storing credential for ${connectorId} in org ${orgId}`);

    return {
      credential_id: credentialId,
      fingerprint,
    };
  }

  /**
   * Retrieve a decrypted credential (with audit log)
   */
  async getConnectorCredential(
    orgId: string,
    connectorId: string,
  ): Promise<ConnectorCredential | null> {
    // In production, this would query dsg_connector_credentials table
    // Check org isolation, RLS policies, etc.
    console.debug(`[vault] Retrieving credential for ${connectorId} in org ${orgId}`);
    return null;
  }

  /**
   * List all credentials for an org (with health status and fingerprints)
   */
  async listConnectorCredentials(orgId: string): Promise<CredentialSummary[]> {
    // In production, this would query dsg_connector_credentials with RLS
    console.debug(`[vault] Listing credentials for org ${orgId}`);
    return [];
  }

  /**
   * Revoke a credential (mark as revoked, don't delete)
   */
  async revokeConnectorCredential(orgId: string, credentialId: string): Promise<void> {
    // In production, this would UPDATE dsg_connector_credentials SET revoked_at = now()
    console.debug(`[vault] Revoking credential ${credentialId} in org ${orgId}`);
  }

  /**
   * Rotate a credential (e.g., OAuth refresh token)
   */
  async rotateConnectorCredential(
    orgId: string,
    credentialId: string,
    newCredential: ConnectorCredential,
  ): Promise<void> {
    // In production, this would:
    // 1. Store new credential with rotation timestamp
    // 2. Mark old credential as rotated
    // 3. Audit trail entry
    console.debug(`[vault] Rotating credential ${credentialId} in org ${orgId}`);
  }

  /**
   * Check credential health (expiry, revocation, connectivity)
   */
  async checkCredentialHealth(credential: ConnectorCredential): Promise<{
    status: 'healthy' | 'unhealthy' | 'expired';
    detail?: string;
  }> {
    if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
      return { status: 'expired', detail: 'Credential has expired' };
    }

    // In production, call connector.health(credential)
    return { status: 'healthy' };
  }

  /**
   * Create a fingerprint (SHA256 hash) for audit trail
   * Never store the actual token/key in audit logs
   */
  private createFingerprint(encryptedToken: string): string {
    return createHash('sha256').update(encryptedToken).digest('hex');
  }

  /**
   * Encrypt a credential value using existing secret-crypto.ts
   */
  encryptCredentialValue(plaintext: string): string {
    return encryptSecret(plaintext);
  }

  /**
   * Decrypt a credential value
   */
  decryptCredentialValue(encryptedBase64: string): string {
    return decryptSecret(encryptedBase64);
  }
}

export const multiCredentialStore = new MultiCredentialStore();
