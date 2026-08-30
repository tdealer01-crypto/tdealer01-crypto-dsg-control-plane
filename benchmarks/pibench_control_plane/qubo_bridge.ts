import { solveQubo } from '../../lib/ising/qubo/annealer';
import { buildQuboMatrix, toIsingModel } from '../../lib/ising/qubo/matrix';
import type { FormalConstraint, PolicyControl } from '../../lib/ising/qubo/types';

type Decision = 'ALLOW' | 'DENY' | 'ESCALATE';

type PolicySignals = {
  explicit_deny: boolean;
  requires_escalation: boolean;
  authorization_verified: boolean;
  mandatory_preconditions_satisfied: boolean;
  privacy_release_allowed: boolean;
  operational_action_requested: boolean;
  confidence?: number;
};

const DECISIONS: readonly Decision[] = ['ALLOW', 'DENY', 'ESCALATE'];
const ONE_HOT_PENALTY = 1000;

function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${name} must be boolean`);
  return value;
}

function parseSignals(raw: unknown): PolicySignals {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('signals must be an object');
  }
  const value = raw as Record<string, unknown>;
  return {
    explicit_deny: requireBoolean(value.explicit_deny, 'explicit_deny'),
    requires_escalation: requireBoolean(value.requires_escalation, 'requires_escalation'),
    authorization_verified: requireBoolean(value.authorization_verified, 'authorization_verified'),
    mandatory_preconditions_satisfied: requireBoolean(
      value.mandatory_preconditions_satisfied,
      'mandatory_preconditions_satisfied',
    ),
    privacy_release_allowed: requireBoolean(value.privacy_release_allowed, 'privacy_release_allowed'),
    operational_action_requested: requireBoolean(
      value.operational_action_requested,
      'operational_action_requested',
    ),
    confidence:
      typeof value.confidence === 'number' && Number.isFinite(value.confidence)
        ? Math.max(0, Math.min(1, value.confidence))
        : 0,
  };
}

function decisionBiases(signals: PolicySignals): Record<Decision, number> {
  const denyTrigger =
    signals.explicit_deny ||
    (signals.operational_action_requested && !signals.privacy_release_allowed);
  const escalateTrigger =
    signals.requires_escalation ||
    (signals.operational_action_requested &&
      (!signals.authorization_verified || !signals.mandatory_preconditions_satisfied));
  const allowTrigger = !denyTrigger && !escalateTrigger;

  return {
    ALLOW: allowTrigger ? -4 : 10,
    DENY: denyTrigger ? -6 : 6,
    ESCALATE: !denyTrigger && escalateTrigger ? -5 : 5,
  };
}

function controlFor(decision: Decision, bias: number): PolicyControl {
  // solveQubo minimizes cost - value - riskReduction. Split the signed bias
  // across non-negative cost/value fields so the diagonal objective equals it.
  return {
    id: decision,
    label: decision,
    framework: 'PI-Bench formal decision advisory',
    cost: bias > 0 ? bias : 0,
    value: bias < 0 ? -bias : 0,
    riskReduction: 0,
  };
}

function solve(signals: PolicySignals) {
  const biases = decisionBiases(signals);
  const controls = DECISIONS.map((decision) => controlFor(decision, biases[decision]));
  const constraints: FormalConstraint[] = [
    {
      kind: 'at_least',
      id: 'decision-at-least-one',
      controls: [...DECISIONS],
      minimum: 1,
      penalty: ONE_HOT_PENALTY,
    },
    {
      kind: 'mutual_exclusion',
      id: 'allow-xor-deny',
      left: 'ALLOW',
      right: 'DENY',
      penalty: ONE_HOT_PENALTY,
    },
    {
      kind: 'mutual_exclusion',
      id: 'allow-xor-escalate',
      left: 'ALLOW',
      right: 'ESCALATE',
      penalty: ONE_HOT_PENALTY,
    },
    {
      kind: 'mutual_exclusion',
      id: 'deny-xor-escalate',
      left: 'DENY',
      right: 'ESCALATE',
      penalty: ONE_HOT_PENALTY,
    },
  ];

  const problem = {
    controls,
    constraints,
    defaultPenalty: ONE_HOT_PENALTY,
  };
  const matrix = buildQuboMatrix(problem);
  const ising = toIsingModel(matrix);
  const solution = solveQubo(problem, {
    seed: 42,
    maxIterations: 5000,
    coolingRate: 0.995,
    retainTrajectorySteps: 0,
  });

  if (!solution.feasible) throw new Error('PR1180 QUBO solver returned an infeasible decision set');
  if (solution.selected.length !== 1 || !DECISIONS.includes(solution.selected[0] as Decision)) {
    throw new Error(`PR1180 QUBO solver violated one-hot decision contract: ${solution.selected.join(',')}`);
  }

  return {
    schema: 'dsg-pr1180-qubo-advisory/v1',
    engine: solution.solverVersion,
    seed: solution.seed,
    candidate: solution.selected[0] as Decision,
    feasible: solution.feasible,
    energy: solution.energy,
    iterations: solution.iterations,
    final_temperature: solution.finalTemperature,
    provenance_hash: solution.provenanceHash,
    biases,
    matrix: {
      variables: matrix.variables,
      decision_count: matrix.decisionCount,
      matrix: matrix.matrix,
      offset: matrix.offset,
    },
    ising: {
      variables: ising.variables,
      h: ising.h,
      J: ising.J,
      offset: ising.offset,
    },
    verdicts: solution.verdicts,
  };
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += String(chunk);
  if (!input.trim()) throw new Error('missing policy signals on stdin');
  const signals = parseSignals(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(solve(signals))}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`PR1180_QUBO_BRIDGE_ERROR: ${message}\n`);
  process.exitCode = 1;
});
