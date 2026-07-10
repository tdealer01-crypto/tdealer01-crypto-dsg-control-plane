/**
 * Connector Simulator Base
 * Framework for testing connectors under various conditions
 */

import type { Connector, ConnectorCredential, ProvisionInput, ProvisionOutput, HealthResult } from '@/lib/dsg/setup/connectors/interface';

export interface SimulatorConfig {
  connector_id: string;
  connector_name: string;
  healthCheckLatencyMs?: number;
  provisionLatencyMs?: number;
  failureMode?: 'none' | 'timeout' | 'rate_limit' | 'unauthorized' | 'internal_error';
  failureAfterAttempts?: number;
  shouldTimeoutAt?: number; // ms before timeout
}

export interface ProvisionRecording {
  action: string;
  params: Record<string, unknown>;
  timestamp: Date;
  duration_ms: number;
  result?: ProvisionOutput;
  error?: string;
}

export class ConnectorSimulator {
  private config: SimulatorConfig;
  private recordings: ProvisionRecording[] = [];
  private attemptCount = 0;
  private healthCheckCount = 0;

  constructor(config: SimulatorConfig) {
    this.config = config;
  }

  /**
   * Simulate connector health check
   */
  async simulateHealth(credential: ConnectorCredential): Promise<HealthResult> {
    this.healthCheckCount += 1;
    const startTime = Date.now();

    try {
      // Simulate network latency
      await this.delay(this.config.healthCheckLatencyMs || 100);

      // Apply failure mode
      if (this.config.failureMode === 'timeout') {
        throw new Error('Health check timeout');
      }

      if (this.config.failureMode === 'unauthorized') {
        return {
          ok: false,
          reason: 'Credential expired or unauthorized',
        };
      }

      if (this.config.failureMode === 'internal_error') {
        throw new Error('Internal server error');
      }

      // Success
      return {
        ok: true,
        reason: 'Connector healthy',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        reason: errorMsg,
      };
    }
  }

  /**
   * Simulate connector provision
   */
  async simulateProvision(input: ProvisionInput): Promise<ProvisionOutput> {
    this.attemptCount += 1;
    const startTime = Date.now();

    try {
      // Check if should fail based on attempt count
      if (
        this.config.failureMode !== 'none' &&
        this.config.failureAfterAttempts &&
        this.attemptCount <= this.config.failureAfterAttempts
      ) {
        throw this.createFailureError(this.config.failureMode);
      }

      // Simulate network latency
      await this.delay(this.config.provisionLatencyMs || 500);

      // Check timeout
      if (
        this.config.shouldTimeoutAt &&
        Date.now() - startTime > this.config.shouldTimeoutAt
      ) {
        throw new Error('Provision timeout');
      }

      // Success
      const output: ProvisionOutput = {
        success: true,
        output: {
          connector_id: this.config.connector_id,
          action: input.action,
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        },
      };

      // Record
      this.recordings.push({
        action: input.action,
        params: input.params,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        result: output,
      });

      return output;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Record
      this.recordings.push({
        action: input.action,
        params: input.params,
        timestamp: new Date(),
        duration_ms: Date.now() - startTime,
        error: errorMsg,
      });

      throw error;
    }
  }

  /**
   * Simulate rollback
   */
  async simulateRollback(execution_id: string): Promise<void> {
    // Simulate cleanup
    await this.delay(100);
    console.debug(`[simulator] Rollback executed for ${execution_id}`);
  }

  /**
   * Get recordings of all provisions
   */
  getRecordings(): ProvisionRecording[] {
    return [...this.recordings];
  }

  /**
   * Get deterministic hash of all recordings (for replay verification)
   */
  getRecordingHash(): string {
    const data = JSON.stringify(
      this.recordings.map((r) => ({
        action: r.action,
        params: r.params,
        duration_ms: r.duration_ms,
        success: !r.error,
      })),
    );

    // Simple hash (in production use SHA256)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Reset simulator
   */
  reset(): void {
    this.recordings = [];
    this.attemptCount = 0;
    this.healthCheckCount = 0;
  }

  /**
   * Get simulator stats
   */
  getStats(): {
    attempts: number;
    health_checks: number;
    recordings: number;
    successful_provisions: number;
    failed_provisions: number;
  } {
    const successful = this.recordings.filter((r) => !r.error).length;
    const failed = this.recordings.filter((r) => r.error).length;

    return {
      attempts: this.attemptCount,
      health_checks: this.healthCheckCount,
      recordings: this.recordings.length,
      successful_provisions: successful,
      failed_provisions: failed,
    };
  }

  /**
   * Helper: delay simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: create failure error
   */
  private createFailureError(mode: string): Error {
    switch (mode) {
      case 'timeout':
        return new Error('Provision timeout after 30s');
      case 'rate_limit':
        return new Error('Rate limit exceeded (429)');
      case 'unauthorized':
        return new Error('Unauthorized (401)');
      case 'internal_error':
        return new Error('Internal server error (500)');
      default:
        return new Error('Unknown error');
    }
  }
}
