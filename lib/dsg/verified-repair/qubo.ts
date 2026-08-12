import { sha256Json } from '@/lib/dsg/runtime/hash';
import type { QUBOMatrix, QUBOVariable } from '@/lib/dsg-one/qubo-builder';
import { sortCandidates } from './canonical';
import type { RepairCandidate } from './types';

export interface RepairQubo extends QUBOMatrix {
  candidateOrder: string[];
  groups: string[];
  conflictPairs: Array<[string, string]>;
  requirementPairs: Array<[string, string]>;
}
const GROUP_PENALTY = 1_000;
const RELATION_PENALTY = 2_000;

function boundedScore(candidate: RepairCandidate): number {
  const score = typeof candidate.score === 'number' && Number.isFinite(candidate.score)
    ? candidate.score
    : 50;
  return Math.max(0, Math.min(100, score));
}

function addSymmetric(matrix: number[][], left: number, right: number, value: number): void {
  matrix[left][right] += value;
  matrix[right][left] += value;
}

function pairKey(left: string, right: string): string {
  return [left, right].sort().join('\u0000');
}

/**
 * Build a deterministic QUBO whose hard constraints are checked again by Z3.
 * The Ising/QUBO solver proposes a binary repair set; it is never the final
 * authority for correctness.
 */
export function buildRepairQubo(candidates: RepairCandidate[]): RepairQubo {
  const sorted = sortCandidates(candidates);
  const groups = [...new Set(sorted.map((candidate) => candidate.changeGroup))].sort();
  const candidateIndex = new Map(sorted.map((candidate, index) => [candidate.id, index]));
  const numVariables = sorted.length;
  const Q = Array.from({ length: numVariables }, () => Array(numVariables).fill(0));
  const linear = Array<number>(numVariables).fill(0);
  let constant = 0;

  const variables: QUBOVariable[] = sorted.map((candidate, index) => ({
    id: `repair_${index}`,
    type: 'assignment',
    taskId: candidate.changeGroup,
    agentId: index,
  }));
  const variableMap = new Map(variables.map((variable, index) => [variable.id, index]));

  for (const group of groups) {
    const members = sorted
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.changeGroup === group);

    // GROUP_PENALTY * (sum(x) - 1)^2.
    constant += GROUP_PENALTY;
    for (const { index } of members) linear[index] -= GROUP_PENALTY;
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        addSymmetric(Q, members[left].index, members[right].index, GROUP_PENALTY);
      }
    }
  }

  const conflictSet = new Set<string>();
  const conflictPairs: Array<[string, string]> = [];
  const requirementPairs: Array<[string, string]> = [];

  for (const candidate of sorted) {
    for (const otherId of candidate.conflictsWith ?? []) {
      if (!candidateIndex.has(otherId)) continue;
      const key = pairKey(candidate.id, otherId);
      if (conflictSet.has(key)) continue;
      conflictSet.add(key);
      const [leftId, rightId] = key.split('\u0000');
      conflictPairs.push([leftId, rightId]);
      const left = candidateIndex.get(leftId)!;
      const right = candidateIndex.get(rightId)!;
      // RELATION_PENALTY * x_left * x_right.
      addSymmetric(Q, left, right, RELATION_PENALTY / 2);
    }

    for (const requiredId of candidate.requires ?? []) {
      if (!candidateIndex.has(requiredId)) continue;
      requirementPairs.push([candidate.id, requiredId]);
      const candidateVariable = candidateIndex.get(candidate.id)!;
      const requiredVariable = candidateIndex.get(requiredId)!;
      // RELATION_PENALTY * x_candidate * (1 - x_required).
      linear[candidateVariable] += RELATION_PENALTY;
      addSymmetric(Q, candidateVariable, requiredVariable, -RELATION_PENALTY / 2);
    }
  }

  // Lower cost is preferred, while hard relation penalties dominate this term.
  for (const [index, candidate] of sorted.entries()) {
    linear[index] += 100 - boundedScore(candidate);
  }

  for (let left = 0; left < numVariables; left += 1) {
    for (let right = left + 1; right < numVariables; right += 1) {
      // Keep the matrix exactly symmetric for every caller.
      Q[right][left] = Q[left][right];
    }
  }

  const candidateOrder = sorted.map((candidate) => candidate.id);
  const problemHash = sha256Json({
    schema: 'dsg.verified-repair.qubo.v1',
    groups,
    candidateOrder,
    conflictPairs: [...conflictPairs].sort(),
    requirementPairs: [...requirementPairs].sort(),
    Q,
    linear,
    constant,
  });

  return {
    Q,
    linear,
    constant,
    variables,
    variableMap,
    problemHash,
    numVariables,
    numConstraints: groups.length + conflictPairs.length + requirementPairs.length,
    candidateOrder,
    groups,
    conflictPairs: conflictPairs.sort(),
    requirementPairs: requirementPairs.sort(),
  };
}

export function selectedCandidateIds(
  qubo: RepairQubo,
  solution: Record<string, number | boolean>,
): string[] {
  return qubo.variables
    .filter((variable) => Number(solution[variable.id]) === 1)
    .map((variable) => qubo.candidateOrder[Number(variable.agentId)])
    .filter((id): id is string => Boolean(id))
    .sort();
}
