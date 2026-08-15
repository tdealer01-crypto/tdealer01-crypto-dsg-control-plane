import { createHash } from 'node:crypto';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';
import { runVerifiedOptimizationPipeline } from './verified-optimization-pipeline';

export type CanonicalSimulationWitness = {
  schemaVersion: 'dsg-simulation-witness/1.0';
  problemId: string;
  inputHash: string;
  scenarioHash: string;
  deterministic: true;
};

export type CanonicalE2ERequest = {
  problemId: string;
  tasks: Task[];
  agentCapacities: AgentCapacity[];
  seed?: number;
  useMock?: boolean;
  timeout?: number;
  exactProofMaxVariables?: number;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

/**
 * Deterministic upstream simulation witness for the canonical optimization chain.
 *
 * This stage does NOT authorize execution and does NOT claim optimality. It binds
 * the exact normalized problem that will be handed to QUBO -> Ising -> Z3/exact.
 * Runtime/ROM action simulation remains a separate pre-execution check after an
 * Action IR exists, so simulation cannot silently become an authorization gate.
 */
export function buildCanonicalSimulationWitness(
  req: CanonicalE2ERequest,
): CanonicalSimulationWitness {
  const normalizedProblem = {
    problemId: req.problemId,
    tasks: req.tasks,
    agentCapacities: req.agentCapacities,
    seed: req.seed ?? 0,
  };
  const inputHash = hash(normalizedProblem);
  return {
    schemaVersion: 'dsg-simulation-witness/1.0',
    problemId: req.problemId,
    inputHash,
    scenarioHash: hash({ inputHash, stage: 'simulation', deterministic: true }),
    deterministic: true,
  };
}

export async function runCanonicalE2EOptimization(req: CanonicalE2ERequest) {
  const simulation = buildCanonicalSimulationWitness(req);
  const optimization = await runVerifiedOptimizationPipeline(req);

  const chainHash = hash({
    schemaVersion: 'dsg-canonical-e2e/1.0',
    simulationWitnessHash: simulation.scenarioHash,
    quboHash: optimization.quboHash,
    optimizationProofHash: optimization.proof.proofHash,
    optimizationReceiptHash: optimization.proof.receiptHash,
    verdict: optimization.verdict,
  });

  return {
    schemaVersion: 'dsg-canonical-e2e/1.0' as const,
    executionAllowed: false as const,
    stages: {
      simulation,
      optimization,
    },
    binding: {
      simulationWitnessHash: simulation.scenarioHash,
      quboHash: optimization.quboHash,
      optimizationProofHash: optimization.proof.proofHash,
      chainHash,
      deterministic: true as const,
    },
    nextGate:
      optimization.verdict === 'VERIFIED_GLOBAL_OPTIMUM'
        ? 'Compile the verified solution into Action IR, bind the optimization proofHash, then require DSG plan/scope ALLOW before any executor runs.'
        : 'BLOCK: no execution. The canonical chain requires VERIFIED_GLOBAL_OPTIMUM before Action IR compilation.',
  };
}
