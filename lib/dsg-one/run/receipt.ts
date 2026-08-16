/**
 * DSG ONE — Proof Receipt (product layer 5).
 *
 * One settled run produces one receipt. The receipt is the product's whole
 * claim in a single document: this is what you approved, this is what ran, and
 * here is the hash chain that lets anyone re-derive the same verdict.
 *
 * Replay is what makes it worth anything. `replayRunReceipt` recomputes every
 * hash from the run and reports a per-field comparison, so provider drift,
 * orchestration changes, or an edited plan show up as a named mismatch instead
 * of silently still saying VERIFIED.
 *
 * Deliberately independent of lib/dsg-one/verified-action-receipt.ts: that
 * receipt binds a single externally-observed action, this one binds a
 * multi-step run. They share the replay idea, not a schema.
 */

import { sha256Hash } from '../../dsg/brain/hash-utils';
import { computePlanHash } from './state-machine';
import type { Run, RunStep } from './types';

export const DSG_ONE_RUN_RECEIPT_SCHEMA = 'dsg-one-run-receipt/1.0';

export type ReceiptResult = 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';

/** Hashes that must reproduce on replay. */
export interface RunReceiptChain {
  /** Hash of the plan the user approved. */
  planHash: string;
  /** Hash of the ordered step outcomes. */
  outcomeHash: string;
  /** Hash of the evidence ids gathered across the run. */
  evidenceHash: string;
  /** Hash binding all of the above plus the run identity. */
  receiptHash: string;
}

/** One line in the receipt's check list, as rendered to the user. */
export interface ReceiptCheck {
  label: string;
  status: 'PASS' | 'REVIEW' | 'BLOCK' | 'SKIPPED';
  detail: string | null;
}

export interface RunReceipt {
  schema: typeof DSG_ONE_RUN_RECEIPT_SCHEMA;
  receiptId: string;
  runId: string;
  orgId: string;
  issuedAt: string;

  result: ReceiptResult;
  /** The user's original words. */
  requestedAction: string;
  checks: ReceiptCheck[];
  evidenceCount: number;
  chain: RunReceiptChain;

  boundary: {
    /**
     * DSG orchestrated and judged; the client executor performed the work. The
     * receipt therefore proves conformance of what was reported, not that DSG
     * itself touched the customer's systems.
     */
    executedByDsg: false;
    externalZ3SolverInvoked: false;
    certificationClaim: false;
    independentAuditClaim: false;
    note: string;
  };
}

function stepOutcome(step: RunStep) {
  return {
    ordinal: step.ordinal,
    stepId: step.stepId,
    operation: step.operation,
    targetSystem: step.targetSystem,
    status: step.status,
    gateVerdict: step.gateVerdict,
    judgement: step.judgement?.status ?? null,
    reasons: step.judgement?.reasons ?? [],
  };
}

function collectEvidenceIds(run: Run): string[] {
  return run.steps
    .flatMap((step) => step.observation?.evidenceIds ?? [])
    .slice()
    .sort();
}

/**
 * Recompute a run's chain hashes from the run itself.
 *
 * Exported so replay and issuance share one derivation — a receipt that was
 * built by different code than the one that checks it proves nothing.
 */
export function computeRunChain(run: Run): RunReceiptChain {
  const planHash = computePlanHash(run.plan);
  const outcomeHash = sha256Hash(run.steps.map(stepOutcome));
  const evidenceHash = sha256Hash(collectEvidenceIds(run));

  return {
    planHash,
    outcomeHash,
    evidenceHash,
    receiptHash: sha256Hash({
      schema: DSG_ONE_RUN_RECEIPT_SCHEMA,
      runId: run.runId,
      orgId: run.orgId,
      status: run.status,
      planHash,
      outcomeHash,
      evidenceHash,
    }),
  };
}

function statusToResult(status: Run['status']): ReceiptResult {
  if (status === 'VERIFIED') return 'VERIFIED';
  if (status === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
  return 'BLOCKED';
}

function stepCheckStatus(step: RunStep): ReceiptCheck['status'] {
  switch (step.status) {
    case 'PASSED':
      return 'PASS';
    case 'REVIEW':
      return 'REVIEW';
    case 'BLOCKED':
      return 'BLOCK';
    default:
      return 'SKIPPED';
  }
}

/**
 * Issue a receipt for a settled run.
 *
 * Throws for a run that is still live: a receipt for an unfinished run would be
 * a claim about work that has not happened.
 */
export function buildRunReceipt(run: Run, issuedAt: string): RunReceipt {
  if (run.status !== 'VERIFIED' && run.status !== 'NEEDS_REVIEW' && run.status !== 'BLOCKED') {
    throw new Error(`Cannot issue a receipt for a ${run.status} run`);
  }

  const chain = computeRunChain(run);
  const evidenceIds = collectEvidenceIds(run);

  const checks: ReceiptCheck[] = [
    {
      label: 'Plan alignment',
      status: run.steps.every((step) => step.judgement?.reasons.includes('plan_hash_mismatch') !== true)
        ? 'PASS'
        : 'BLOCK',
      detail: run.planHash,
    },
    {
      label: 'Permission',
      status: run.steps.some((step) =>
        step.judgement?.reasons.some((reason) => reason.startsWith('target_system_not_in_plan')),
      )
        ? 'BLOCK'
        : 'PASS',
      detail: run.plan.allowedTargetSystems.join(', '),
    },
    {
      label: 'Constraints',
      status: run.steps.some((step) => step.gateVerdict === 'BLOCK')
        ? 'BLOCK'
        : run.steps.some((step) => step.gateVerdict === 'UNSUPPORTED' || step.gateVerdict === 'REVIEW')
          ? 'REVIEW'
          : 'PASS',
      detail: `policy ${run.plan.policyVersion}`,
    },
    ...run.steps.map((step) => ({
      label: step.summary,
      status: stepCheckStatus(step),
      detail: step.judgement?.message ?? null,
    })),
  ];

  return {
    schema: DSG_ONE_RUN_RECEIPT_SCHEMA,
    receiptId: `rcpt_${chain.receiptHash.slice(0, 32)}`,
    runId: run.runId,
    orgId: run.orgId,
    issuedAt,
    result: statusToResult(run.status),
    requestedAction: run.plan.intent,
    checks,
    evidenceCount: evidenceIds.length,
    chain,
    boundary: {
      executedByDsg: false,
      externalZ3SolverInvoked: false,
      certificationClaim: false,
      independentAuditClaim: false,
      note:
        'DSG orchestrated and judged this run against the approved plan. The client executor ' +
        'performed the work and reported what it observed. The deterministic gate is DSG-native ' +
        'and did not invoke an external Z3 solver.',
    },
  };
}

export interface ReceiptFieldComparison {
  field: keyof RunReceiptChain;
  receipt: string;
  replay: string;
  match: boolean;
}

export interface RunReplayResult {
  replayMatch: boolean;
  /** True when the receipt document has not been altered since issuance. */
  receiptIntact: boolean;
  verdictMatch: boolean;
  fields: ReceiptFieldComparison[];
  mismatchedFields: ReceiptFieldComparison[];
  reason: string;
}

/**
 * Re-derive a receipt from its run and compare.
 *
 * Two independent checks:
 *   receiptIntact — the receiptId still follows from the chain it carries, so
 *                   the document was not edited after issuance;
 *   replayMatch   — recomputing from the run reproduces every hash, so neither
 *                   the plan nor the outcomes were rewritten underneath it.
 *
 * An edited plan fails the second even when the first passes, which is exactly
 * the case a tamper check needs to catch.
 */
export function replayRunReceipt(receipt: RunReceipt, run: Run): RunReplayResult {
  const expectedId = `rcpt_${receipt.chain.receiptHash.slice(0, 32)}`;
  const receiptIntact = receipt.receiptId === expectedId;

  const replayChain = computeRunChain(run);
  const fields = (Object.keys(replayChain) as Array<keyof RunReceiptChain>).map((field) => ({
    field,
    receipt: receipt.chain[field],
    replay: replayChain[field],
    match: receipt.chain[field] === replayChain[field],
  }));

  const mismatchedFields = fields.filter((field) => !field.match);
  const verdictMatch = receipt.result === statusToResult(run.status);
  const replayMatch = mismatchedFields.length === 0 && verdictMatch && receiptIntact;

  let reason: string;
  if (!receiptIntact) {
    reason = 'Receipt document was altered after issuance.';
  } else if (mismatchedFields.length > 0) {
    reason = `Replay diverged on: ${mismatchedFields.map((field) => field.field).join(', ')}.`;
  } else if (!verdictMatch) {
    reason = `Receipt says ${receipt.result} but the run is now ${statusToResult(run.status)}.`;
  } else {
    reason = 'Replay reproduced every hash and the same verdict.';
  }

  return { replayMatch, receiptIntact, verdictMatch, fields, mismatchedFields, reason };
}
