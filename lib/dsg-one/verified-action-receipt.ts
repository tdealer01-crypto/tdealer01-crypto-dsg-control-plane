import { createHash } from 'node:crypto';

/**
 * Verified Agent Action receipt.
 *
 * The sellable unit of the canonical DSG chain: one action, verified after it
 * was authorized, bound to the hashes that produced the verdict, and checkable
 * again later by someone who did not run it.
 *
 * Claim boundary — this file does NOT do any of the following, and no caller
 * may describe it as doing them:
 *   - it does not execute anything (the customer runtime executes; DSG verifies);
 *   - it does not invoke an external Z3 solver;
 *   - it is not a certification and not an independent third-party audit.
 * A receipt proves that a specific chain of hashes produced a specific verdict,
 * and that a later run either reproduced those hashes or did not.
 */

export const VERIFIED_ACTION_RECEIPT_SCHEMA = 'dsg-verified-action-receipt/1.0';

export type VerifiedActionSurface = 'api' | 'unify' | 'trinity-mcp';

/**
 * Hashes lifted from one canonical chain run. Every field is either a hash the
 * chain produced or null when that stage was never reached, so a BLOCK receipt
 * still records exactly how far the action got.
 *
 * These hashes split into two groups, and conflating them would make the replay
 * claim false:
 *
 *   - Reproducible: derived only from the request inputs. A later run over the
 *     same inputs must produce identical values, so these are what replayMatch
 *     is computed from.
 *   - Run-scoped: derived partly from wall-clock time, because
 *     evaluateAgentCommandGate and buildAgentActionResultReceipt both hash a
 *     timestamp (an audit receipt is supposed to record when it happened).
 *     These are recorded and reported, but never asserted to reproduce.
 *
 * deterministicReceiptHash is run-scoped despite its name: it folds in the two
 * timestamped hashes above, so it changes between runs of the same action.
 */
export interface VerifiedActionChainBinding {
  canonicalChainHash: string | null;
  optimizationProofHash: string | null;
  actionPlanHash: string | null;
  gateDecisionHash: string | null;
  simulationWitnessHash: string | null;
  resultReceiptHash: string | null;
  acceptanceHash: string | null;
  finalReceiptHash: string | null;
  deterministicReceiptHash: string | null;
}

export interface VerifiedActionReceipt {
  schema: typeof VERIFIED_ACTION_RECEIPT_SCHEMA;
  receiptId: string;
  issuedAt: string;
  surface: VerifiedActionSurface;
  workspaceId: string;
  problemId: string;
  verdict: 'PASS' | 'BLOCK';
  stage: string;
  executionPerformed: boolean;
  replayable: boolean;
  reason: string | null;
  chain: VerifiedActionChainBinding;
  boundary: {
    certificationClaim: false;
    independentAuditClaim: false;
    externalZ3SolverInvoked: false;
    executedByDsg: false;
    statement: string;
  };
}

const BOUNDARY_STATEMENT =
  'DSG verified an action that the caller authorized and executed. This receipt binds a verdict to a chain of hashes; it is not a certification, not an independent audit, and does not assert that an external Z3 solver was invoked.';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stable(record[key])]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function hashOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * The receiptId covers everything a verifier must not be able to change without
 * detection: the verdict, the stage it stopped at, and every chain hash. It
 * deliberately excludes issuedAt so the same chain run is addressable by the
 * same id.
 */
function computeReceiptId(
  receipt: Omit<VerifiedActionReceipt, 'receiptId' | 'issuedAt'>,
): string {
  return sha256({
    schema: receipt.schema,
    surface: receipt.surface,
    workspaceId: receipt.workspaceId,
    problemId: receipt.problemId,
    verdict: receipt.verdict,
    stage: receipt.stage,
    executionPerformed: receipt.executionPerformed,
    replayable: receipt.replayable,
    reason: receipt.reason,
    chain: receipt.chain,
  });
}

/**
 * Lift the chain hashes out of a canonical-chain result. The result shape is a
 * discriminated union whose BLOCK arms omit later stages, so every field is
 * read defensively rather than assumed present.
 */
export function extractChainBinding(canonicalResult: unknown): VerifiedActionChainBinding {
  const result = asRecord(canonicalResult);
  const upstream = asRecord(result?.upstream);
  const binding = asRecord(upstream?.binding);
  const stages = asRecord(upstream?.stages);
  const optimization = asRecord(stages?.optimization);
  const optimizationProof = asRecord(optimization?.proof);
  const gate = asRecord(result?.gate);
  const simulation = asRecord(result?.simulation);
  const resultReceipt = asRecord(result?.resultReceipt);
  const acceptance = asRecord(result?.acceptance);
  const compilation = asRecord(result?.compilation);
  const plan = asRecord(compilation?.plan);

  return {
    canonicalChainHash: hashOrNull(binding?.chainHash),
    optimizationProofHash: hashOrNull(optimizationProof?.proofHash),
    actionPlanHash: hashOrNull(plan?.actionPlanHash),
    gateDecisionHash: hashOrNull(gate?.decisionHash),
    simulationWitnessHash: hashOrNull(simulation?.witnessHash),
    resultReceiptHash: hashOrNull(resultReceipt?.receiptHash),
    acceptanceHash: hashOrNull(acceptance?.acceptanceHash),
    finalReceiptHash: hashOrNull(acceptance?.finalReceiptHash),
    deterministicReceiptHash: hashOrNull(result?.deterministicReceiptHash),
  };
}

export function buildVerifiedActionReceipt(input: {
  canonicalResult: unknown;
  surface: VerifiedActionSurface;
  workspaceId: string;
  problemId: string;
  issuedAt?: string;
}): VerifiedActionReceipt {
  const result = asRecord(input.canonicalResult);
  const replay = asRecord(result?.replay);
  const verdict = result?.verdict === 'PASS' ? 'PASS' : 'BLOCK';

  const body = {
    schema: VERIFIED_ACTION_RECEIPT_SCHEMA,
    surface: input.surface,
    workspaceId: input.workspaceId,
    problemId: input.problemId,
    verdict,
    stage: String(result?.stage ?? 'unknown'),
    executionPerformed: result?.executionPerformed === true,
    replayable: replay?.replayable === true,
    reason: typeof result?.reason === 'string' ? result.reason : null,
    chain: extractChainBinding(input.canonicalResult),
    boundary: {
      certificationClaim: false,
      independentAuditClaim: false,
      externalZ3SolverInvoked: false,
      executedByDsg: false,
      statement: BOUNDARY_STATEMENT,
    },
  } as const satisfies Omit<VerifiedActionReceipt, 'receiptId' | 'issuedAt'>;

  return {
    ...body,
    receiptId: computeReceiptId(body),
    issuedAt: input.issuedAt ?? new Date().toISOString(),
  };
}

/**
 * Flat rather than a discriminated union: this project compiles with
 * `strict: false`, so narrowing on a boolean literal discriminant does not
 * apply and every field has to be readable without it.
 */
export interface ReceiptIntegrityResult {
  intact: boolean;
  presentedReceiptId: string;
  expectedReceiptId: string;
  reason: string;
}

/**
 * Recompute a receipt's id from its own contents. This detects a receipt whose
 * verdict, stage, or any chain hash was edited after issue. It is an integrity
 * check on the document, not a re-run of the action — use replayVerifiedAction
 * for that.
 */
export function checkReceiptIntegrity(receipt: VerifiedActionReceipt): ReceiptIntegrityResult {
  if (receipt.schema !== VERIFIED_ACTION_RECEIPT_SCHEMA) {
    return {
      intact: false,
      presentedReceiptId: receipt.receiptId,
      expectedReceiptId: '',
      reason: `Unsupported receipt schema: ${String(receipt.schema)}`,
    };
  }

  const { receiptId, issuedAt: _issuedAt, ...body } = receipt;
  const expected = computeReceiptId(body);
  const intact = expected === receiptId;
  return {
    intact,
    presentedReceiptId: receiptId,
    expectedReceiptId: expected,
    reason: intact
      ? 'Receipt contents hash to the presented receiptId.'
      : 'Receipt contents do not hash to the presented receiptId.',
  };
}

export interface ReplayFieldComparison {
  field: keyof VerifiedActionChainBinding;
  receipt: string | null;
  replay: string | null;
  match: boolean;
}

export interface ReplayVerificationResult {
  replayMatch: boolean;
  receiptIntact: boolean;
  verdictMatch: boolean;
  comparedFields: number;
  mismatchedFields: ReplayFieldComparison[];
  fields: ReplayFieldComparison[];
  /** Timestamped hashes, reported for audit but excluded from replayMatch. */
  runScopedFields: ReplayFieldComparison[];
  reason: string;
}

/** Input-determined. A replay over the same inputs must reproduce all of these. */
export const REPRODUCIBLE_CHAIN_FIELDS: Array<keyof VerifiedActionChainBinding> = [
  'canonicalChainHash',
  'optimizationProofHash',
  'actionPlanHash',
  'simulationWitnessHash',
  'acceptanceHash',
  'finalReceiptHash',
];

/** Time-dependent by design. Recorded, never asserted to reproduce. */
export const RUN_SCOPED_CHAIN_FIELDS: Array<keyof VerifiedActionChainBinding> = [
  'gateDecisionHash',
  'resultReceiptHash',
  'deterministicReceiptHash',
];

/**
 * Independently re-verify a receipt against a fresh canonical-chain run.
 *
 * This is the measurable claim the product is sold on: given the same inputs,
 * does the chain still produce the same input-determined hashes and the same
 * verdict? A mismatch is reported per field so the caller can see which stage
 * drifted — provider, model, and orchestration changes surface here rather than
 * silently passing.
 *
 * Run-scoped hashes are compared and returned separately. They are expected to
 * differ between runs and a difference there is not a replay failure.
 */
export function replayVerifiedAction(
  receipt: VerifiedActionReceipt,
  freshCanonicalResult: unknown,
): ReplayVerificationResult {
  const integrity = checkReceiptIntegrity(receipt);
  const fresh = extractChainBinding(freshCanonicalResult);
  const freshVerdict = asRecord(freshCanonicalResult)?.verdict === 'PASS' ? 'PASS' : 'BLOCK';

  const compare = (field: keyof VerifiedActionChainBinding): ReplayFieldComparison => ({
    field,
    receipt: receipt.chain[field],
    replay: fresh[field],
    match: receipt.chain[field] === fresh[field],
  });

  const fields = REPRODUCIBLE_CHAIN_FIELDS.map(compare);
  const runScopedFields = RUN_SCOPED_CHAIN_FIELDS.map(compare);

  const mismatchedFields = fields.filter((entry) => !entry.match);
  const verdictMatch = receipt.verdict === freshVerdict;
  const replayMatch = integrity.intact && verdictMatch && mismatchedFields.length === 0;

  let reason: string;
  if (!integrity.intact) {
    reason = integrity.reason;
  } else if (mismatchedFields.length > 0) {
    reason = `Replay diverged on ${mismatchedFields.length} of ${fields.length} reproducible chain hashes: ${mismatchedFields
      .map((entry) => entry.field)
      .join(', ')}.`;
  } else if (!verdictMatch) {
    reason = `Replay verdict ${freshVerdict} does not match receipt verdict ${receipt.verdict}.`;
  } else {
    reason = `Replay reproduced all ${fields.length} reproducible chain hashes and the ${receipt.verdict} verdict.`;
  }

  return {
    replayMatch,
    receiptIntact: integrity.intact,
    verdictMatch,
    comparedFields: fields.length,
    mismatchedFields,
    fields,
    runScopedFields,
    reason,
  };
}
