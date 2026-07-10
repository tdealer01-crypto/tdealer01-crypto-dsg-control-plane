/**
 * Mock GitHub Connector
 * Simulator for testing GitHub OAuth, repository creation, webhook setup
 */

import { ConnectorSimulator, type SimulatorConfig } from './connector-simulator';
import type { Connector, ConnectorCredential, ProvisionInput, ProvisionOutput, OAuthMetadata, HealthResult } from '@/lib/dsg/setup/connectors/interface';

export class MockGitHubConnector extends ConnectorSimulator implements Connector {
  readonly id = 'github';
  readonly manifest = {
    id: 'github',
    name: 'GitHub',
    kind: 'oauth',
    permissions: ['repo', 'workflow'],
    provides: {
      repository_url: 'https://github.com/org/repo',
      webhook_secret: 'whsec_xxxxx',
    },
    requires: {},
  };

  constructor(config?: Partial<SimulatorConfig>) {
    super({
      connector_id: 'github',
      connector_name: 'GitHub',
      healthCheckLatencyMs: 50,
      provisionLatencyMs: 300,
      ...config,
    });
  }

  /**
   * Get OAuth metadata for GitHub
   */
  getOAuthMetadata(mode: 'sandbox' | 'live'): OAuthMetadata {
    return {
      auth_url:
        mode === 'sandbox'
          ? 'https://github.com/login/oauth/authorize?client_id=test_sandbox&scope=repo,workflow'
          : 'https://github.com/login/oauth/authorize?client_id=test_live&scope=repo,workflow',
      token_url:
        mode === 'sandbox'
          ? 'https://github.com/login/oauth/access_token'
          : 'https://github.com/login/oauth/access_token',
      scope: 'repo,workflow',
      supported_modes: ['sandbox', 'live'],
    };
  }

  /**
   * Exchange OAuth code for token
   */
  async exchangeCode(code: string, state: string): Promise<ConnectorCredential> {
    // Simulate OAuth exchange
    await this.delay(200);

    if (code.startsWith('error_')) {
      throw new Error(`OAuth failed: ${code}`);
    }

    return {
      connector_id: 'github',
      token_type: 'bearer',
      token: `ghs_${code}_token`,
      scope: 'repo,workflow',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  }

  /**
   * Validate credential
   */
  async validateCredential(credential: ConnectorCredential): Promise<boolean> {
    const health = await this.health(credential);
    return health.ok;
  }

  /**
   * Health check
   */
  async health(credential: ConnectorCredential): Promise<HealthResult> {
    return this.simulateHealth(credential);
  }

  /**
   * Provision (create repository + webhook)
   */
  async provision(input: ProvisionInput): Promise<ProvisionOutput> {
    switch (input.action) {
      case 'create_repository':
        return this.createRepository(input);
      case 'create_webhook':
        return this.createWebhook(input);
      default:
        throw new Error(`Unsupported action: ${input.action}`);
    }
  }

  /**
   * Rollback
   */
  async rollback(execution_id: string): Promise<void> {
    return this.simulateRollback(execution_id);
  }

  /**
   * Internal: Create repository
   */
  private async createRepository(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'create_repository',
      params: input.params || {},
      requires: {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        repository_url: `https://github.com/test-org/${input.params?.repo_name || 'test-repo'}`,
      },
    };
  }

  /**
   * Internal: Create webhook
   */
  private async createWebhook(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'create_webhook',
      params: input.params || {},
      requires: {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        webhook_secret: 'whsec_' + this.secureRandomHex(9),
      },
    };
  }

  /**
   * Helper: securely generate random hex string
   */
  private secureRandomHex(length: number): string {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    if (typeof global !== 'undefined' && global.crypto) {
      global.crypto.getRandomValues(bytes);
    } else {
      const crypto = require('crypto');
      crypto.randomFillSync(bytes);
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }

  /**
   * Helper: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mockGitHub = new MockGitHubConnector();
