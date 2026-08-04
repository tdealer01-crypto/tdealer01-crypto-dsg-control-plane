import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { BaseAgent, type AgentContext, type AgentResult } from '@/lib/dsg/multi-agent-ccvs/agents/base-agent';

class TestAgent extends BaseAgent {
  id = 'test-agent';
  name = 'Test Agent';
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' = 'L1';
  parallelGroup = 'test';
  dependsOn: string[] = [];

  async run(_context: AgentContext): Promise<Omit<AgentResult, 'agentId' | 'level' | 'durationMs'>> {
    return { success: true, evidence: [], metrics: {}, errors: [], warnings: [] };
  }

  public exposedComputeHash(content: string): string {
    return this.computeHash(content);
  }
}

describe('BaseAgent.computeHash', () => {
  const agent = new TestAgent();

  it('returns sha256: prefix followed by exactly 64 hex characters', () => {
    const hash = agent.exposedComputeHash('hello world');
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const a = agent.exposedComputeHash('deterministic input');
    const b = agent.exposedComputeHash('deterministic input');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = agent.exposedComputeHash('input one');
    const b = agent.exposedComputeHash('input two');
    expect(a).not.toBe(b);
  });

  it('matches an independently computed Node crypto SHA-256 digest', () => {
    const input = 'known-input-for-cross-check';
    const expected = 'sha256:' + createHash('sha256').update(input).digest('hex');
    expect(agent.exposedComputeHash(input)).toBe(expected);
  });
});
