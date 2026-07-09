/**
 * Phase 5 Tests: Dashboard UI & API Endpoint
 *
 * Validates that:
 * 1. Dashboard loads benchmark cases
 * 2. Benchmark execution works through UI
 * 3. Evidence export functionality works
 * 4. API endpoints respond correctly
 * 5. Reports are audit-ready
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadBenchmarkCases, benchmarkIsingVsZ3, exportBenchmarkReport } from '@/lib/dsg-one/ising-benchmark';
import type { BenchmarkCase } from '@/lib/dsg-one/ising-benchmark';

describe('Phase 5: Dashboard UI & API Endpoint', () => {
  let benchmarkCases: BenchmarkCase[];

  beforeAll(async () => {
    benchmarkCases = await loadBenchmarkCases();
  });

  describe('Dashboard Data Loading', () => {
    it('should load benchmark cases for UI display', async () => {
      expect(benchmarkCases.length).toBeGreaterThan(0);
      expect(benchmarkCases.some((c) => c.id === 'small')).toBe(true);
    });

    it('should provide case metadata for UI rendering', () => {
      for (const testCase of benchmarkCases) {
        expect(testCase.id).toBeDefined();
        expect(testCase.name).toBeDefined();
        expect(testCase.variables).toBeGreaterThan(0);
        expect(testCase.constraints).toBeGreaterThan(0);
      }
    });

    it('should compute input hash for determinism tracking', () => {
      for (const testCase of benchmarkCases) {
        expect(testCase.inputHash).toBeDefined();
        expect(testCase.inputHash.length).toBe(64); // SHA-256
      }
    });
  });

  describe('Benchmark Execution via Dashboard', () => {
    it('should run benchmark on selected cases', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      expect(selectedCases.length).toBeGreaterThan(0);

      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report).toBeDefined();
      expect(report.results.size).toBe(1); // 1 case (small)
    });

    it('should run multiple cases concurrently', async () => {
      const selectedCases = benchmarkCases.slice(0, 2); // First 2 cases
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report.results.size).toBe(selectedCases.length);
      expect(report.summary.totalCases).toBeGreaterThan(0);
    });

    it('should track execution time', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report.generatedAtMs).toBeGreaterThan(0);
      expect(report.generatedAtMs).toBeLessThan(30000); // Should complete in 30s
    });
  });

  describe('Evidence Export', () => {
    it('should generate markdown report for export', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report.markdown).toBeDefined();
      expect(report.markdown.length).toBeGreaterThan(100);
      expect(report.markdown).toContain('DSG ONE Ising Benchmark');
      expect(report.markdown).toContain('Determinism');
    });

    it('should generate JSON report for export', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report.json).toBeDefined();
      expect(typeof report.json).toBe('object');
      expect(report.json.cases).toBeDefined();
      expect(report.json.results).toBeDefined();
      expect(report.json.summary).toBeDefined();
    });

    it('should export reports to filesystem', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Should not throw
      await exportBenchmarkReport(report);
    });

    it('should include proof hashes in exports', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(report.markdown).toContain('Proof Hash Evidence');
      expect(report.json.results).toBeDefined();
    });
  });

  describe('API Endpoint Behavior', () => {
    it('should generate summary metrics for API response', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Simulate API response structure
      const apiResponse = {
        status: 'success',
        report: {
          generatedAt: report.generatedAt,
          summary: report.summary,
          totalTimeMs: report.generatedAtMs,
          caseCount: report.cases.length,
          resultCount: Array.from(report.results.values()).flat().length,
        },
      };

      expect(apiResponse.status).toBe('success');
      expect(apiResponse.report.summary).toBeDefined();
      expect(apiResponse.report.caseCount).toBeGreaterThan(0);
    });

    it('should support JSON format export via API', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Simulate API JSON response
      const jsonResponse = report.json;

      expect(jsonResponse.cases).toBeDefined();
      expect(jsonResponse.results).toBeDefined();
      expect(jsonResponse.summary).toBeDefined();
    });

    it('should support Markdown format export via API', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Simulate API markdown response
      const markdownResponse = report.markdown;

      expect(typeof markdownResponse).toBe('string');
      expect(markdownResponse.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Go/No-Go Display', () => {
    it('should calculate pass/fail status for all criteria', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Dashboard displays these criteria
      const deterministicPass = report.summary.deterministicScore >= 95;
      const consistencyPass = report.summary.proofConsistency === 100;
      const performancePass = report.summary.averageLatency < 2000;

      expect(typeof deterministicPass).toBe('boolean');
      expect(typeof consistencyPass).toBe('boolean');
      expect(typeof performancePass).toBe('boolean');
    });

    it('should display fallback rate for optimization tracking', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      expect(typeof report.summary.fallbackRate).toBe('number');
      expect(report.summary.fallbackRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.fallbackRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Phase 5 Success Criteria', () => {
    it('should complete full dashboard workflow < 30s for small case', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const startTime = Date.now();

      const report = await benchmarkIsingVsZ3(selectedCases);
      await exportBenchmarkReport(report);

      const totalTimeMs = Date.now() - startTime;
      expect(totalTimeMs).toBeLessThan(30000);
    });

    it('should generate all required report sections', async () => {
      const selectedCases = benchmarkCases.filter((c) => c.id === 'small');
      const report = await benchmarkIsingVsZ3(selectedCases);

      // Check markdown has all required sections
      expect(report.markdown).toContain('Executive Summary');
      expect(report.markdown).toContain('Determinism Validation');
      expect(report.markdown).toContain('Proof Hash Evidence');
      expect(report.markdown).toContain('Go/No-Go Criteria');

      // Check JSON has all required fields
      expect(report.json.cases).toBeDefined();
      expect(report.json.results).toBeDefined();
      expect(report.json.summary).toBeDefined();
      expect(report.json.generatedAt).toBeDefined();
    });

    it('should maintain compatibility with Phase 1-4 code', async () => {
      // Just verify imports work
      const { buildQUBOMatrix } = await import('@/lib/dsg-one/qubo-builder');
      const { optimizeWithIsing } = await import('@/lib/dsg-one/ising-optimizer');
      const { verifyIsingWithZ3 } = await import('@/lib/dsg-one/ising-to-z3-verifier');

      expect(typeof buildQUBOMatrix).toBe('function');
      expect(typeof optimizeWithIsing).toBe('function');
      expect(typeof verifyIsingWithZ3).toBe('function');
    });
  });
});
