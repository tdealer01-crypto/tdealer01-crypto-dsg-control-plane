import { sha256Json } from './hash';
import type { RiskLevel, RuntimeDependencyEdge, RuntimePlan, RuntimeTask, RuntimeWave } from './types';

const riskRank: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
const riskOrder: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function maxRisk(tasks: RuntimeTask[]): RiskLevel {
  return tasks.reduce<RiskLevel>((highest, task) =>
    riskRank[task.riskLevel] > riskRank[highest] ? task.riskLevel : highest,
  'LOW');
}

export function buildDependencyEdges(tasks: RuntimeTask[]): RuntimeDependencyEdge[] {
  const ids = new Set(tasks.map((task) => task.id));
  const edges: RuntimeDependencyEdge[] = [];
  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      if (!ids.has(dependency)) throw new Error(`Unknown dependency ${dependency} for task ${task.id}`);
      if (dependency === task.id) throw new Error(`Task ${task.id} cannot depend on itself`);
      edges.push({ from: dependency, to: task.id });
    }
  }
  return edges.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}

export function buildWaves(tasks: RuntimeTask[]): RuntimeWave[] {
  const byId = new Map(tasks.map((task) => [task.id, task] as const));
  const remaining = new Set(byId.keys());
  const completed = new Set<string>();
  const waves: RuntimeWave[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining]
      .map((id) => byId.get(id)!)
      .filter((task) => task.dependsOn.every((dependency) => completed.has(dependency)))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (ready.length === 0) throw new Error('Dependency cycle detected');

    const waveRisk = maxRisk(ready);
    waves.push({
      id: `wave-${waves.length + 1}`,
      index: waves.length,
      taskIds: ready.map((task) => task.id),
      riskLevel: waveRisk,
      requiresApproval: ready.some((task) => task.requiresApproval || riskRank[task.riskLevel] >= riskRank.HIGH),
    });

    for (const task of ready) {
      completed.add(task.id);
      remaining.delete(task.id);
    }
  }

  return waves;
}

export function createRuntimePlan(tasks: RuntimeTask[]): RuntimePlan {
  if (tasks.length === 0) throw new Error('Cannot create plan without tasks');
  const ids = new Set<string>();
  for (const task of tasks) {
    if (!task.id.trim()) throw new Error('Task id is required');
    if (ids.has(task.id)) throw new Error(`Duplicate task id ${task.id}`);
    ids.add(task.id);
  }

  const normalizedTasks = tasks
    .map((task) => ({ ...task, dependsOn: [...task.dependsOn].sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = buildDependencyEdges(normalizedTasks);
  const waves = buildWaves(normalizedTasks);

  return {
    tasks: normalizedTasks,
    edges,
    waves,
    planHash: sha256Json({ tasks: normalizedTasks, edges }),
    waveHash: sha256Json({ waves }),
  };
}

export function compareRisk(a: RiskLevel, b: RiskLevel): number {
  return riskRank[a] - riskRank[b];
}

export function riskFromRank(rank: number): RiskLevel {
  return riskOrder[Math.max(0, Math.min(rank, riskOrder.length - 1))];
}
