import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/agent-skills/lock-skill', () => ({
  getSkillFromLock: vi.fn(),
}));

vi.mock('../../lib/dsg/tools/governed-tools', () => ({
  prepareGovernedToolRequest: vi.fn(),
}));

import { runSkillAction } from '../../lib/agent-skills/run-skill-action';
import { getSkillFromLock } from '../../lib/agent-skills/lock-skill';
import { prepareGovernedToolRequest } from '../../lib/dsg/tools/governed-tools';
import type { SkillLockEntry } from '../../lib/agent-skills/types';

const mockGetSkillFromLock = vi.mocked(getSkillFromLock);
const mockPrepare = vi.mocked(prepareGovernedToolRequest);

const verifiedEntry: SkillLockEntry = {
  source: 'example/test-skill',
  sourceType: 'github',
  sourceUrl: 'https://github.com/example/test-skill',
  sourceCommit: 'abc123',
  computedHash: 'a'.repeat(64),
  status: 'verified',
  riskLevel: 'low',
  permissions: {
    network: true,
    filesystem: 'none',
    secrets: false,
    codeExecution: false,
    externalWrite: false,
  },
  registeredAt: '2026-05-23T00:00:00.000Z',
  description: 'A test skill',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSkillAction — security gate enforcement', () => {
  it('returns SKILL_NOT_REGISTERED when skill is not in the lock', async () => {
    mockGetSkillFromLock.mockResolvedValue(null);
    const result = await runSkillAction({ skillId: 'missing-skill', goal: 'do something' });

    expect(result.ok).toBe(false);
    expect(result.gateStatus).toBe('blocked');
    expect(result.gateReason).toBe('SKILL_NOT_REGISTERED');
    expect(result.simulated).toBe(true);
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns SKILL_BLOCKED_IN_REGISTRY and does not call governed gate', async () => {
    mockGetSkillFromLock.mockResolvedValue({ ...verifiedEntry, status: 'blocked' });
    const result = await runSkillAction({ skillId: 'blocked-skill', goal: 'do something' });

    expect(result.ok).toBe(false);
    expect(result.gateReason).toBe('SKILL_BLOCKED_IN_REGISTRY');
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns review status for needs_approval entries and does not execute', async () => {
    mockGetSkillFromLock.mockResolvedValue({ ...verifiedEntry, status: 'needs_approval' });
    const result = await runSkillAction({ skillId: 'pending-skill', goal: 'do something' });

    expect(result.ok).toBe(false);
    expect(result.gateStatus).toBe('review');
    expect(result.gateReason).toMatch(/NEEDS_APPROVAL/);
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns review status for needs_review entries and does not execute', async () => {
    mockGetSkillFromLock.mockResolvedValue({ ...verifiedEntry, status: 'needs_review' });
    const result = await runSkillAction({ skillId: 'review-skill', goal: 'do something' });

    expect(result.ok).toBe(false);
    expect(result.gateStatus).toBe('review');
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it('returns ok:true when skill is verified and governed gate allows', async () => {
    mockGetSkillFromLock.mockResolvedValue(verifiedEntry);
    mockPrepare.mockReturnValue({
      ok: true,
      status: 'ready',
      blockedReasons: [],
      audit: { id: 'tool:audit-abc', truth: 'runtime_evidence', requestHash: 'hash-abc' },
    } as any);

    const result = await runSkillAction({ skillId: 'example-test-skill', goal: 'query the skill API' });

    expect(result.ok).toBe(true);
    expect(result.gateStatus).toBe('ready');
    expect(result.auditId).toBe('tool:audit-abc');
    expect(result.simulated).toBe(true);
    expect(mockPrepare).toHaveBeenCalledOnce();
  });

  it('returns ok:false when governed gate blocks a verified skill', async () => {
    mockGetSkillFromLock.mockResolvedValue(verifiedEntry);
    mockPrepare.mockReturnValue({
      ok: false,
      status: 'blocked',
      blockedReasons: ['API_ENDPOINT_CONFIRMATION_REQUIRED'],
      audit: { id: 'tool:blocked-xyz', truth: 'external_action_review', requestHash: 'hash-xyz' },
    } as any);

    const result = await runSkillAction({ skillId: 'example-test-skill', goal: 'run risky action' });

    expect(result.ok).toBe(false);
    expect(result.gateStatus).toBe('blocked');
    expect(result.gateReason).toContain('API_ENDPOINT_CONFIRMATION_REQUIRED');
  });

  it('passes skillId, sourceUrl, and evidence hash to the governed gate', async () => {
    mockGetSkillFromLock.mockResolvedValue(verifiedEntry);
    mockPrepare.mockReturnValue({
      ok: true,
      status: 'ready',
      blockedReasons: [],
      audit: { id: 'tool:x', truth: 'runtime_evidence', requestHash: 'h' },
    } as any);

    await runSkillAction({ skillId: 'example-test-skill', goal: 'query', args: { limit: 5 } });

    const call = mockPrepare.mock.calls[0][0];
    expect(call.tool).toBe('api');
    expect(call.args?.skillId).toBe('example-test-skill');
    expect(call.args?.sourceUrl).toBe('https://github.com/example/test-skill');
    expect(call.evidence?.some((e: string) => e.startsWith('skill_hash:'))).toBe(true);
  });
});
