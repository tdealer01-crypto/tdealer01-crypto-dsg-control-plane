/**
 * Health Listener
 * Tracks connector health status from events
 */

import type { DSGEvent, HealthCheckedEvent, HealthFailedEvent } from '../types';

export interface ConnectorHealthStatus {
  connector_id: string;
  status: 'healthy' | 'unhealthy' | 'expired' | 'unknown';
  last_checked_at: Date | null;
  last_failed_at: Date | null;
  consecutive_failures: number;
  details: string | null;
}

export class HealthListener {
  private healthStatus: Map<string, ConnectorHealthStatus> = new Map();
  private alertThreshold = 3; // Alert after 3 consecutive failures

  /**
   * Handle health checked event
   */
  async onHealthChecked(event: DSGEvent<HealthCheckedEvent>): Promise<void> {
    const { connector_id, status, details } = event.data;

    const current = this.healthStatus.get(connector_id) || {
      connector_id,
      status: 'unknown',
      last_checked_at: null,
      last_failed_at: null,
      consecutive_failures: 0,
      details: null,
    };

    // Update status
    current.status = status;
    current.last_checked_at = event.timestamp;
    current.details = details || null;

    // Reset failure counter on success
    if (status === 'healthy') {
      current.consecutive_failures = 0;
    }

    this.healthStatus.set(connector_id, current);
  }

  /**
   * Handle health failed event
   */
  async onHealthFailed(event: DSGEvent<HealthFailedEvent>): Promise<void> {
    const { connector_id, error, error_code } = event.data;

    const current = this.healthStatus.get(connector_id) || {
      connector_id,
      status: 'unknown',
      last_checked_at: null,
      last_failed_at: null,
      consecutive_failures: 0,
      details: null,
    };

    // Increment failure counter
    current.consecutive_failures += 1;
    current.last_failed_at = event.timestamp;
    current.status = 'unhealthy';
    current.details = `${error} (${error_code || 'unknown'})`;

    this.healthStatus.set(connector_id, current);

    // Alert if threshold exceeded
    if (current.consecutive_failures >= this.alertThreshold) {
      await this.alertOnMultipleFailures(current, event.org_id);
    }
  }

  /**
   * Alert on multiple consecutive failures
   */
  private async alertOnMultipleFailures(
    status: ConnectorHealthStatus,
    org_id: string,
  ): Promise<void> {
    const alert = {
      org_id,
      connector_id: status.connector_id,
      consecutive_failures: status.consecutive_failures,
      last_failed_at: status.last_failed_at,
      details: status.details,
    };

    // Placeholder for alerting mechanism (email, Slack, etc.)
    console.warn('[health-listener] Alert:', alert);
  }

  /**
   * Get connector health status
   */
  getStatus(connector_id: string): ConnectorHealthStatus | undefined {
    return this.healthStatus.get(connector_id);
  }

  /**
   * Get all connector statuses
   */
  getAllStatuses(): ConnectorHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get unhealthy connectors
   */
  getUnhealthyConnectors(): ConnectorHealthStatus[] {
    return Array.from(this.healthStatus.values()).filter(
      (s) => s.status === 'unhealthy' || s.status === 'expired',
    );
  }

  /**
   * Check if org has unhealthy connectors
   */
  hasUnhealthyConnectors(org_id: string): boolean {
    // In production, filter by org_id as well
    return this.getUnhealthyConnectors().length > 0;
  }

  /**
   * Clear all statuses (for testing)
   */
  clearStatuses(): void {
    this.healthStatus.clear();
  }
}

export const healthListener = new HealthListener();
