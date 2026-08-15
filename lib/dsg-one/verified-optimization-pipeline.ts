import { createHash } from 'node:crypto';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';
import {
  buildQUBOMatrix,
  calculateQUBOEnergy,
  type QUBOMatrix,
} from './qubo-builder';
import { optimizeWithIsing } from './ising-optimizer';
import { verifyIsingWithZ3 } from './ising-to-z3-verifier';

export type OptimizationVerdict =
  | 'VERIFIED_GLOBAL_OPTIMUM'
  | 'VERIFIED_FEASIBLE'
  | 'BLOCKED_INFEASIBLE'
  | 'BLOCKED_NOT_GLOBAL_OPTIMUM';

export interface VerifiedOptimizationRequest {
  problemId: string;
  tasks: Task[];
  agentCapacities: AgentCapacity[];
  seed?: number;
  useMock?: boolean;
  timeout?: number;
  exactProofMaxVariables?: number;
}

export interface ExactQuboProof {
  attempted: boolean;
  complete: boolean;
  statesChecked: number;
  bestEnergy: number | null;
  candidateEnergy: number;
  candidateIsGlobal: boolean | null;
  proofHash: string;
  reason: string;
}

export interface VerifiedOptimizationResult {
  verdict: OptimizationVerdict;
  executionAllowed: false;
  problemId: string;
  quboHash: string;
  candidate: {
    solution: Record<string, number | boolean>;
    solutionHash: string;
    energy: number;
    solverMode: string;
    solverVersion: string;
  };
  z3: {
    status: string;
    feasible: boolean;
    proofHash: string;
    version: string;
  };
  exact: ExactQuboProof;
  proof: {
    proofHash: string;
    receiptHash: string;
    deterministic: true;
  };
  nextGate: string;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((out, key) => {
        out[key] = stable((value as Record<string, unknown>)[key]);
        return out;
      }, {});
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function vectorToSolution(qubo: QUBOMatrix, mask: bigint): Record<string, number> {
  const solution: Record<string, number> = {};
  for (let i = 0; i < qubo.numVariables; i++) {
    solution[qubo.variables[i].id] = Number((mask >> BigInt(i)) & 1n);
  }
  return solution;
}

function exactGlobalQuboProof(
  qubo: QUBOMatrix,
  candidateEnergy: number,
  maxVariables: number,
): ExactQuboProof {
  if (qubo.numVariables > maxVariables) {
    const material = {
      quboHash: qubo.problemHash,
      candidateEnergy,
      numVariables: qubo.numVariables,
      maxVariables,
      complete: false,
    };
    return {
      attempted: false,
      complete: false,
      statesChecked: 0,
      bestEnergy: null,
      candidateEnergy,
      candidateIsGlobal: null,
      proofHash: sha256(material),
      reason: `Exact proof skipped: ${qubo.numVariables} variables exceeds deterministic exhaustive bound ${maxVariables}.`,
    };
  }

  const totalStates = 1n << BigInt(qubo.numVariables);
  let bestEnergy = Number.POSITIVE_INFINITY;
  let statesChecked = 0;
  for (let mask = 0n; mask < totalStates; mask += 1n) {
    const energy = calculateQUBOEnergy(qubo, vectorToSolution(qubo, mask));
    if (energy < bestEnergy) bestEnergy = energy;
    statesChecked += 1;
  }

  const candidateIsGlobal = Math.abs(candidateEnergy - bestEnergy) <= 1e-9;
  const material = {
    quboHash: qubo.problemHash,
    candidateEnergy,
    bestEnergy,
    statesChecked,
    candidateIsGlobal,
  };
  return {
    attempted: true,
    complete: true,
    statesChecked,
    bestEnergy,
    candidateEnergy,
    candidateIsGlobal,
    proofHash: sha256(material),
    reason: candidateIsGlobal
      ? 'Exhaustive deterministic enumeration proved no QUBO assignment has lower energy.'
      : 'Exact enumeration found a QUBO assignment with lower energy than the Ising candidate.',
  };
}

export async function runVerifiedOptimizationPipeline(
  req: VerifiedOptimizationRequest,
): Promise<VerifiedOptimizationResult> {
  if (!req.problemId || req.tasks.length === 0 || req.agentCapacities.length === 0) {
    throw new Error('problemId, tasks, and agentCapacities are required');
  }

  const built = await buildQUBOMatrix({
    tasks: req.tasks,
    agentCapacities: req.agentCapacities,
  });

  const candidate = await optimizeWithIsing({
    problemId: req.problemId,
    quboMatrix: built.qubo,
    seed: req.seed ?? 0,
    useMock: req.useMock,
    timeout: req.timeout,
  });

  const z3 = await verifyIsingWithZ3({
    isingAssignment: candidate.solution,
    quboMatrix: built.qubo,
    tasks: req.tasks,
    agentCapacities: req.agentCapacities,
    timeout: req.timeout,
  });

  const exact = exactGlobalQuboProof(
    built.qubo,
    candidate.energy,
    Math.max(1, Math.min(req.exactProofMaxVariables ?? 18, 22)),
  );

  let verdict: OptimizationVerdict;
  if (!z3.isValid) verdict = 'BLOCKED_INFEASIBLE';
  else if (exact.complete && exact.candidateIsGlobal === true) verdict = 'VERIFIED_GLOBAL_OPTIMUM';
  else if (exact.complete && exact.candidateIsGlobal === false) verdict = 'BLOCKED_NOT_GLOBAL_OPTIMUM';
  else verdict = 'VERIFIED_FEASIBLE';

  const solutionHash = sha256(Object.entries(candidate.solution).sort());
  const proofMaterial = {
    schemaVersion: 'dsg-verified-optimization/1.0',
    problemId: req.problemId,
    quboHash: built.qubo.problemHash,
    solutionHash,
    candidateEnergy: candidate.energy,
    z3ProofHash: z3.proofHash,
    exactProofHash: exact.proofHash,
    verdict,
  };
  const proofHash = sha256(proofMaterial);
  const receiptHash = sha256({ ...proofMaterial, proofHash });

  return {
    verdict,
    executionAllowed: false,
    problemId: req.problemId,
    quboHash: built.qubo.problemHash,
    candidate: {
      solution: candidate.solution,
      solutionHash,
      energy: candidate.energy,
      solverMode: candidate.mode,
      solverVersion: candidate.solverVersion,
    },
    z3: {
      status: z3.isSAT,
      feasible: z3.isValid,
      proofHash: z3.proofHash,
      version: z3.z3Version,
    },
    exact,
    proof: {
      proofHash,
      receiptHash,
      deterministic: true,
    },
    nextGate:
      verdict === 'VERIFIED_GLOBAL_OPTIMUM'
        ? 'Bind this proofHash to the Verified Action Compiler, then require DSG plan/scope ALLOW before execution.'
        : 'Execution remains blocked. VERIFIED_FEASIBLE is not a global-optimum claim and is not execution permission.',
  };
}
