import { describe, expect, it } from 'vitest';
import { buildCanonicalSimulationWitness } from '@/lib/dsg-one/canonical-e2e-pipeline';

const request = {
  problemId: 'canonical-e2e-test',
  tasks: [
    { id: 'task-1', requiredCapabilities: ['code'], estimatedTokens: 100, priority: 1 },
  ],
  agentCapacities: [
    { agentId: 'agent-1', capabilities: ['code'], maxConcurrentTasks: 1, maxTotalTasks: 1 },
  ],
  seed: 7,
};

describe('canonical DSG ONE E2E pipeline', () => {
  it('produces the same simulation witness for the same normalized input', () => {
    const a = buildCanonicalSimulationWitness(request as any);
    const b = buildCanonicalSimulationWitness(request as any);
    expect(a).toEqual(b);
    expect(a.deterministic).toBe(true);
  });

  it('changes the witness when the optimization problem changes', () => {
    const a = buildCanonicalSimulationWitness(request as any);
    const b = buildCanonicalSimulationWitness({
      ...request,
      seed: 8,
    } as any);
    expect(a.inputHash).not.toBe(b.inputHash);
    expect(a.scenarioHash).not.toBe(b.scenarioHash);
  });
});
