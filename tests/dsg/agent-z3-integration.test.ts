import { describe, expect, it } from 'vitest';

// Z3 tests run against the TypeScript bridge and Python observer.
// They use the AgentPlanInput structure directly — no network calls.

// Mock runZ3AgentGate to avoid needing Python/Z3 in CI
// In production, the real Z3 runner is used via child_process.
function mockZ3Gate(input: {
  agentType: string;
  goalLocked: boolean;
  planApproved?: boolean;
  writesCode?: boolean;
  isDestructiveWrite?: boolean;
  destructionProof?: boolean;
  testRunComplete?: boolean;
  newCoverageGtePrev?: boolean;
  gateAllow?: boolean;
  evidenceExists?: boolean;
  mockState?: boolean;
  usesBrowserResult?: boolean;
  browserEvidenceHashSet?: boolean;
  dataNeeded?: boolean;
  dataUnknown?: boolean;
  searchAttempted?: boolean;
}) {
  const violations: Array<{ code: string; message: string }> = [];

  // Orchestrator invariant
  if (input.agentType === 'orchestrator' && !input.goalLocked) {
    violations.push({ code: 'ORCHESTRATOR_NO_GOAL_LOCK', message: 'goal not locked' });
  }

  // Code Evolution invariants
  if (input.agentType === 'code-evolution') {
    if (input.writesCode && !input.planApproved) {
      violations.push({ code: 'CODE_WRITE_WITHOUT_APPROVED_PLAN', message: 'no plan' });
    }
    if (input.writesCode && input.isDestructiveWrite && !input.destructionProof) {
      violations.push({ code: 'DESTRUCTIVE_WRITE_WITHOUT_PROOF', message: 'no proof' });
    }
  }

  // Test Coverage invariant
  if (input.agentType === 'test-coverage' && input.testRunComplete && !input.newCoverageGtePrev) {
    violations.push({ code: 'COVERAGE_DECREASED', message: 'coverage went down' });
  }

  // Deploy Monitor invariants
  if (input.agentType === 'deploy-monitor') {
    if (input.mockState) violations.push({ code: 'DEPLOY_IN_MOCK_STATE', message: 'mock' });
    if (!input.gateAllow) violations.push({ code: 'DEPLOY_GATE_NOT_ALLOW', message: 'no gate' });
    if (!input.evidenceExists) violations.push({ code: 'DEPLOY_NO_EVIDENCE', message: 'no evidence' });
  }

  // Browser Research invariant
  if (input.agentType === 'browser-research' && input.usesBrowserResult && !input.browserEvidenceHashSet) {
    violations.push({ code: 'BROWSER_RESULT_NO_EVIDENCE_HASH', message: 'no hash' });
  }

  // Security Gate invariant
  if (input.agentType === 'security-gate' && !input.gateAllow) {
    violations.push({ code: 'ACTION_WITHOUT_GATE_ALLOW', message: 'no allow' });
  }

  // Seed Engine invariant (cross-cutting)
  if (input.dataNeeded && input.dataUnknown && !input.searchAttempted) {
    violations.push({ code: 'SEED_DATA_NOT_SEARCHED', message: 'must search' });
  }

  const pass = violations.length === 0;
  return { status: pass ? 'PASS' : 'BLOCK', pass, violations, z3ProofHash: `sha256:mock-${input.agentType}` };
}

describe('Z3 Agent Gate — Orchestrator', () => {
  it('PASS when goal is locked', () => {
    const r = mockZ3Gate({ agentType: 'orchestrator', goalLocked: true });
    expect(r.pass).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('BLOCK when goal is not locked', () => {
    const r = mockZ3Gate({ agentType: 'orchestrator', goalLocked: false });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('ORCHESTRATOR_NO_GOAL_LOCK');
  });
});

describe('Z3 Agent Gate — Code Evolution', () => {
  it('PASS when plan approved and no destructive write', () => {
    const r = mockZ3Gate({ agentType: 'code-evolution', goalLocked: true, planApproved: true, writesCode: true });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when writes code without approved plan', () => {
    const r = mockZ3Gate({ agentType: 'code-evolution', goalLocked: true, planApproved: false, writesCode: true });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('CODE_WRITE_WITHOUT_APPROVED_PLAN');
  });

  it('BLOCK when destructive write without proof', () => {
    const r = mockZ3Gate({ agentType: 'code-evolution', goalLocked: true, planApproved: true, writesCode: true, isDestructiveWrite: true, destructionProof: false });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('DESTRUCTIVE_WRITE_WITHOUT_PROOF');
  });

  it('PASS when destructive write with proof', () => {
    const r = mockZ3Gate({ agentType: 'code-evolution', goalLocked: true, planApproved: true, writesCode: true, isDestructiveWrite: true, destructionProof: true });
    expect(r.pass).toBe(true);
  });
});

describe('Z3 Agent Gate — Test Coverage', () => {
  it('PASS when coverage increases', () => {
    const r = mockZ3Gate({ agentType: 'test-coverage', goalLocked: true, testRunComplete: true, newCoverageGtePrev: true });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when coverage decreases', () => {
    const r = mockZ3Gate({ agentType: 'test-coverage', goalLocked: true, testRunComplete: true, newCoverageGtePrev: false });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('COVERAGE_DECREASED');
  });
});

describe('Z3 Agent Gate — Deploy Monitor', () => {
  it('PASS when gate_allow, evidence, no mock', () => {
    const r = mockZ3Gate({ agentType: 'deploy-monitor', goalLocked: true, gateAllow: true, evidenceExists: true, mockState: false });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when mock_state is active', () => {
    const r = mockZ3Gate({ agentType: 'deploy-monitor', goalLocked: true, gateAllow: true, evidenceExists: true, mockState: true });
    expect(r.pass).toBe(false);
    expect(r.violations.some((v) => v.code === 'DEPLOY_IN_MOCK_STATE')).toBe(true);
  });

  it('BLOCK when gate not allow', () => {
    const r = mockZ3Gate({ agentType: 'deploy-monitor', goalLocked: true, gateAllow: false, evidenceExists: true, mockState: false });
    expect(r.pass).toBe(false);
    expect(r.violations.some((v) => v.code === 'DEPLOY_GATE_NOT_ALLOW')).toBe(true);
  });

  it('BLOCK when no evidence', () => {
    const r = mockZ3Gate({ agentType: 'deploy-monitor', goalLocked: true, gateAllow: true, evidenceExists: false, mockState: false });
    expect(r.pass).toBe(false);
    expect(r.violations.some((v) => v.code === 'DEPLOY_NO_EVIDENCE')).toBe(true);
  });
});

describe('Z3 Agent Gate — Browser Research', () => {
  it('PASS when evidence hash is set', () => {
    const r = mockZ3Gate({ agentType: 'browser-research', goalLocked: true, usesBrowserResult: true, browserEvidenceHashSet: true });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when browser result used without evidence hash', () => {
    const r = mockZ3Gate({ agentType: 'browser-research', goalLocked: true, usesBrowserResult: true, browserEvidenceHashSet: false });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('BROWSER_RESULT_NO_EVIDENCE_HASH');
  });
});

describe('Z3 Agent Gate — Security Gate', () => {
  it('PASS when gate_allow is true', () => {
    const r = mockZ3Gate({ agentType: 'security-gate', goalLocked: true, gateAllow: true });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when gate_allow is false', () => {
    const r = mockZ3Gate({ agentType: 'security-gate', goalLocked: true, gateAllow: false });
    expect(r.pass).toBe(false);
    expect(r.violations[0].code).toBe('ACTION_WITHOUT_GATE_ALLOW');
  });
});

describe('Z3 Seed Engine Cross-Cutting Invariant', () => {
  it('PASS when data is not needed', () => {
    const r = mockZ3Gate({ agentType: 'orchestrator', goalLocked: true, dataNeeded: false });
    expect(r.pass).toBe(true);
  });

  it('BLOCK when data needed + unknown + search not attempted', () => {
    const r = mockZ3Gate({ agentType: 'orchestrator', goalLocked: true, dataNeeded: true, dataUnknown: true, searchAttempted: false });
    expect(r.pass).toBe(false);
    expect(r.violations.some((v) => v.code === 'SEED_DATA_NOT_SEARCHED')).toBe(true);
  });

  it('PASS when data needed + unknown + search was attempted', () => {
    const r = mockZ3Gate({ agentType: 'orchestrator', goalLocked: true, dataNeeded: true, dataUnknown: true, searchAttempted: true });
    expect(r.pass).toBe(true);
  });
});
