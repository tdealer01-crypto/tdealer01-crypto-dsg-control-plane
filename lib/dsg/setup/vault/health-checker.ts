/**
 * Health Checker
 * Scheduled task to verify connector credential health
 */

import { connectorRegistry } from '../connectors';
import { credentialStore } from './credential-store';
import { eventBus } from '../events';

export interface HealthCheckResult {
  connector_id: string;
  status: 'healthy' | 'unhealthy' | 'expired';
  details?: string;
  checked_at: Date;
}

export class HealthChecker {
  private isRunning = false;
  private lastRunAt?: Date;
  private intervalMs = 60 * 60 * 1000; // 1 hour default

  /**
   * Start health check scheduler
   */
  startScheduler(intervalMs?: number): void {
    if (this.isRunning) {
      console.warn('[health-checker] Scheduler already running');
      return;
    }

    if (intervalMs) {
      this.intervalMs = intervalMs;
    }

    this.isRunning = true;
    console.info(`[health-checker] Started scheduler (interval: ${this.intervalMs}ms)`);

    // Initial run
    this.runHealthChecks().catch((error) => {
      console.error('[health-checker] Initial health check failed:', error);
    });

    // Schedule recurring checks
    setInterval(() => {
      this.runHealthChecks().catch((error) => {
        console.error('[health-checker] Scheduled health check failed:', error);
      });
    }, this.intervalMs);
  }

  /**
   * Stop health check scheduler
   */
  stopScheduler(): void {
    this.isRunning = false;
    console.info('[health-checker] Stopped scheduler');
  }

  /**
   * Run health checks for all org credentials
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    this.lastRunAt = new Date();

    console.info('[health-checker] Running health checks');

    // In production, would query all orgs from database
    // For now, check all connectors in registry
    const connectors = connectorRegistry.all();

    for (const connector of connectors) {
      try {
        // Get credential (placeholder - would query from DB per org)
        const credential = await credentialStore.getConnectorCredential('default-org', connector.id);

        if (!credential) {
          console.debug(`[health-checker] No credential for ${connector.id}`);
          continue;
        }

        // Run health check
        const health = await connector.health(credential);

        const result: HealthCheckResult = {
          connector_id: connector.id,
          status: health.ok ? 'healthy' : 'unhealthy',
          details: health.detail,
          checked_at: new Date(),
        };

        results.push(result);

        // Emit health check event
        await eventBus.emit({
          id: crypto.randomUUID(),
          type: 'health:checked',
          org_id: 'default-org',
          timestamp: new Date(),
          data: {
            connector_id: connector.id,
            status: result.status,
            last_checked_at: result.checked_at,
            details: result.details,
          },
        });

        // Update credential health status
        await credentialStore.updateHealthStatus(
          'default-org',
          connector.id,
          result.status,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        const result: HealthCheckResult = {
          connector_id: connector.id,
          status: 'unhealthy',
          details: errorMsg,
          checked_at: new Date(),
        };

        results.push(result);

        // Emit health failed event
        await eventBus.emit({
          id: crypto.randomUUID(),
          type: 'health:failed',
          org_id: 'default-org',
          timestamp: new Date(),
          data: {
            connector_id: connector.id,
            error: errorMsg,
            failed_at: new Date(),
          },
        });

        // Update health status to unhealthy
        await credentialStore.updateHealthStatus(
          'default-org',
          connector.id,
          'unhealthy',
        );
      }
    }

    return results;
  }

  /**
   * Run single connector health check
   */
  async checkConnectorHealth(
    org_id: string,
    connector_id: string,
  ): Promise<HealthCheckResult | null> {
    try {
      const connector = connectorRegistry.get(connector_id);
      if (!connector) return null;

      const credential = await credentialStore.getConnectorCredential(org_id, connector_id);
      if (!credential) return null;

      const health = await connector.health(credential);

      const result: HealthCheckResult = {
        connector_id,
        status: health.ok ? 'healthy' : 'unhealthy',
        details: health.detail,
        checked_at: new Date(),
      };

      // Emit event
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: health.ok ? 'health:checked' : 'health:failed',
        org_id,
        timestamp: new Date(),
        data: health.ok
          ? {
              connector_id,
              status: 'healthy' as const,
              last_checked_at: new Date(),
            }
          : {
              connector_id,
              error: health.detail || 'Health check failed',
              failed_at: new Date(),
            },
      });

      // Update status
      await credentialStore.updateHealthStatus(org_id, connector_id, result.status);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'health:failed',
        org_id,
        timestamp: new Date(),
        data: {
          connector_id,
          error: errorMsg,
          failed_at: new Date(),
        },
      });

      return {
        connector_id,
        status: 'unhealthy',
        details: errorMsg,
        checked_at: new Date(),
      };
    }
  }

  /**
   * Get last run time
   */
  getLastRunAt(): Date | undefined {
    return this.lastRunAt;
  }

  /**
   * Check if scheduler is running
   */
  isRunning_(): boolean {
    return this.isRunning;
  }
}

export const healthChecker = new HealthChecker();
