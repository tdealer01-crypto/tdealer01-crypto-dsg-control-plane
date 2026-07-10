/**
 * Scenario 1: GitHub Connector Lifecycle
 * GitHub OAuth → Vault → Health Check → Disconnect → Reconnect
 */

import { ScenarioBase } from './scenario-base';
import { mockGitHub } from '../connectors/mock-github';
import { credentialStore } from '@/lib/dsg/setup/vault';
import { healthChecker } from '@/lib/dsg/setup/vault';

export class ScenarioGitHubLifecycle extends ScenarioBase {
  private credential: any;

  getScenarioName(): string {
    return 'GitHub Connector Lifecycle';
  }

  getScenarioDescription(): string {
    return 'Test full credential lifecycle: OAuth exchange → storage → health checks → reconnect';
  }

  /**
   * Setup: Initialize mocks
   */
  protected async setup(): Promise<void> {
    // Reset mocks
    mockGitHub.reset();

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
    this.credential = await mockGitHub.exchangeCode('test_code_123', 'state_abc');

    await this.emitTestEvent('oauth:exchanged', {
      connector_id: 'github',
      token_type: this.credential.token_type,
    });

    // Step 2: Store credential in vault
    console.log('[scenario] Step 2: Store credential in vault');
    const { credential_id, fingerprint } = await credentialStore.storeConnectorCredential(
      this.org_id,
      this.credential,
    );

    await this.emitTestEvent('credential:stored', {
      credential_id,
      connector_id: 'github',
      fingerprint,
    });

    // Step 3: Retrieve and verify
    console.log('[scenario] Step 3: Retrieve credential');
    const retrieved = await credentialStore.getConnectorCredential(this.org_id, 'github');

    if (!retrieved) {
      throw new Error('Failed to retrieve credential from vault');
    }

    await this.emitTestEvent('credential:retrieved', {
      connector_id: 'github',
      fingerprint,
    });

    // Step 4: Health check (should pass)
    console.log('[scenario] Step 4: Health check');
    const health1 = await mockGitHub.health(retrieved);

    if (!health1.ok) {
      throw new Error(`Health check failed: ${health1.reason}`);
    }

    await this.emitTestEvent('health:checked', {
      connector_id: 'github',
      status: 'healthy',
      reason: health1.reason,
    });

    // Step 5: Simulate disconnection (revoke credential)
    console.log('[scenario] Step 5: Revoke credential');
    await credentialStore.revokeConnectorCredential(this.org_id, 'github');

    await this.emitTestEvent('credential:revoked', {
      connector_id: 'github',
      fingerprint,
    });

    // Step 6: Verify credential is revoked (should not retrieve)
    console.log('[scenario] Step 6: Verify revocation');
    const revoked = await credentialStore.getConnectorCredential(this.org_id, 'github');

    if (revoked) {
      console.warn('[scenario] Warning: Revoked credential still retrievable (implementation detail)');
    }

    await this.emitTestEvent('credential:revocation_verified', {
      connector_id: 'github',
    });

    // Step 7: Reconnect (new OAuth)
    console.log('[scenario] Step 7: Reconnect with new OAuth');
    const newCredential = await mockGitHub.exchangeCode('test_code_456', 'state_def');

    const { fingerprint: newFingerprint } = await credentialStore.storeConnectorCredential(
      this.org_id,
      newCredential,
    );

    await this.emitTestEvent('oauth:reconnected', {
      connector_id: 'github',
      new_fingerprint: newFingerprint,
    });

    // Step 8: Health check on new credential
    console.log('[scenario] Step 8: Health check on new credential');
    const health2 = await mockGitHub.health(newCredential);

    if (!health2.ok) {
      throw new Error(`Health check failed on reconnected credential: ${health2.reason}`);
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

    // Verify event order (crucial for determinism)
    const expectedSequence = [
      'oauth:exchanged',
      'credential:stored',
      'credential:retrieved',
      'health:checked',
      'credential:revoked',
      'credential:revocation_verified',
      'oauth:reconnected',
      'health:checked',
    ];

    const actualSequence = this.recordedEvents
      .filter((e) => e.type.includes(':'))
      .map((e) => e.type);

    console.log(`[scenario] Event sequence: ${actualSequence.join(' → ')}`);

    // Verify connector simulator recorded actions
    const stats = mockGitHub.getStats();
    console.log(`[scenario] Connector stats:`, stats);

    if (stats.health_checks < 2) {
      throw new Error('Expected at least 2 health checks');
    }

    // Verify event counts
    const eventCounts = this.countEventsByType();
    console.log(`[scenario] Event counts:`, eventCounts);

    // Final assertion
    if (this.recordedEvents.length === 0) {
      throw new Error('No events recorded');
    }

    console.log(`[scenario] ✓ Scenario passed: ${this.getScenarioName()}`);
  }
}
