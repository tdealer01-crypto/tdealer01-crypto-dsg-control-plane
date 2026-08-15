import { createHash } from 'node:crypto';
import { init } from 'z3-solver';
import {
  MAKK8_INVARIANT_SET,
  MAKK8_VERSION,
  Makk8Arbiter,
  type Makk8ActionData,
  type Makk8InvariantSnapshot,
} from './makk8-arbiter';

export type Makk8Z3Status = 'SAT' | 'UNSAT' | 'UNKNOWN';

export interface Makk8Z3VerificationResult {
  ok: boolean;
  decision: 'ALLOW' | 'BLOCK';
  status: Makk8Z3Status;
  reason: 'SAMMA_Z3_VERIFIED' | 'PATH_CONFLICT' | 'Z3_UNKNOWN';
  invariantSet: string;
  makk8Version: string;
  artifact: Makk8InvariantSnapshot;
  constraintsHash: string;
  proofHash: string;
  evaluationTimeMs: number;
}

const INVARIANT_NAMES: Array<keyof Makk8InvariantSnapshot> = [
  'rightView',
  'rightResolve',
  'rightSpeech',
  'rightConduct',
  'rightLivelihood',
  'rightEffort',
  'rightMindfulness',
  'rightSamadhi',
];

/**
 * Formal Makk-8 verification using the actual z3-solver runtime.
 *
 * The boolean Makk-8 snapshot is bound into SMT-LIB, then Z3 must satisfy
 * the conjunction of all eight invariants. This prevents the runtime from
 * calling a plain boolean check "Z3 verification" without invoking Z3.
 */
export async function verifyMakk8WithZ3(
  actionData: Makk8ActionData,
  timeoutMs = 5_000,
): Promise<Makk8Z3VerificationResult> {
  const startedAt = Date.now();
  const logical = new Makk8Arbiter().verifyPathIntegrity(actionData);
  const smt2 = buildMakk8Smt2(logical.artifact);
  const constraintsHash = sha256(smt2);

  let status: Makk8Z3Status = 'UNKNOWN';

  try {
    const { Context } = await init();
    const ctx = Context('makk8-desktop-gate');
    const solver = new ctx.Solver();

    try {
      solver.set('timeout', timeoutMs);
    } catch {
      // Keep verification functional on Z3 builds that do not expose timeout configuration.
    }

    solver.fromString(smt2);
    const rawStatus = await solver.check();
    status = rawStatus === 'sat' ? 'SAT' : rawStatus === 'unsat' ? 'UNSAT' : 'UNKNOWN';
  } catch {
    status = 'UNKNOWN';
  }

  const ok = logical.ok && status === 'SAT';
  const reason: Makk8Z3VerificationResult['reason'] =
    ok ? 'SAMMA_Z3_VERIFIED' : status === 'UNKNOWN' ? 'Z3_UNKNOWN' : 'PATH_CONFLICT';

  const proofHash = sha256({
    makk8Version: MAKK8_VERSION,
    invariantSet: MAKK8_INVARIANT_SET,
    artifact: logical.artifact,
    status,
    constraintsHash,
  });

  return {
    ok,
    decision: ok ? 'ALLOW' : 'BLOCK',
    status,
    reason,
    invariantSet: MAKK8_INVARIANT_SET,
    makk8Version: MAKK8_VERSION,
    artifact: logical.artifact,
    constraintsHash,
    proofHash,
    evaluationTimeMs: Date.now() - startedAt,
  };
}

export function buildMakk8Smt2(artifact: Makk8InvariantSnapshot): string {
  const declarations = INVARIANT_NAMES.map((name) => `(declare-const ${name} Bool)`).join('\n');
  const bindings = INVARIANT_NAMES.map(
    (name) => `(assert (= ${name} ${artifact[name] ? 'true' : 'false'}))`,
  ).join('\n');
  const conjunction = `(assert (and ${INVARIANT_NAMES.join(' ')}))`;

  return [
    '(set-logic QF_UF)',
    declarations,
    bindings,
    conjunction,
  ].join('\n');
}

function sha256(value: unknown): string {
  const payload = typeof value === 'string' ? value : stableJson(value);
  return createHash('sha256').update(payload).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
