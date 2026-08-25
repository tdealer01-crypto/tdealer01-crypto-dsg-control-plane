import { describe, expect, it } from 'vitest';
import { evaluateWaveJoin, nextLaneStatus, type LaneCheckpoint } from '../../lib/agent-governance/agentic-org/orchestrator';

const lane = (id: string, overrides: Partial<LaneCheckpoint> = {}): LaneCheckpoint => ({
  laneId: id,
  status: 'READY_TO_JOIN',
  repository: `owner/${id}`,
  branch: 'feat/test',
  commitSha: 'a'.repeat(40),
  evidenceRefs: ['workflow://1'],
  blockers: [],
  ...overrides,
});

describe('agentic organization orchestrator', () => {
  it('joins only when every lane is ready and evidenced', () => {
    expect(evaluateWaveJoin([lane('W1-A'), lane('W1-B')])).toEqual({
      status: 'READY',
      blockingLanes: [],
      reasons: [],
    });
  });

  it('blocks the whole join when one lane is blocked', () => {
    const result = evaluateWaveJoin([
      lane('W1-A', { status: 'BLOCKED', blockers: ['permission'] }),
      lane('W1-B'),
    ]);
    expect(result.status).toBe('BLOCKED');
    expect(result.blockingLanes).toContain('W1-A');
    expect(result.reasons).toContain('W1-A:STATUS_BLOCKED');
    expect(result.reasons).toContain('W1-A:BLOCKERS_PRESENT');
  });

  it('blocks a lane with no evidence even if it says READY_TO_JOIN', () => {
    const result = evaluateWaveJoin([lane('W1-A', { evidenceRefs: [] })]);
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons).toContain('W1-A:EVIDENCE_MISSING');
  });

  it('rejects invalid state transitions', () => {
    expect(nextLaneStatus('QUEUED', 'START')).toBe('RUNNING');
    expect(nextLaneStatus('RUNNING', 'VERIFY')).toBe('READY_TO_JOIN');
    expect(() => nextLaneStatus('COMPLETED', 'START')).toThrow('INVALID_LANE_TRANSITION');
  });
});
