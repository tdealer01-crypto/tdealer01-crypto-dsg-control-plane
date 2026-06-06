/**
 * Performance Baseline Thresholds and Metrics
 *
 * This file defines the expected performance characteristics for the Stripe App
 * and provides utilities for measuring and validating performance metrics.
 */

export interface PerformanceThresholds {
  dashboardLoad: number;
  auditPageLoad: number;
  policyCreate: number;
  policyEval: number;
  formInput: number;
  auditSearch: number;
  webhookLatency: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'pass' | 'warn' | 'fail';
}

export interface PerformanceStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  count: number;
}

/**
 * Default performance thresholds in milliseconds
 * These are based on typical user expectations and production SLAs
 */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  // Page load thresholds
  dashboardLoad: 2000, // Dashboard should load in under 2 seconds
  auditPageLoad: 1000, // Audit page should load in under 1 second

  // Feature thresholds
  policyCreate: 1500, // Policy creation should complete in under 1.5 seconds
  policyEval: 800, // Policy evaluation should complete in under 800ms
  formInput: 500, // Form input should respond in under 500ms
  auditSearch: 1200, // Search should complete in under 1.2 seconds

  // System thresholds
  webhookLatency: 2000, // Webhook processing should complete in under 2 seconds
};

/**
 * Performance metric categories and their expected ranges
 */
export const METRIC_CATEGORIES = {
  pageLoad: {
    excellent: 500,
    good: 1500,
    acceptable: 2500,
  },
  interaction: {
    excellent: 100,
    good: 500,
    acceptable: 1000,
  },
  api: {
    excellent: 200,
    good: 500,
    acceptable: 1000,
  },
};

/**
 * Calculates percentiles from an array of values
 */
export function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculates comprehensive statistics from an array of measurements
 */
export function calculateStats(measurements: number[]): PerformanceStats {
  if (measurements.length === 0) {
    return {
      avg: 0,
      median: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
      count: 0,
    };
  }

  const sorted = [...measurements].sort((a, b) => a - b);
  const sum = measurements.reduce((a, b) => a + b, 0);
  const avg = sum / measurements.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = calculatePercentile(measurements, 95);
  const p99 = calculatePercentile(measurements, 99);

  return {
    avg,
    median,
    min,
    max,
    p95,
    p99,
    count: measurements.length,
  };
}

/**
 * Evaluates metric status based on thresholds
 */
export function getMetricStatus(value: number, threshold: number): 'pass' | 'warn' | 'fail' {
  if (value <= threshold * 0.8) {
    return 'pass';
  }
  if (value <= threshold) {
    return 'warn';
  }
  return 'fail';
}

/**
 * Formats milliseconds to readable time string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Performance report template
 */
export interface PerformanceReport {
  timestamp: string;
  environment: string;
  suite: string;
  metrics: Record<string, PerformanceStats>;
  thresholds: PerformanceThresholds;
  summary: {
    totalTests: number;
    passedThresholds: number;
    failedThresholds: number;
  };
}

/**
 * Generates a formatted performance report
 */
export function generatePerformanceReport(
  measurements: Record<string, number[]>,
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
  environment: string = 'local'
): PerformanceReport {
  const metrics: Record<string, PerformanceStats> = {};
  let passedCount = 0;
  let failedCount = 0;

  Object.entries(measurements).forEach(([name, values]) => {
    metrics[name] = calculateStats(values);
    const threshold = (thresholds as Record<string, number>)[name.replace('Benchmark', '')] || Infinity;
    if (metrics[name].avg <= threshold) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  return {
    timestamp: new Date().toISOString(),
    environment,
    suite: 'stripe-app-e2e',
    metrics,
    thresholds,
    summary: {
      totalTests: Object.keys(measurements).length,
      passedThresholds: passedCount,
      failedThresholds: failedCount,
    },
  };
}

/**
 * Formats a performance report for console output
 */
export function formatPerformanceReport(report: PerformanceReport): string {
  let output = '\n';
  output += '╔════════════════════════════════════════════════════════════╗\n';
  output += '║         STRIPE APP E2E PERFORMANCE BASELINE REPORT         ║\n';
  output += '╠════════════════════════════════════════════════════════════╣\n';
  output += `║ Environment: ${report.environment.padEnd(47)}║\n`;
  output += `║ Timestamp: ${new Date(report.timestamp).toISOString().padEnd(49)}║\n`;
  output += `║ Suite: ${report.suite.padEnd(53)}║\n`;
  output += '╠════════════════════════════════════════════════════════════╣\n';

  Object.entries(report.metrics).forEach(([name, stats]) => {
    const threshold = (report.thresholds as Record<string, number>)[name.replace('Benchmark', '')] || 0;
    const status = getMetricStatus(stats.avg, threshold);
    const statusSymbol = status === 'pass' ? '✓' : status === 'warn' ? '⚠' : '✗';

    output += `\n${statusSymbol} ${name}:\n`;
    output += `  Average:  ${formatDuration(stats.avg).padEnd(15)} (threshold: ${formatDuration(threshold)})\n`;
    output += `  Median:   ${formatDuration(stats.median).padEnd(15)}\n`;
    output += `  Min:      ${formatDuration(stats.min).padEnd(15)}\n`;
    output += `  Max:      ${formatDuration(stats.max).padEnd(15)}\n`;
    output += `  P95:      ${formatDuration(stats.p95).padEnd(15)}\n`;
    output += `  P99:      ${formatDuration(stats.p99).padEnd(15)}\n`;
    output += `  Samples:  ${stats.count}\n`;
  });

  output += '\n╠════════════════════════════════════════════════════════════╣\n';
  output += `║ Passed: ${String(report.summary.passedThresholds).padEnd(52)}║\n`;
  output += `║ Failed: ${String(report.summary.failedThresholds).padEnd(52)}║\n`;
  output += '╚════════════════════════════════════════════════════════════╝\n';

  return output;
}

/**
 * Performance test utilities
 */
export class PerformanceTestHelper {
  private measurements: Record<string, number[]> = {};

  recordMeasurement(name: string, value: number): void {
    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }
    this.measurements[name].push(value);
  }

  recordMultiple(measurements: Record<string, number>): void {
    Object.entries(measurements).forEach(([name, value]) => {
      this.recordMeasurement(name, value);
    });
  }

  getStats(name: string): PerformanceStats | null {
    const values = this.measurements[name];
    if (!values || values.length === 0) {
      return null;
    }
    return calculateStats(values);
  }

  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};
    Object.keys(this.measurements).forEach((name) => {
      const stat = this.getStats(name);
      if (stat) {
        stats[name] = stat;
      }
    });
    return stats;
  }

  getReport(environment = 'test'): PerformanceReport {
    return generatePerformanceReport(this.measurements, DEFAULT_THRESHOLDS, environment);
  }

  formatReport(): string {
    return formatPerformanceReport(this.getReport());
  }

  exportAsJSON(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  exportAsCSV(): string {
    const stats = this.getAllStats();
    let csv = 'Metric,Average,Median,Min,Max,P95,P99,Count\n';

    Object.entries(stats).forEach(([name, stat]) => {
      csv += `${name},${stat.avg.toFixed(2)},${stat.median.toFixed(2)},${stat.min},${stat.max},${stat.p95.toFixed(2)},${stat.p99.toFixed(2)},${stat.count}\n`;
    });

    return csv;
  }
}

/**
 * Predefined performance budgets for different scenarios
 */
export const PERFORMANCE_BUDGETS = {
  production: {
    dashboardLoad: 1500,
    auditPageLoad: 800,
    policyCreate: 1000,
    policyEval: 500,
    formInput: 300,
    auditSearch: 800,
    webhookLatency: 1500,
  },
  staging: {
    dashboardLoad: 2000,
    auditPageLoad: 1200,
    policyCreate: 1500,
    policyEval: 800,
    formInput: 500,
    auditSearch: 1200,
    webhookLatency: 2000,
  },
  development: {
    dashboardLoad: 3000,
    auditPageLoad: 2000,
    policyCreate: 2500,
    policyEval: 1500,
    formInput: 1000,
    auditSearch: 2000,
    webhookLatency: 3000,
  },
};

/**
 * Gets the appropriate performance budget based on environment
 */
export function getBudgetForEnvironment(environment: 'production' | 'staging' | 'development'): PerformanceThresholds {
  return PERFORMANCE_BUDGETS[environment] as PerformanceThresholds;
}
