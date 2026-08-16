import { describe, expect, it } from 'vitest';
import {
  DSG_ONE_RUN_RECEIPT_SCHEMA,
  buildRunReceipt,
  computeRunChain,
  replayRunReceipt,
} from '../../../lib/dsg-one/run/receipt';
import { compilePlan } from '../../../lib/dsg-one/run/plan-lock';
import { applyRunEvent, judgeObservation } from '../../../lib/dsg-one/run/state-machine';
import { DSG_ONE_RUN_SCHEMA, type Run, type RunStep } from '../../../lib/dsg-one/run/types';

const T0 = '2026-08-16T10:00:00.000Z';
const ISSUED = '2026-08-16T10:05:00.000Z';

function draftRun(): Run {
  const plan = compilePlan('Deploy a preview of this branch').plan!;
  const steps: RunStep[] = plan.steps.map((step) => ({
    ...step,
    status: 'PENDING',
    gateVerdict: null,
    observation: null,
    judgement: null,
    dispatchedAt: null,
    settledAt: null,
  }));

  return {
    schema: DSG_ONE_RUN_SCHEMA,
    runId: 'run-1',
    orgId: 'org-1',
    actorId: 'user-1',
    surface: 'api',
    status: 'DRAFT',
    plan,
    planHash: null,
    approvedBy: null,
    approvedAt: null,
    expiresAt: null,
    steps,
    connectedSystems: ['vercel'],
    auditAvailable: true,
    receiptId: null,
    createdAt: T0,
    updatedAt: T0,
  };
}

/** Drive a run to VERIFIED with every step passing. */
function verifiedRun(): Run {
  let run = (applyRunEvent(draftRun(), { type: 'APPROVE', approvedBy: 'user-1', at: T0 }) as {
    run: Run;
  }).run;

  for (const step of run.steps) {
    run = (applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: step.stepId,
      verdict: 'PASS',
      at: T0,
    }) as { run: Run }).run;
    run = (applyRunEvent(run, { type: 'STEP_DISPATCHED', stepId: step.stepId, at: T0 }) as {
      run: Run;
    }).run;

    const observation = {
      planHash: run.planHash!,
      executedCommands: ['vercel deploy'],
      changedPaths: [],
      evidenceIds: [`ev-${step.ordinal}`],
      outcome: 'SUCCEEDED' as const,
    };
    const judgement = judgeObservation(run, step, observation);
    run = (applyRunEvent(run, {
      type: 'STEP_OBSERVED',
      stepId: step.stepId,
      judgement,
      at: T0,
    }) as { run: Run }).run;
    run = {
      ...run,
      steps: run.steps.map((s) => (s.stepId === step.stepId ? { ...s, observation } : s)),
    };
  }

  return run;
}

describe('buildRunReceipt', () => {
  it('refuses to issue a receipt for a live run', () => {
    const draft = draftRun();
    expect(() => buildRunReceipt(draft, ISSUED)).toThrow(/Cannot issue a receipt/);
  });

  it('issues a VERIFIED receipt carrying the plan hash and evidence count', () => {
    const run = verifiedRun();
    const receipt = buildRunReceipt(run, ISSUED);

    expect(receipt.schema).toBe(DSG_ONE_RUN_RECEIPT_SCHEMA);
    expect(receipt.result).toBe('VERIFIED');
    expect(receipt.requestedAction).toBe(run.plan.intent);
    expect(receipt.chain.planHash).toBe(run.planHash);
    expect(receipt.evidenceCount).toBe(run.steps.length);
    expect(receipt.receiptId).toMatch(/^rcpt_[0-9a-f]{32}$/);
  });

  it('keeps the claim boundary explicit', () => {
    const receipt = buildRunReceipt(verifiedRun(), ISSUED);
    expect(receipt.boundary.executedByDsg).toBe(false);
    expect(receipt.boundary.externalZ3SolverInvoked).toBe(false);
    expect(receipt.boundary.certificationClaim).toBe(false);
    expect(receipt.boundary.independentAuditClaim).toBe(false);
  });

  it('is deterministic for the same run', () => {
    const run = verifiedRun();
    expect(buildRunReceipt(run, ISSUED).chain).toEqual(
      buildRunReceipt(run, '2026-09-01T00:00:00.000Z').chain,
    );
  });

  it('reports BLOCKED with the blocking reason in its checks', () => {
    let run = (applyRunEvent(draftRun(), { type: 'APPROVE', approvedBy: 'user-1', at: T0 }) as {
      run: Run;
    }).run;
    run = (applyRunEvent(run, {
      type: 'STEP_VERIFIED',
      stepId: run.steps[0].stepId,
      verdict: 'BLOCK',
      at: T0,
    }) as { run: Run }).run;

    const receipt = buildRunReceipt(run, ISSUED);
    expect(receipt.result).toBe('BLOCKED');
    expect(receipt.checks.find((check) => check.label === 'Constraints')!.status).toBe('BLOCK');
    expect(receipt.checks.some((check) => check.status === 'SKIPPED')).toBe(true);
  });
});

describe('replayRunReceipt', () => {
  it('matches when nothing changed', () => {
    const run = verifiedRun();
    const replay = replayRunReceipt(buildRunReceipt(run, ISSUED), run);

    expect(replay.replayMatch).toBe(true);
    expect(replay.receiptIntact).toBe(true);
    expect(replay.verdictMatch).toBe(true);
    expect(replay.mismatchedFields).toHaveLength(0);
  });

  it('detects an edited receipt document', () => {
    const run = verifiedRun();
    const tampered = { ...buildRunReceipt(run, ISSUED), receiptId: 'rcpt_notarealhash' };
    const replay = replayRunReceipt(tampered, run);

    expect(replay.receiptIntact).toBe(false);
    expect(replay.replayMatch).toBe(false);
    expect(replay.reason).toContain('altered after issuance');
  });

  it('detects a plan widened after the receipt was issued', () => {
    const run = verifiedRun();
    const receipt = buildRunReceipt(run, ISSUED);

    const widened: Run = {
      ...run,
      plan: { ...run.plan, maxRiskLevel: 'critical', exclusions: [] },
    };
    const replay = replayRunReceipt(receipt, widened);

    expect(replay.replayMatch).toBe(false);
    expect(replay.mismatchedFields.map((field) => field.field)).toContain('planHash');
    expect(replay.reason).toContain('planHash');
  });

  it('detects rewritten step outcomes', () => {
    const run = verifiedRun();
    const receipt = buildRunReceipt(run, ISSUED);

    const rewritten: Run = {
      ...run,
      steps: run.steps.map((step, index) =>
        index === 0 ? { ...step, gateVerdict: 'UNSUPPORTED' as const } : step,
      ),
    };
    const replay = replayRunReceipt(receipt, rewritten);

    expect(replay.replayMatch).toBe(false);
    expect(replay.mismatchedFields.map((field) => field.field)).toContain('outcomeHash');
  });

  it('detects evidence removed after issuance', () => {
    const run = verifiedRun();
    const receipt = buildRunReceipt(run, ISSUED);

    const stripped: Run = {
      ...run,
      steps: run.steps.map((step) => ({ ...step, observation: null })),
    };
    const replay = replayRunReceipt(receipt, stripped);

    expect(replay.replayMatch).toBe(false);
    expect(replay.mismatchedFields.map((field) => field.field)).toContain('evidenceHash');
  });
});

describe('computeRunChain', () => {
  it('binds the run identity into the receipt hash', () => {
    const run = verifiedRun();
    const other = computeRunChain({ ...run, runId: 'run-2' });
    expect(other.receiptHash).not.toBe(computeRunChain(run).receiptHash);
    // The component hashes are run-independent; only the binding changes.
    expect(other.planHash).toBe(computeRunChain(run).planHash);
  });
});
