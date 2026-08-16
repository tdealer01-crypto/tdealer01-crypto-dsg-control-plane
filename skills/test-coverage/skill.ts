import { seedData } from '@/lib/dsg/seed/seed-engine';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';

export interface TestCoverageInput {
  jobId: string;
  workspaceId: string;
  previousCoveragePct: number;
  currentCoveragePct: number;
  threshold?: number;
}

export interface TestCoverageResult {
  ok: boolean;
  jobId: string;
  previousCoveragePct: number;
  currentCoveragePct: number;
  coverageIncreased: boolean;
  needsMoreTests: boolean;
  z3ProofHash: string;
  blockedReasons: string[];
}

export async function runTestCoverage(input: TestCoverageInput): Promise<TestCoverageResult> {
  const threshold = input.threshold ?? 80;
  const newCoverageGtePrev = input.currentCoveragePct >= input.previousCoveragePct;

  const seedResult = await seedData({
    dataType: 'test_coverage',
    query: `coverage report for job ${input.jobId}`,
    requiredEvidence: true,
    context: JSON.stringify({ previous: input.previousCoveragePct, current: input.currentCoveragePct }),
  });

  const z3Result = await runZ3AgentGate({
    agentType: 'test-coverage',
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow: newCoverageGtePrev && seedResult.ok,
    evidenceExists: seedResult.ok,
    mockState: false,
    testRunComplete: seedResult.ok,
    newCoverageGtePrev,
    dataNeeded: true,
    dataUnknown: !seedResult.ok,
    searchAttempted: seedResult.searchAttempted,
  });

  const blockedReasons = [
    ...z3Result.violations.map((violation) => violation.code),
    ...(seedResult.ok ? [] : [seedResult.blockReason ?? 'COVERAGE_EVIDENCE_UNAVAILABLE']),
  ];

  return {
    ok: z3Result.pass && seedResult.ok && newCoverageGtePrev,
    jobId: input.jobId,
    previousCoveragePct: input.previousCoveragePct,
    currentCoveragePct: input.currentCoveragePct,
    coverageIncreased: newCoverageGtePrev,
    needsMoreTests: input.currentCoveragePct < threshold,
    z3ProofHash: z3Result.z3ProofHash,
    blockedReasons,
  };
}
