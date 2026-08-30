import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapGovernedBranch,
  validateBranchBootstrapRequest,
  type GitHubRefClient,
  type GovernedBranchBootstrapRequest,
} from '../../lib/agent-governance/agentic-org/github-branch-bootstrap';

const baseSha = 'a'.repeat(40);
const request = (overrides: Partial<GovernedBranchBootstrapRequest> = {}): GovernedBranchBootstrapRequest => ({
  repository: 'tdealer01-crypto/dsg-unified-data-monitoring',
  baseBranch: 'main',
  expectedBaseSha: baseSha,
  targetBranch: 'integration/unified-monitoring-e2e',
  approvedPlanHash: 'approved-plan-hash',
  ...overrides,
});

function client(options: { targetSha?: string | null; base?: string } = {}): GitHubRefClient {
  return {
    getRef: vi.fn(async ({ ref }) => {
      if (ref === 'heads/main') return { data: { object: { sha: options.base ?? baseSha } } };
      if (options.targetSha) return { data: { object: { sha: options.targetSha } } };
      const error = new Error('not found') as Error & { status: number };
      error.status = 404;
      throw error;
    }),
    createRef: vi.fn(async () => ({})),
  };
}

describe('governed branch bootstrap', () => {
  it('creates only a new approved-prefix branch from the exact pinned base SHA', async () => {
    const git = client();
    const result = await bootstrapGovernedBranch(git, request());
    expect(result.status).toBe('CREATED');
    expect(git.createRef).toHaveBeenCalledWith({
      owner: 'tdealer01-crypto',
      repo: 'dsg-unified-data-monitoring',
      ref: 'refs/heads/integration/unified-monitoring-e2e',
      sha: baseSha,
    });
  });

  it('blocks when the base branch drifted after approval', async () => {
    const git = client({ base: 'b'.repeat(40) });
    const result = await bootstrapGovernedBranch(git, request());
    expect(result).toMatchObject({ status: 'BLOCKED', code: 'BASE_SHA_DRIFT' });
    expect(git.createRef).not.toHaveBeenCalled();
  });

  it('blocks direct main/master targets and unapproved prefixes', () => {
    expect(validateBranchBootstrapRequest(request({ targetBranch: 'main' }))).toContain('PROTECTED_TARGET_BRANCH');
    expect(validateBranchBootstrapRequest(request({ targetBranch: 'random-branch' }))).toContain('TARGET_BRANCH_PREFIX_NOT_ALLOWED');
  });

  it('is idempotent only when the existing target still points to the approved base SHA', async () => {
    const same = client({ targetSha: baseSha });
    expect(await bootstrapGovernedBranch(same, request())).toMatchObject({ status: 'EXISTS', baseSha });
    expect(same.createRef).not.toHaveBeenCalled();

    const moved = client({ targetSha: 'c'.repeat(40) });
    expect(await bootstrapGovernedBranch(moved, request())).toMatchObject({
      status: 'BLOCKED',
      code: 'TARGET_BRANCH_ALREADY_MOVED',
    });
  });
});
