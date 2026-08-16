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

export interface OptimizationObjective {
  version: string;
  assignmentCosts: Record<string, number>;
}

export interface VerifiedOptimizationRequest {
  problemId: string;
  tasks: Task[];
  agentCapacities: AgentCapacity[];
  seed?: number;
  solverMode?: 'local' | 'live';
  timeout?: number;
  exactProofMaxVariables?: number;
  objective?: OptimizationObjective;
  constraintVersion?: string;
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
  canonicalProblem: {
    baseFeasibilityHash: string;
    objectiveVersion: string;
    objectiveHash: string;
    constraintVersion: string;
    constraintHash: string;
    businessObjectiveBound: boolean;
  };
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
    solution[qubo.variables[i].id] = Number((mask >> BigInt(i)) & BigInt(1));
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

  const totalStates = BigInt(1) << BigInt(qubo.numVariables);
  let bestEnergy = Number.POSITIVE_INFINITY;
  let statesChecked = 0;
  for (let mask = BigInt(0); mask < totalStates; mask += BigInt(1)) {
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
      ? 'Exhaustive deterministic enumeration proved no assignment has lower energy for this exact canonical QUBO.'
      : 'Exact enumeration found an assignment with lower energy than the Ising candidate.',
  };
}

function bindCanonicalProblem(
  baseQubo: QUBOMatrix,
  req: VerifiedOptimizationRequest,
): {
  qubo: QUBOMatrix;
  objectiveVersion: string;
  objectiveHash: string;
  constraintVersion: string;
  constraintHash: string;
  businessObjectiveBound: boolean;
} {
  const constraintVersion = req.constraintVersion?.trim() || 'assignment-capacity-v1';
  const constraintMaterial = {
    version: constraintVersion,
    tasks: [...req.tasks]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((task) => ({ id: task.id })),
    agents: [...req.agentCapacities]
      .sort((a, b) => a.agentId - b.agentId)
      .map((agent) => ({
        agentId: agent.agentId,
        maxTotalTasks: agent.maxTotalTasks,
      })),
  };
  const constraintHash = sha256(constraintMaterial);

  const businessObjectiveBound = Boolean(req.objective);
  const objectiveVersion = req.objective?.version?.trim() || 'feasibility-only-v1';
  if (!objectiveVersion) throw new Error('objective.version must be non-empty');

  const knownVariables = new Set(baseQubo.variables.map((variable) => variable.id));
  const assignmentCosts = req.objective?.assignmentCosts ?? {};
  for (const [variableId, cost] of Object.entries(assignmentCosts)) {
    if (!knownVariables.has(variableId)) {
      throw new Error(`objective references unknown QUBO variable: ${variableId}`);
    }
    if (!Number.isFinite(cost)) {
      throw new Error(`objective cost must be finite for variable: ${variableId}`);
    }
  }

  const objectiveMaterial = {
    version: objectiveVersion,
    assignmentCosts,
  };
  const objectiveHash = sha256(objectiveMaterial);

  const linear = [...baseQubo.linear];
  for (const [variableId, cost] of Object.entries(assignmentCosts)) {
    const index = baseQubo.variableMap.get(variableId);
    if (index !== undefined) linear[index] += cost;
  }

  const canonicalProblemHash = sha256({
    schemaVersion: 'dsg-canonical-optimization-problem/1.0',
    baseFeasibilityHash: baseQubo.problemHash,
    objectiveHash,
    constraintHash,
  });

  return {
    qubo: {
      ...baseQubo,
      linear,
      problemHash: canonicalProblemHash,
    },
    objectiveVersion,
    objectiveHash,
    constraintVersion,
    constraintHash,
    businessObjectiveBound,
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
  const canonical = bindCanonicalProblem(built.qubo, req);

  const candidate = await optimizeWithIsing({
    problemId: req.problemId,
    quboMatrix: canonical.qubo,
    seed: req.seed ?? 0,
    solverMode: req.solverMode ?? 'local',
    timeout: req.timeout,
  });

  const z3 = await verifyIsingWithZ3({
    isingAssignment: candidate.solution,
    quboMatrix: canonical.qubo,
    tasks: req.tasks,
    agentCapacities: req.agentCapacities,
    timeout: req.timeout,
  });

  const exact = exactGlobalQuboProof(
    canonical.qubo,
    candidate.energy,
    Math.max(1, Math.min(req.exactProofMaxVariables ?? 18, 22)),
  );

  let verdict: OptimizationVerdict;
  if (!z3.isValid) verdict = 'BLOCKED_INFEASIBLE';
  else if (
    canonical.businessObjectiveBound &&
    exact.complete &&
    exact.candidateIsGlobal === true
  ) verdict = 'VERIFIED_GLOBAL_OPTIMUM';
  else if (
    canonical.businessObjectiveBound &&
    exact.complete &&
    exact.candidateIsGlobal === false
  ) verdict = 'BLOCKED_NOT_GLOBAL_OPTIMUM';
  else verdict = 'VERIFIED_FEASIBLE';

  const solutionHash = sha256(Object.entries(candidate.solution).sort());
  const proofMaterial = {
    schemaVersion: 'dsg-verified-optimization/1.1',
    problemId: req.problemId,
    quboHash: canonical.qubo.problemHash,
    baseFeasibilityHash: built.qubo.problemHash,
    objectiveVersion: canonical.objectiveVersion,
    objectiveHash: canonical.objectiveHash,
    constraintVersion: canonical.constraintVersion,
    constraintHash: canonical.constraintHash,
    businessObjectiveBound: canonical.businessObjectiveBound,
    solutionHash,
    candidateEnergy: candidate.energy,
    solverMode: candidate.mode,
    solverVersion: candidate.solverVersion,
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
    quboHash: canonical.qubo.problemHash,
    canonicalProblem: {
      baseFeasibilityHash: built.qubo.problemHash,
      objectiveVersion: canonical.objectiveVersion,
      objectiveHash: canonical.objectiveHash,
      constraintVersion: canonical.constraintVersion,
      constraintHash: canonical.constraintHash,
      businessObjectiveBound: canonical.businessObjectiveBound,
    },
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
        : canonical.businessObjectiveBound
          ? 'Execution remains blocked. The business objective was bound, but global optimality was not proven.'
          : 'Execution remains blocked. No explicit business objective was bound, so DSG reports VERIFIED_FEASIBLE rather than a false global-optimum claim.',
  };
}
