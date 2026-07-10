/**
 * Mock Vercel Connector
 * Simulator for testing Vercel OAuth, project creation, deployment, environment variables
 */

import { ConnectorSimulator, type SimulatorConfig } from './connector-simulator';
import type { Connector, ConnectorCredential, ProvisionInput, ProvisionOutput, OAuthMetadata, HealthResult } from '@/lib/dsg/setup/connectors/interface';

export class MockVercelConnector extends ConnectorSimulator implements Connector {
  readonly id = 'vercel';
  readonly manifest = {
    id: 'vercel',
    name: 'Vercel',
    kind: 'oauth',
    permissions: ['read_write'],
    provides: {
      deployment_url: 'https://project-name.vercel.app',
      api_token: 'vc_xxxxx',
    },
    requires: {
      github_repository: 'from_github_creation',
    },
  };

  constructor(config?: Partial<SimulatorConfig>) {
    super({
      connector_id: 'vercel',
      connector_name: 'Vercel',
      healthCheckLatencyMs: 100,
      provisionLatencyMs: 600, // Vercel deployments are slower
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
          ? 'https://vercel.com/oauth/authorize?client_id=test_sandbox'
          : 'https://vercel.com/oauth/authorize?client_id=test_live',
      token_url: 'https://api.vercel.com/v1/oauth/token',
      scope: 'read_write',
      supported_modes: ['sandbox', 'live'],
    };
  }

  /**
   * Exchange OAuth code for token
   */
  async exchangeCode(code: string, state: string): Promise<ConnectorCredential> {
    await this.delay(250);

    if (code.startsWith('error_')) {
      throw new Error(`OAuth failed: ${code}`);
    }

    return {
      connector_id: 'vercel',
      token_type: 'bearer',
      token: `vc_${code}_token`,
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
   * Health check
   */
  async health(credential: ConnectorCredential): Promise<HealthResult> {
    return this.simulateHealth(credential);
  }

  /**
   * Provision (import GitHub repo, create project, set env vars)
   */
  async provision(input: ProvisionInput): Promise<ProvisionOutput> {
    switch (input.action) {
      case 'import_github_repository':
        return this.importGitHubRepository(input);
      case 'create_project':
        return this.createProject(input);
      case 'set_environment_variables':
        return this.setEnvironmentVariables(input);
      case 'trigger_deployment':
        return this.triggerDeployment(input);
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
   * Internal: Import GitHub repository
   */
  private async importGitHubRepository(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'import_github_repository',
      params: input.params || {},
      requires: input.requires || {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        project_id: `prj_${Math.random().toString(36).substr(2, 15)}`,
        status: 'imported',
      },
    };
  }

  /**
   * Internal: Create project
   */
  private async createProject(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'create_project',
      params: input.params || {},
      requires: {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        project_id: `prj_${Math.random().toString(36).substr(2, 15)}`,
        deployment_url: `https://${input.params?.project_name || 'test-project'}.vercel.app`,
      },
    };
  }

  /**
   * Internal: Set environment variables
   */
  private async setEnvironmentVariables(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'set_environment_variables',
      params: input.params || {},
      requires: {},
    });

    const envVars = input.params?.variables as Record<string, string> | undefined;
    return {
      ...result,
      output: {
        ...result.output,
        variables_set: Object.keys(envVars || {}).length,
      },
    };
  }

  /**
   * Internal: Trigger deployment
   */
  private async triggerDeployment(input: ProvisionInput): Promise<ProvisionOutput> {
    const result = await this.simulateProvision({
      action: 'trigger_deployment',
      params: input.params || {},
      requires: input.requires || {},
    });

    return {
      ...result,
      output: {
        ...result.output,
        deployment_id: `dpl_${Math.random().toString(36).substr(2, 20)}`,
        status: 'queued',
        url: `https://${input.params?.project_name || 'test-project'}.vercel.app`,
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

export const mockVercel = new MockVercelConnector();
