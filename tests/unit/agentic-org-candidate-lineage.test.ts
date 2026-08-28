import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  verifyApprovedPlan,
  verifyCandidateLineage,
  type GitHubLineageClient,
} from '../../lib/agent-governance/agentic-org/candidate-lineage';

const REPO = 'tdealer01-crypto/dsg-agi-simulation';
const BASELINE = 'a'.repeat(40);
const CANDIDATE = 'b'.repeat(40);

function approvedPlanBytes(overrides: Record<string, unknown> = {}): Buffer {
  const plan = {
    schemaVersion: 'dsg-approved-improvement-plan-v1',
    goalId: 'dsg-agi-self-evolution',
    approvalStatus: 'APPROVED_BY_USER_2026-08-25',
    authority: 'DSG_CONTROL_PLANE',
    targetRepository: REPO,
    allowedPaths: ['data/simulation-input.json'],
    ...overrides,
  };
  return Buffer.from(JSON.stringify(plan));
}

function contentClient(bytes: Buffer): GitHubLineageClient['getContent'] {
  return vi.fn(async () => ({
    data: { content: bytes.toString('base64'), encoding: 'base64' },
  }));
}

describe('verifyApprovedPlan', () => {
  it('passes when the fetched plan hashes to exactly what the envelope claims and is approved', async () => {
    const bytes = approvedPlanBytes();
    const hash = createHash('sha256').update(bytes).digest('hex');
    const client = { getContent: contentClient(bytes), compareCommits: vi.fn() };

    const failures = await verifyApprovedPlan(client, REPO, CANDIDATE, hash);
    expect(failures).toEqual([]);
  });

  it('blocks on a hash mismatch instead of trusting the envelope-supplied hash', async () => {
    const bytes = approvedPlanBytes();
    const client = { getContent: contentClient(bytes), compareCommits: vi.fn() };

    const failures = await verifyApprovedPlan(client, REPO, CANDIDATE, 'c'.repeat(64));
    expect(failures.map((f) => f.code)).toEqual(['APPROVED_PLAN_HASH_MISMATCH']);
  });

  it('blocks a plan that is not approved, even if the hash matches', async () => {
    const bytes = approvedPlanBytes({ approvalStatus: 'DRAFT' });
    const hash = createHash('sha256').update(bytes).digest('hex');
    const client = { getContent: contentClient(bytes), compareCommits: vi.fn() };

    const failures = await verifyApprovedPlan(client, REPO, CANDIDATE, hash);
    expect(failures.map((f) => f.code)).toContain('APPROVED_PLAN_NOT_APPROVED');
  });

  it('blocks a plan whose authority is not DSG_CONTROL_PLANE', async () => {
    const bytes = approvedPlanBytes({ authority: 'SIMULATION_ONLY' });
    const hash = createHash('sha256').update(bytes).digest('hex');
    const client = { getContent: contentClient(bytes), compareCommits: vi.fn() };

    const failures = await verifyApprovedPlan(client, REPO, CANDIDATE, hash);
    expect(failures.map((f) => f.code)).toContain('APPROVED_PLAN_AUTHORITY_INVALID');
  });

  it('fails closed for a repository with no registered approved-plan path', async () => {
    const client = { getContent: vi.fn(), compareCommits: vi.fn() };
    const failures = await verifyApprovedPlan(client, 'tdealer01-crypto/dsg-one-v1', CANDIDATE, 'x'.repeat(64));
    expect(failures.map((f) => f.code)).toEqual(['APPROVED_PLAN_PATH_UNKNOWN']);
    expect(client.getContent).not.toHaveBeenCalled();
  });

  it('fails closed when GitHub cannot be reached', async () => {
    const client = { getContent: vi.fn(async () => { throw new Error('network'); }), compareCommits: vi.fn() };
    const failures = await verifyApprovedPlan(client, REPO, CANDIDATE, 'x'.repeat(64));
    expect(failures.map((f) => f.code)).toEqual(['APPROVED_PLAN_FETCH_FAILED']);
  });
});

describe('verifyCandidateLineage', () => {
  function compareClient(status: string, files: Array<{ filename: string }>): GitHubLineageClient['compareCommits'] {
    return vi.fn(async () => ({ data: { status, ahead_by: 1, behind_by: 0, files } }));
  }

  it('passes when the candidate is strictly ahead and every changed file is in allowedPaths', async () => {
    const client = { getContent: vi.fn(), compareCommits: compareClient('ahead', [{ filename: 'data/simulation-input.json' }]) };
    const failures = await verifyCandidateLineage(client, REPO, BASELINE, CANDIDATE, ['data/simulation-input.json']);
    expect(failures).toEqual([]);
  });

  it('blocks when baseline is not an ancestor of the candidate', async () => {
    const client = { getContent: vi.fn(), compareCommits: compareClient('diverged', [{ filename: 'data/simulation-input.json' }]) };
    const failures = await verifyCandidateLineage(client, REPO, BASELINE, CANDIDATE, ['data/simulation-input.json']);
    expect(failures.map((f) => f.code)).toContain('BASELINE_NOT_ANCESTOR');
  });

  it('blocks a candidate that changes files outside allowedPaths', async () => {
    const client = {
      getContent: vi.fn(),
      compareCommits: compareClient('ahead', [
        { filename: 'data/simulation-input.json' },
        { filename: 'contracts/agentic-improvement/self-evolution-plan.json' },
      ]),
    };
    const failures = await verifyCandidateLineage(client, REPO, BASELINE, CANDIDATE, ['data/simulation-input.json']);
    expect(failures.map((f) => f.code)).toContain('DIFF_OUTSIDE_ALLOWED_PATHS');
  });

  it('blocks a candidate with no actual file changes', async () => {
    const client = { getContent: vi.fn(), compareCommits: compareClient('ahead', []) };
    const failures = await verifyCandidateLineage(client, REPO, BASELINE, CANDIDATE, ['data/simulation-input.json']);
    expect(failures.map((f) => f.code)).toContain('DIFF_EMPTY');
  });

  it('fails closed when the compare API call errors', async () => {
    const client = { getContent: vi.fn(), compareCommits: vi.fn(async () => { throw new Error('502'); }) };
    const failures = await verifyCandidateLineage(client, REPO, BASELINE, CANDIDATE, ['data/simulation-input.json']);
    expect(failures.map((f) => f.code)).toEqual(['CANDIDATE_COMPARE_FAILED']);
  });
});
