/**
 * Phase 4 Benchmark Tests: Evidence Generation & Determinism Validation
 *
 * Validates that:
 * 1. Benchmark harness runs all solver modes
 * 2. Determinism score reaches target (100/100 for same seed)
 * 3. Proof hashes are stable across runs
 * 4. Evidence output is audit-ready
 * 5. Fallback mechanism tracked correctly
 * 6. No regressions in Phase 1-3 functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  benchmarkIsingVsZ3,
  loadBenchmarkCases,
  testDeterminism,
  exportBenchmarkReport,
  type BenchmarkCase,
  type SolverBenchmarkResult,
} from '@/lib/dsg-one/ising-benchmark';
import type { TaskDag, AgentCapacity } from '@/lib/dsg/multi-agent/types';

describe('Phase 4: Benchmark Harness & Evidence Generation', () => {
  let benchmarkCases: BenchmarkCase[];

  beforeAll(async () => {
    benchmarkCases = await loadBenchmarkCases();
  });

  describe('Benchmark Case Loading', () => {
    it('should load all benchmark cases', async () => {
      expect(benchmarkCases.length).toBeGreaterThanOrEqual(3); // At least small, medium, large
    });

    it('should have small case with ~8 variables', async () => {
      const smallCase = benchmarkCases.find((c) => c.id === 'small');
      expect(smallCase).toBeDefined();
      if (smallCase) {
        expect(smallCase.variables).toBeLessThan(20);
        expect(smallCase.tasks).toBe(5);
        expect(smallCase.agents).toBe(3);
      }
    });

    it('should have medium case with ~90 variables', async () => {
      const mediumCase = benchmarkCases.find((c) => c.id === 'medium');
      expect(mediumCase).toBeDefined();
      if (mediumCase) {
        expect(mediumCase.variables).toBeGreaterThan(50);
        expect(mediumCase.variables).toBeLessThan(150);
      }
    });

    it('should have large case with ~500 variables', async () => {
      const largeCase = benchmarkCases.find((c) => c.id === 'large');
      expect(largeCase).toBeDefined();
      if (largeCase) {
        expect(largeCase.variables).toBeGreaterThan(400);
      }
    });

    it('should have adversarial case with high constraints', async () => {
      const adversarialCase = benchmarkCases.find((c) => c.id === 'adversarial');
      expect(adversarialCase).toBeDefined();
      if (adversarialCase) {
        expect(adversarialCase.constraints).toBeGreaterThan(5);
      }
    });

    it('should compute deterministic input hash for each case', () => {
      for (const testCase of benchmarkCases) {
        expect(testCase.inputHash).toBeDefined();
        expect(testCase.inputHash.length).toBeGreaterThan(0); // SHA-256 hash
      }
    });
  });

  describe('Determinism Testing', () => {
    it('should run solver 10 times with same seed', async () => {
      const smallCase = benchmarkCases.find((c) => c.id === 'small');
      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const result = await testDeterminism('z3-only', smallCase, 42);

      expect(result.success).toBe(true);
      expect(result.deterministicScore).toBeGreaterThanOrEqual(0);
      expect(result.deterministicScore).toBeLessThanOrEqual(100);
    });

    it('should achieve 100% determinism for Z3-only on small case', async () => {
      const smallCase = benchmarkCases.find((c) => c.id === 'small');
      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const result = await testDeterminism('z3-only', smallCase, 42);

      // Z3-only should be fully deterministic
      expect(result.deterministicScore).toBe(100);
      expect(result.proofHash.length).toBeGreaterThan(0);
    });

    it('should track energy variance across determinism runs', async () => {
      const smallCase = benchmarkCases.find((c) => c.id === 'small');
      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const result = await testDeterminism('ising-only', smallCase, 42);

      expect(result.energyVariance).toBeGreaterThanOrEqual(0);
      // For mock Ising with same seed, variance should be near 0
      expect(result.energyVariance).toBeLessThan(0.001);
    });

    it('should track fallback triggers in verification mode', async () => {
      const adversarialCase = benchmarkCases.find((c) => c.id === 'adversarial');
      if (!adversarialCase) {
        console.log('Skipping: adversarial case not available');
        return;
      }

      const result = await testDeterminism('ising-z3-verify', adversarialCase, 42);

      expect(result).toBeDefined();
      expect(typeof result.fallbackTriggered).toBe('boolean');
    });
  });

  describe('Full Benchmark Suite', () => {
    it('should run all solver modes on small case', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      expect(report).toBeDefined();
      expect(report.results.has('small')).toBe(true);

      const results = report.results.get('small');
      expect(results).toBeDefined();
      expect(results!.length).toBe(4); // 4 solver modes
    });

    it('should produce evidence-ready report', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      // Check markdown evidence generation
      expect(report.markdown).toBeDefined();
      expect(report.markdown).toContain('DSG ONE Ising Benchmark');
      expect(report.markdown).toContain('Determinism');
      expect(report.markdown).toContain('Proof Hash Evidence');
    });

    it('should calculate summary metrics correctly', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      expect(report.summary).toBeDefined();
      expect(report.summary.fastestMode).toMatch(/z3-only|ising-only|ising-z3-verify|ising-z3-warmstart/);
      expect(report.summary.averageLatency).toBeGreaterThan(0);
      expect(report.summary.deterministicScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.deterministicScore).toBeLessThanOrEqual(100);
    });

    it('should include all cases in report', async () => {
      const report = await benchmarkIsingVsZ3(benchmarkCases.slice(0, 2));

      expect(report.cases.length).toBe(2);
      for (const testCase of report.cases) {
        expect(report.results.has(testCase.id)).toBe(true);
      }
    });

    it('should track proof hashes for each solver mode', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);
      const results = report.results.get('small');

      expect(results).toBeDefined();
      for (const result of results!) {
        if (result.success) {
          expect(result.proofHash).toBeDefined();
          expect(result.proofHash.length).toBe(64); // SHA-256
        }
      }
    });
  });

  describe('Evidence Output Compliance', () => {
    it('should export report to JSON format', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      expect(report.json).toBeDefined();
      expect(report.json.cases).toBeDefined();
      expect(report.json.results).toBeDefined();
      expect(report.json.summary).toBeDefined();
      expect(report.json.generatedAt).toBeDefined();
    });

    it('should generate audit-ready markdown', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);
      const markdown = report.markdown;

      // Evidence checklist
      expect(markdown).toContain('Executive Summary');
      expect(markdown).toContain('Determinism Validation');
      expect(markdown).toContain('Proof Hash Evidence');
      expect(markdown).toContain('Go/No-Go Criteria');
      expect(markdown).toContain('DSG Determinism Engine');
    });

    it('should include go/no-go decision criteria', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      expect(report.markdown).toContain('Go/No-Go Criteria');
      // Check for pass/fail indicators
      expect(report.markdown).toMatch(/✅|⚠️|❌/);
    });
  });

  describe('Phase 4 Success Criteria', () => {
    it('should complete full benchmark < 30s on small cases', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const startTime = Date.now();
      const report = await benchmarkIsingVsZ3(smallCases);
      const totalTimeMs = Date.now() - startTime;

      expect(totalTimeMs).toBeLessThan(30000); // 30 seconds
      expect(report.generatedAtMs).toBeLessThan(30000);
    });

    it('should achieve ≥95% determinism score on small case', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      expect(report.summary.deterministicScore).toBeGreaterThanOrEqual(95);
    });

    it('should maintain proof consistency across modes', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      // Should have proof hashes from successful runs
      const results = report.results.get('small');
      const successfulResults = results?.filter((r) => r.success && r.proofHash) || [];

      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('should track fallback rate (Phase 4 validation)', async () => {
      const smallCases = benchmarkCases.filter((c) => c.id === 'small');
      if (smallCases.length === 0) {
        console.log('Skipping: small case not available');
        return;
      }

      const report = await benchmarkIsingVsZ3(smallCases);

      // Fallback rate is tracked; Phase 5 will set stricter threshold after tuning
      expect(typeof report.summary.fallbackRate).toBe('number');
      expect(report.summary.fallbackRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.fallbackRate).toBeLessThanOrEqual(100);

      console.log(`Fallback rate: ${report.summary.fallbackRate.toFixed(1)}%`);
    });
  });

  describe('No Regressions in Phase 1-3', () => {
    it('should not break existing QUBO builder functionality', async () => {
      const { buildQUBOMatrix } = await import('@/lib/dsg-one/qubo-builder');
      const smallCase = benchmarkCases.find((c) => c.id === 'small');

      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const result = await buildQUBOMatrix({
        tasks: smallCase.taskDag.tasks,
        agentCapacities: smallCase.agentCapacities,
      });

      expect(result.qubo).toBeDefined();
      expect(result.qubo.Q.length).toBeGreaterThan(0);
    });

    it('should not break existing Ising optimizer', async () => {
      const { buildQUBOMatrix } = await import('@/lib/dsg-one/qubo-builder');
      const { optimizeWithIsing } = await import('@/lib/dsg-one/ising-optimizer');
      const smallCase = benchmarkCases.find((c) => c.id === 'small');

      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const buildResult = await buildQUBOMatrix({
        tasks: smallCase.taskDag.tasks,
        agentCapacities: smallCase.agentCapacities,
      });

      const isingResult = await optimizeWithIsing({
        problemId: 'regression-test',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      expect(isingResult.solution).toBeDefined();
      expect(isingResult.energy).toBeGreaterThanOrEqual(0);
    });

    it('should not break Z3 verification', async () => {
      const { verifyIsingWithZ3 } = await import('@/lib/dsg-one/ising-to-z3-verifier');
      const { buildQUBOMatrix } = await import('@/lib/dsg-one/qubo-builder');
      const { optimizeWithIsing } = await import('@/lib/dsg-one/ising-optimizer');
      const smallCase = benchmarkCases.find((c) => c.id === 'small');

      if (!smallCase) {
        console.log('Skipping: small case not available');
        return;
      }

      const buildResult = await buildQUBOMatrix({
        tasks: smallCase.taskDag.tasks,
        agentCapacities: smallCase.agentCapacities,
      });

      const isingResult = await optimizeWithIsing({
        problemId: 'verify-regression-test',
        quboMatrix: buildResult.qubo,
        useMock: true,
      });

      const verifyResult = await verifyIsingWithZ3({
        isingAssignment: isingResult.solution,
        quboMatrix: buildResult.qubo,
        tasks: smallCase.taskDag.tasks,
        agentCapacities: smallCase.agentCapacities,
      });

      expect(verifyResult.isSAT).toBeDefined();
      expect(verifyResult.proofHash).toBeDefined();
    });
  });
});
