/**
 * Mock Stripe Connector
 * Simulator for testing Stripe OAuth, webhook setup, API key management
 */

import { ConnectorSimulator, type SimulatorConfig } from './connector-simulator';
import type { Connector, ConnectorCredential, ProvisionInput, ProvisionOutput, OAuthMetadata, HealthResult } from '@/lib/dsg/setup/connectors/interface';

export class MockStripeConnector extends ConnectorSimulator implements Connector {
  readonly id = 'stripe';
  readonly manifest = {
    id: 'stripe',
    name: 'Stripe',
    kind: 'oauth',
    permissions: ['read_write'],
    provides: {
      api_key: 'sk_test_xxxxx',
      webhook_endpoint: 'https://api.stripe.com/v1/webhook_endpoints/we_xxxxx',
    },
    requires: {
      webhook_url: 'from_vercel_deployment',
    },
  };

  constructor(config?: Partial<SimulatorConfig>) {
    super({
      connector_id: 'stripe',
      connector_name: 'Stripe',
      healthCheckLatencyMs: 150,
      provisionLatencyMs: 400,
      ...config,
    });
  }

  /**
   * Get OAuth metadata
   */
  getOAuthMetadata(mode: 'sandbox' | 'live'): OAuthMetadata {
    return {
      auth_url:
        mode === 'sandbox'
          ? 'https://connect.stripe.com/oauth/authorize?client_id=ca_test&scope=read_write'
          : 'https://connect.stripe.com/oauth/authorize?client_id=ca_live&scope=read_write',
      token_url: 'https://connect.stripe.com/oauth/token',
      scope: 'read_write',
      supported_modes: ['sandbox', 'live'],
    };
  }

  /**
   * Exchange OAuth code for token
   */
  async exchangeCode(code: string, state: string): Promise<ConnectorCredential> {
    await this.delay(300);

    if (code.startsWith('error_')) {
      throw new Error(`OAuth failed: ${code}`);
    }

    return {
      connector_id: 'stripe',
      token_type: 'bearer',
      token: `sk_test_${code}_token`,
      scope: 'read_write',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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
   * Health check (verify API key is valid)
   */
  async health(credential: ConnectorCredential): Promise<HealthResult> {
    return this.simulateHealth(credential);
  }

  /**
   * Provision (setup webhook, create restricted key)
   */
  async provision(input: ProvisionInput): Promise<ProvisionOutput> {
    switch (input.action) {
      case 'setup_webhook':
        return this.setupWebhook(input);
      case 'create_restricted_key':
        return this.createRestrictedKey(input);
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
   * Internal: Setup webhook
   */
  private async setupWebhook(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'setup_webhook',
      params: input.params || {},
      requires: input.requires || {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        webhook_endpoint: `we_${Math.random().toString(36).substr(2, 9)}`,
        webhook_secret: `whsec_${Math.random().toString(36).substr(2, 20)}`,
      },
    };
  }

  /**
   * Internal: Create restricted API key
   */
  private async createRestrictedKey(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'create_restricted_key',
      params: input.params || {},
      requires: {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        restricted_key: `rk_test_${Math.random().toString(36).substr(2, 30)}`,
        permissions: ['read', 'write:payment_intents'],
      },
    };
  }

  /**
   * Helper: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mockStripe = new MockStripeConnector();
