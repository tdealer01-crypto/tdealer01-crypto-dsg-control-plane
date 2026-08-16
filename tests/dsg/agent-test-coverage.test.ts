import { describe, expect, it } from 'vitest';
import { runTestCoverage } from '../../skills/test-coverage/skill';

/**
 * Test-coverage agent truth-boundary tests.
 *
 * The current seed engine has no verified fetcher for test_coverage, so caller-
 * supplied percentages cannot self-certify a PASS. The monotonic arithmetic is
 * still reported, but the overall action must BLOCK until verified coverage
 * evidence is wired to a real source.
 */
describe('Test Coverage Agent — evidence-first invariant', () => {
  it('reports arithmetic increase but does not PASS without verified coverage evidence', async () => {
    const r = await runTestCoverage({
      jobId: 'j1', workspaceId: 'ws1', previousCoveragePct: 60, currentCoveragePct: 65,
    });
    expect(r.coverageIncreased).toBe(true);
    expect(r.ok).toBe(false);
    expect(r.blockedReasons).toContain('NO_VERIFIED_FETCHER_FOR_TEST_COVERAGE:CALLER_CONTEXT_REJECTED');
  });

  it('reports equal coverage as non-decreasing but remains evidence-blocked', async () => {
    const r = await runTestCoverage({
      jobId: 'j2', workspaceId: 'ws1', previousCoveragePct: 70, currentCoveragePct: 70,
    });
    expect(r.coverageIncreased).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('blocks a measured decrease independently of evidence availability', async () => {
    const r = await runTestCoverage({
      jobId: 'j3', workspaceId: 'ws1', previousCoveragePct: 80, currentCoveragePct: 75,
    });
    expect(r.coverageIncreased).toBe(false);
    expect(r.ok).toBe(false);
  });

  it('reports needsMoreTests below threshold without converting it into verified evidence', async () => {
    const r = await runTestCoverage({
      jobId: 'j4', workspaceId: 'ws1', previousCoveragePct: 50, currentCoveragePct: 55, threshold: 80,
    });
    expect(r.needsMoreTests).toBe(true);
    expect(r.ok).toBe(false);
  });

  it('reports threshold arithmetic independently from the evidence gate', async () => {
    const r = await runTestCoverage({
      jobId: 'j5', workspaceId: 'ws1', previousCoveragePct: 80, currentCoveragePct: 85, threshold: 80,
    });
    expect(r.needsMoreTests).toBe(false);
    expect(r.ok).toBe(false);
  });

  it('returns a real Z3 gate proof marker or explicit unavailable marker, never a mocked hash', async () => {
    const r = await runTestCoverage({
      jobId: 'j6', workspaceId: 'ws1', previousCoveragePct: 50, currentCoveragePct: 55,
    });
    expect(r.z3ProofHash).toMatch(/^sha256:/);
    expect(r.z3ProofHash).not.toContain('mock');
  });
});
