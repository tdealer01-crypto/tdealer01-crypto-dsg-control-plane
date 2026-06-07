/**
 * Stripe App E2E Performance Benchmark Runner
 *
 * This utility runs comprehensive performance benchmarks and generates reports
 */

import {
  DEFAULT_THRESHOLDS,
  PerformanceTestHelper,
  formatPerformanceReport,
  PerformanceStats,
} from './performance-baseline';

export interface BenchmarkResult {
  name: string;
  measurements: number[];
  stats: PerformanceStats;
  threshold: number;
  passed: boolean;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  duration: number;
  timestamp: string;
}

/**
 * Benchmark runner for performance measurements
 */
export class BenchmarkRunner {
  private helper: PerformanceTestHelper;
  private benchmarks: Map<string, number[]> = new Map();
  private startTime: number = 0;

  constructor() {
    this.helper = new PerformanceTestHelper();
  }

  /**
   * Start benchmark run
   */
  start(): void {
    this.startTime = Date.now();
    this.benchmarks.clear();
  }

  /**
   * Record a single measurement
   */
  measure(name: string, duration: number): void {
    this.helper.recordMeasurement(name, duration);

    if (!this.benchmarks.has(name)) {
      this.benchmarks.set(name, []);
    }
    this.benchmarks.get(name)!.push(duration);
  }

  /**
   * Record multiple measurements at once
   */
  recordBatch(measurements: Record<string, number>): void {
    Object.entries(measurements).forEach(([name, duration]) => {
      this.measure(name, duration);
    });
  }

  /**
   * End benchmark run and generate results
   */
  finish(): BenchmarkSuite {
    const duration = Date.now() - this.startTime;
    const results: BenchmarkResult[] = [];

    this.benchmarks.forEach((measurements, name) => {
      const stats = this.helper.getStats(name);
      if (stats) {
        const threshold = (DEFAULT_THRESHOLDS as Record<string, number>)[name.replace(/Benchmark$/, '')] || Infinity;
        results.push({
          name,
          measurements,
          stats,
          threshold,
          passed: stats.avg <= threshold,
        });
      }
    });

    return {
      name: 'stripe-app-benchmarks',
      results,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current report
   */
  getReport() {
    return this.helper.getReport('benchmark');
  }

  /**
   * Format and return report as string
   */
  formatReport(): string {
    return this.helper.formatReport();
  }

  /**
   * Export as JSON
   */
  exportJSON(): string {
    return this.helper.exportAsJSON();
  }

  /**
   * Export as CSV
   */
  exportCSV(): string {
    return this.helper.exportAsCSV();
  }
}

/**
 * Metrics aggregator for combining multiple benchmark runs
 */
export class BenchmarkAggregator {
  private suites: BenchmarkSuite[] = [];

  /**
   * Add a benchmark suite result
   */
  addSuite(suite: BenchmarkSuite): void {
    this.suites.push(suite);
  }

  /**
   * Get combined statistics across all suites
   */
  getAggregatedStats(): Record<string, PerformanceStats> {
    const aggregated: Record<string, number[]> = {};

    this.suites.forEach((suite) => {
      suite.results.forEach((result) => {
        if (!aggregated[result.name]) {
          aggregated[result.name] = [];
        }
        aggregated[result.name].push(...result.measurements);
      });
    });

    const helper = new PerformanceTestHelper();
    Object.entries(aggregated).forEach(([name, measurements]) => {
      measurements.forEach((m) => helper.recordMeasurement(name, m));
    });

    return helper.getAllStats();
  }

  /**
   * Get results summary
   */
  getSummary() {
    const stats = this.getAggregatedStats();
    const summary = {
      totalRuns: this.suites.length,
      totalDuration: this.suites.reduce((acc, s) => acc + s.duration, 0),
      metrics: Object.entries(stats).map(([name, stat]) => ({
        name,
        avg: stat.avg,
        median: stat.median,
        min: stat.min,
        max: stat.max,
        p95: stat.p95,
        p99: stat.p99,
      })),
    };
    return summary;
  }

  /**
   * Compare performance between runs
   */
  compare() {
    if (this.suites.length < 2) {
      return null;
    }

    const firstSuite = this.suites[0];
    const lastSuite = this.suites[this.suites.length - 1];
    const comparison: Record<string, { before: number; after: number; change: number; changePercent: number }> = {};

    firstSuite.results.forEach((result) => {
      const beforeAvg = result.stats.avg;
      const afterResult = lastSuite.results.find((r) => r.name === result.name);

      if (afterResult) {
        const afterAvg = afterResult.stats.avg;
        const change = afterAvg - beforeAvg;
        const changePercent = (change / beforeAvg) * 100;

        comparison[result.name] = {
          before: beforeAvg,
          after: afterAvg,
          change,
          changePercent,
        };
      }
    });

    return comparison;
  }

  /**
   * Format comparison report
   */
  formatComparison(): string {
    const comparison = this.compare();
    if (!comparison) {
      return 'Not enough data for comparison';
    }

    let output = '\n';
    output += '╔════════════════════════════════════════════════════════════╗\n';
    output += '║              PERFORMANCE CHANGE COMPARISON                 ║\n';
    output += '╠════════════════════════════════════════════════════════════╣\n';

    Object.entries(comparison).forEach(([name, data]) => {
      const trend = data.change > 0 ? '↑ slower' : '↓ faster';
      output += `\n${name}:\n`;
      output += `  Before: ${data.before.toFixed(2)}ms\n`;
      output += `  After:  ${data.after.toFixed(2)}ms\n`;
      output += `  Change: ${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}ms (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(1)}%) ${trend}\n`;
    });

    output += '\n╚════════════════════════════════════════════════════════════╝\n';

    return output;
  }
}

/**
 * Performance profiler for tracking detailed execution metrics
 */
export class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();

  /**
   * Mark a point in time
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Measure time between two marks or from mark to now
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (startTime === undefined) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (endMark && endTime === undefined) {
      console.warn(`End mark "${endMark}" not found`);
      return 0;
    }

    const duration = (endTime || 0) - startTime;

    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    this.measures.get(name)!.push(duration);

    return duration;
  }

  /**
   * Get measurements for a specific name
   */
  getMeasures(name: string): number[] {
    return this.measures.get(name) || [];
  }

  /**
   * Get all measurements
   */
  getAllMeasures(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    this.measures.forEach((values, name) => {
      result[name] = [...values];
    });
    return result;
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }

  /**
   * Get a summary report
   */
  getReport() {
    const helper = new PerformanceTestHelper();
    this.measures.forEach((values, name) => {
      values.forEach((v) => helper.recordMeasurement(name, v));
    });
    return helper.getReport('profiler');
  }
}

/**
 * Utilities for threshold-based testing
 */
export class ThresholdValidator {
  /**
   * Check if a measurement passes threshold
   */
  static passes(measurement: number, threshold: number): boolean {
    return measurement <= threshold;
  }

  /**
   * Get status string
   */
  static getStatus(measurement: number, threshold: number): 'PASS' | 'WARN' | 'FAIL' {
    if (measurement <= threshold * 0.8) {
      return 'PASS';
    }
    if (measurement <= threshold) {
      return 'WARN';
    }
    return 'FAIL';
  }

  /**
   * Format a threshold check result
   */
  static formatResult(name: string, measurement: number, threshold: number): string {
    const status = this.getStatus(measurement, threshold);
    const statusSymbol = status === 'PASS' ? '✓' : status === 'WARN' ? '⚠' : '✗';
    return `${statusSymbol} ${name}: ${measurement.toFixed(2)}ms (threshold: ${threshold}ms)`;
  }

  /**
   * Validate multiple measurements
   */
  static validateMultiple(measurements: Record<string, number>, thresholds: Record<string, number>) {
    const results = Object.entries(measurements).map(([name, value]) => ({
      name,
      value,
      threshold: thresholds[name] || Infinity,
      passed: this.passes(value, thresholds[name] || Infinity),
    }));

    return {
      results,
      passed: results.every((r) => r.passed),
      failed: results.filter((r) => !r.passed),
    };
  }
}

/**
 * Memory usage tracker for performance analysis
 */
export class MemoryTracker {
  private snapshots: Map<string, number> = new Map();

  /**
   * Take a memory snapshot
   */
  snapshot(label: string): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      this.snapshots.set(label, memoryInfo.usedJSHeapSize);
    }
  }

  /**
   * Get memory delta between two snapshots
   */
  getDelta(label1: string, label2: string): number | null {
    const mem1 = this.snapshots.get(label1);
    const mem2 = this.snapshots.get(label2);

    if (mem1 === undefined || mem2 === undefined) {
      return null;
    }

    return mem2 - mem1;
  }

  /**
   * Format memory size
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
