import type { AlertType } from './use-alerts';
import type { ParallelSystemStatus } from '@/lib/types/hermes';

export interface AlertRule {
  id: string;
  description: string;
  check: (status: ParallelSystemStatus | null) => boolean;
  message: string;
  type: AlertType;
  details?: (status: ParallelSystemStatus) => string;
}

// Track last alert time per rule to prevent spam (min 30s between same alert)
const lastAlertTime: Record<string, number> = {};
const MIN_ALERT_INTERVAL_MS = 30_000; // 30 seconds

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'queue-backing-up',
    description: 'Queue utilization > 80%',
    check: (status) => {
      if (!status?.queue) return false;
      const utilization = (status.queue.size / 10000) * 100;
      return utilization > 80;
    },
    message: 'Queue backing up, consider scaling executors',
    type: 'CRITICAL',
    details: (status) => {
      if (status.queue) {
        const utilization = (status.queue.size / 10000) * 100;
        return `Depth: ${status.queue.size}/10000 (${utilization.toFixed(1)}%) | P99: ${status.queue.p99WaitMs}ms`;
      }
      return '';
    },
  },
  {
    id: 'cache-hit-degrading',
    description: 'Cache hit rate drops below 50%',
    check: (status) => {
      if (!status?.harmonyEngine) return false;
      return status.harmonyEngine.hitRate < 50;
    },
    message: 'Cache performance degrading',
    type: 'WARNING',
    details: (status) => {
      if (status.harmonyEngine) {
        return `Hit rate: ${status.harmonyEngine.hitRate.toFixed(1)}% | Lookups: ${status.harmonyEngine.totalLookups}`;
      }
      return '';
    },
  },
  {
    id: 'high-latency',
    description: 'P99 latency > 500ms',
    check: (status) => {
      if (!status?.queue) return false;
      return status.queue.p99WaitMs > 500;
    },
    message: 'High latency detected',
    type: 'WARNING',
    details: (status) => {
      if (status.queue) {
        return `P99: ${status.queue.p99WaitMs}ms | P95: ${status.queue.p95WaitMs}ms | Avg: ${status.queue.avgWaitMs}ms`;
      }
      return '';
    },
  },
  {
    id: 'executor-near-capacity',
    description: 'Executor capacity > 90%',
    check: (status) => {
      if (!status?.executorCapacity) return false;
      return Object.values(status.executorCapacity).some((cap) => cap.utilization > 90);
    },
    message: 'Executor near capacity limit',
    type: 'CRITICAL',
    details: (status) => {
      if (status.executorCapacity) {
        const maxCap = Object.entries(status.executorCapacity).find(
          ([_, cap]) => cap.utilization > 90
        );
        if (maxCap) {
          const [name, cap] = maxCap;
          return `${name}: ${cap.current}/${cap.max} (${cap.utilization.toFixed(1)}%)`;
        }
      }
      return '';
    },
  },
];

/**
 * Check all alert rules and return alerts that should be triggered.
 * Respects the minimum alert interval to prevent spam.
 */
export function checkAlertRules(status: ParallelSystemStatus | null): Array<{
  ruleId: string;
  message: string;
  type: AlertType;
  details?: string;
}> {
  const now = Date.now();
  const triggeredAlerts = [];

  for (const rule of ALERT_RULES) {
    const shouldTrigger = rule.check(status);
    const lastTime = lastAlertTime[rule.id] ?? 0;
    const timeSinceLastAlert = now - lastTime;

    if (shouldTrigger && timeSinceLastAlert >= MIN_ALERT_INTERVAL_MS) {
      triggeredAlerts.push({
        ruleId: rule.id,
        message: rule.message,
        type: rule.type,
        details: status ? rule.details?.(status) : undefined,
      });

      // Update the last alert time for this rule
      lastAlertTime[rule.id] = now;
    }
  }

  return triggeredAlerts;
}

/**
 * Reset alert tracking (useful for testing)
 */
export function resetAlertTracking() {
  Object.keys(lastAlertTime).forEach((key) => {
    delete lastAlertTime[key];
  });
}
