/**
 * ConnectorSimulator — Simulate external connector behavior
 *
 * Supports:
 * - GitHub (repo ops, workflow triggers)
 * - Vercel (deployment, preview links)
 * - Stripe (charges, subscriptions)
 * - Fault injection (timeout, rate limit, error)
 */

import { TestHarness } from './test-harness';

export interface ConnectorConfig {
  type: 'github' | 'vercel' | 'stripe';
  orgId: string;
  delay?: number; // ms
  failureRate?: number; // 0-1
  faultType?: 'timeout' | 'rate_limit' | 'server_error' | 'auth_error';
}

export interface ConnectorResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class ConnectorSimulator {
  constructor(private harness: TestHarness) {}

  /**
   * Simulate GitHub API call
   */
  async callGitHub(
    config: ConnectorConfig,
    action: string,
    payload: Record<string, any>
  ): Promise<ConnectorResponse> {
    this.harness.recordEvent('connector_start', 'github', {
      action,
      payload,
    });

    // Apply fault injection
    if (config.faultType) {
      const response = await this.injectFault(config, 'github', action);
      this.harness.recordEvent('connector_error', 'github', {
        action,
        fault: config.faultType,
        status: response.status,
      });
      return response;
    }

    // Simulate delay
    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Simulate random failure
    if (config.failureRate && Math.random() < config.failureRate) {
      const response: ConnectorResponse = {
        ok: false,
        status: 500,
        error: 'Random failure injected',
        timestamp: new Date(),
      };
      return response;
    }

    // Success response
    const response: ConnectorResponse = {
      ok: true,
      status: 200,
      data: this.mockGitHubResponse(action, payload),
      timestamp: new Date(),
    };

    this.harness.recordEvent('connector_success', 'github', {
      action,
      status: response.status,
    });

    return response;
  }

  /**
   * Simulate Vercel API call
   */
  async callVercel(
    config: ConnectorConfig,
    action: string,
    payload: Record<string, any>
  ): Promise<ConnectorResponse> {
    this.harness.recordEvent('connector_start', 'vercel', { action, payload });

    if (config.faultType) {
      const response = await this.injectFault(config, 'vercel', action);
      this.harness.recordEvent('connector_error', 'vercel', {
        action,
        fault: config.faultType,
        status: response.status,
      });
      return response;
    }

    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    if (config.failureRate && Math.random() < config.failureRate) {
      return {
        ok: false,
        status: 500,
        error: 'Random failure injected',
        timestamp: new Date(),
      };
    }

    const response: ConnectorResponse = {
      ok: true,
      status: 200,
      data: this.mockVercelResponse(action, payload),
      timestamp: new Date(),
    };

    this.harness.recordEvent('connector_success', 'vercel', {
      action,
      status: response.status,
    });

    return response;
  }

  /**
   * Simulate Stripe API call
   */
  async callStripe(
    config: ConnectorConfig,
    action: string,
    payload: Record<string, any>
  ): Promise<ConnectorResponse> {
    this.harness.recordEvent('connector_start', 'stripe', { action, payload });

    if (config.faultType) {
      const response = await this.injectFault(config, 'stripe', action);
      this.harness.recordEvent('connector_error', 'stripe', {
        action,
        fault: config.faultType,
        status: response.status,
      });
      return response;
    }

    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    if (config.failureRate && Math.random() < config.failureRate) {
      return {
        ok: false,
        status: 500,
        error: 'Random failure injected',
        timestamp: new Date(),
      };
    }

    const response: ConnectorResponse = {
      ok: true,
      status: 200,
      data: this.mockStripeResponse(action, payload),
      timestamp: new Date(),
    };

    this.harness.recordEvent('connector_success', 'stripe', {
      action,
      status: response.status,
    });

    return response;
  }

  /**
   * Inject simulated faults
   */
  private async injectFault(
    config: ConnectorConfig,
    connector: string,
    action: string
  ): Promise<ConnectorResponse> {
    switch (config.faultType) {
      case 'timeout':
        return {
          ok: false,
          status: 408,
          error: 'Request timeout',
          timestamp: new Date(),
        };

      case 'rate_limit':
        return {
          ok: false,
          status: 429,
          error: 'Rate limit exceeded',
          data: { retryAfter: 60 },
          timestamp: new Date(),
        };

      case 'server_error':
        return {
          ok: false,
          status: 500,
          error: 'Internal server error',
          timestamp: new Date(),
        };

      case 'auth_error':
        return {
          ok: false,
          status: 401,
          error: 'Unauthorized',
          timestamp: new Date(),
        };

      default:
        return {
          ok: false,
          status: 500,
          error: 'Unknown fault',
          timestamp: new Date(),
        };
    }
  }

  private mockGitHubResponse(action: string, payload: Record<string, any>): any {
    switch (action) {
      case 'create_workflow_dispatch':
        return {
          status: 'queued',
          workflow_run_id: 'run_' + Math.random().toString(36).substr(2, 9),
        };
      case 'get_workflow_run':
        return {
          id: payload.runId,
          status: 'completed',
          conclusion: 'success',
        };
      default:
        return { success: true };
    }
  }

  private mockVercelResponse(action: string, payload: Record<string, any>): any {
    switch (action) {
      case 'create_deployment':
        return {
          id: 'dpl_' + Math.random().toString(36).substr(2, 9),
          url: 'https://preview-' + Math.random().toString(36).substr(2, 9) + '.vercel.app',
          status: 'building',
        };
      case 'get_deployment':
        return {
          id: payload.deploymentId,
          status: 'ready',
          url: 'https://preview-' + Math.random().toString(36).substr(2, 9) + '.vercel.app',
        };
      default:
        return { success: true };
    }
  }

  private mockStripeResponse(action: string, payload: Record<string, any>): any {
    switch (action) {
      case 'create_charge':
        return {
          id: 'ch_' + Math.random().toString(36).substr(2, 9),
          amount: payload.amount,
          status: 'succeeded',
        };
      case 'retrieve_charge':
        return {
          id: payload.chargeId,
          status: 'succeeded',
          amount: 9999,
        };
      default:
        return { success: true };
    }
  }
}

export const createConnectorSimulator = (harness: TestHarness): ConnectorSimulator => {
  return new ConnectorSimulator(harness);
};
