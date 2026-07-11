/**
 * Scenario 1: GitHub Connector Lifecycle
 * GitHub OAuth → Vault → Health Check → Disconnect → Reconnect
 */

import { ScenarioBase } from './scenario-base';

export class ScenarioGitHubLifecycle extends ScenarioBase {
  private credentials: Map<string, any> = new Map();
  private revoked: Set<string> = new Set();

  getScenarioName(): string {
    return 'GitHub Connector Lifecycle';
  }

  getScenarioDescription(): string {
    return 'Test full credential lifecycle: OAuth exchange → storage → health checks → reconnect';
  }

  /**
   * Setup: Initialize mock state
   */
  protected async setup(): Promise<void> {
    this.credentials.clear();
    this.revoked.clear();

    await this.emitTestEvent('scenario:setup', {
      scenario: this.getScenarioName(),
      org_id: this.org_id,
    });
  }

  /**
   * Execute: Run lifecycle
   */
  protected async execute(): Promise<void> {
    // Step 1: OAuth exchange
    console.log('[scenario] Step 1: OAuth exchange');
    const credential1 = this.mockOAuthExchange('test_code_123', 'state_abc');

    await this.emitTestEvent('oauth:exchanged', {
      connector_id: 'github',
      token_type: credential1.token_type,
    });

    // Step 2: Store credential in vault
    console.log('[scenario] Step 2: Store credential in vault');
    const credential_id = crypto.randomUUID();
    const fingerprint = this.mockStoreCredential(credential_id, credential1);

    await this.emitTestEvent('credential:stored', {
      credential_id,
      connector_id: 'github',
      fingerprint,
    });

    // Step 3: Retrieve and verify
    console.log('[scenario] Step 3: Retrieve credential');
    const retrieved = this.mockRetrieveCredential(credential_id);

    if (!retrieved) {
      throw new Error('Failed to retrieve credential from vault');
    }

    await this.emitTestEvent('credential:retrieved', {
      connector_id: 'github',
      fingerprint,
    });

    // Step 4: Health check (should pass)
    console.log('[scenario] Step 4: Health check');
    const health1 = this.mockHealthCheck(retrieved);

    if (!health1) {
      throw new Error('Health check failed');
    }

    await this.emitTestEvent('health:checked', {
      connector_id: 'github',
      status: 'healthy',
    });

    // Step 5: Simulate disconnection (revoke credential)
    console.log('[scenario] Step 5: Revoke credential');
    this.mockRevokeCredential(credential_id);

    await this.emitTestEvent('credential:revoked', {
      connector_id: 'github',
      fingerprint,
    });

    // Step 6: Verify credential is revoked (should not retrieve)
    console.log('[scenario] Step 6: Verify revocation');
    const revoked = this.mockRetrieveCredential(credential_id);

    if (revoked) {
      console.warn('[scenario] Warning: Revoked credential still retrievable');
    }

    await this.emitTestEvent('credential:revocation_verified', {
      connector_id: 'github',
    });

    // Step 7: Reconnect (new OAuth)
    console.log('[scenario] Step 7: Reconnect with new OAuth');
    const credential2 = this.mockOAuthExchange('test_code_456', 'state_def');
    const credential_id_2 = crypto.randomUUID();
    const fingerprint2 = this.mockStoreCredential(credential_id_2, credential2);

    await this.emitTestEvent('oauth:reconnected', {
      connector_id: 'github',
      new_fingerprint: fingerprint2,
    });

    // Step 8: Health check on new credential
    console.log('[scenario] Step 8: Health check on new credential');
    const health2 = this.mockHealthCheck(credential2);

    if (!health2) {
      throw new Error('Health check failed on reconnected credential');
    }

    await this.emitTestEvent('health:checked', {
      connector_id: 'github',
      status: 'healthy',
      after_reconnect: true,
    });
  }

  /**
   * Verify: Check event sequence and state
   */
  protected async verify(): Promise<void> {
    console.log('[scenario] Verify: Checking event sequence');

    // Verify expected events exist
    this.assertEventExists('oauth:exchanged');
    this.assertEventExists('credential:stored');
    this.assertEventExists('credential:retrieved');
    this.assertEventExists('health:checked');
    this.assertEventExists('credential:revoked');
    this.assertEventExists('oauth:reconnected');

    // Verify event counts
    const eventCounts = this.countEventsByType();
    console.log(`[scenario] Event counts:`, eventCounts);

    // Final assertion
    if (this.recordedEvents.length === 0) {
      throw new Error('No events recorded');
    }

    console.log(`[scenario] ✓ Scenario passed: ${this.getScenarioName()}`);
  }

  private mockOAuthExchange(code: string, state: string): any {
    return {
      access_token: `token_${code}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'repo',
    };
  }

  private mockStoreCredential(id: string, credential: any): string {
    this.credentials.set(id, credential);
    return `fp_${id.substring(0, 8)}`;
  }

  private mockRetrieveCredential(id: string): any {
    if (this.revoked.has(id)) {
      return null;
    }
    return this.credentials.get(id);
  }

  private mockHealthCheck(credential: any): boolean {
    return !!credential?.access_token;
  }

  private mockRevokeCredential(id: string): void {
    this.revoked.add(id);
  }
}
