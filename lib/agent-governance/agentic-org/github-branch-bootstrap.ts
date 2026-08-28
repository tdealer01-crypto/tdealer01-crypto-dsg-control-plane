import { Octokit } from '@octokit/rest';

export const ALLOWED_REPOSITORIES = new Set([
  'tdealer01-crypto/tdealer01-crypto-dsg-control-plane',
  'tdealer01-crypto/dsg-one-v1',
  'tdealer01-crypto/dsg-agi-simulation',
  'tdealer01-crypto/DSG-Cinema-Proof-Agent',
  'tdealer01-crypto/dsg-unified-data-monitoring',
]);

const ALLOWED_BRANCH_PREFIXES = ['feat/', 'integration/', 'workstream/'] as const;
const PROTECTED_BRANCH_NAMES = new Set(['main', 'master']);

export interface GovernedBranchBootstrapRequest {
  repository: string;
  baseBranch: 'main' | 'master';
  expectedBaseSha: string;
  targetBranch: string;
  approvedPlanHash: string;
}

export interface GitHubRefClient {
  getRef(input: { owner: string; repo: string; ref: string }): Promise<{ data: { object: { sha: string } } }>;
  createRef(input: { owner: string; repo: string; ref: string; sha: string }): Promise<unknown>;
}

export type BranchBootstrapResult =
  | { status: 'CREATED'; repository: string; branch: string; baseSha: string }
  | { status: 'EXISTS'; repository: string; branch: string; baseSha: string }
  | { status: 'BLOCKED'; code: string; reason: string };

function splitRepository(repository: string): { owner: string; repo: string } | null {
  const [owner, repo, extra] = repository.split('/');
  return owner && repo && !extra ? { owner, repo } : null;
}

function validSha(sha: string): boolean {
  return /^[0-9a-f]{40}$/i.test(sha);
}

export function validateBranchBootstrapRequest(request: GovernedBranchBootstrapRequest): string[] {
  const failures: string[] = [];
  if (!ALLOWED_REPOSITORIES.has(request.repository)) failures.push('REPOSITORY_NOT_ALLOWED');
  if (!splitRepository(request.repository)) failures.push('REPOSITORY_FORMAT_INVALID');
  if (!request.approvedPlanHash.trim()) failures.push('APPROVED_PLAN_HASH_MISSING');
  if (!validSha(request.expectedBaseSha)) failures.push('EXPECTED_BASE_SHA_INVALID');
  if (PROTECTED_BRANCH_NAMES.has(request.targetBranch)) failures.push('PROTECTED_TARGET_BRANCH');
  if (!ALLOWED_BRANCH_PREFIXES.some((prefix) => request.targetBranch.startsWith(prefix))) {
    failures.push('TARGET_BRANCH_PREFIX_NOT_ALLOWED');
  }
  if (request.targetBranch.includes('..') || request.targetBranch.startsWith('/') || request.targetBranch.endsWith('/')) {
    failures.push('TARGET_BRANCH_INVALID');
  }
  return failures;
}

async function targetRefSha(
  client: GitHubRefClient,
  owner: string,
  repo: string,
  targetBranch: string,
): Promise<string | null> {
  try {
    const response = await client.getRef({ owner, repo, ref: `heads/${targetBranch}` });
    return response.data.object.sha;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return null;
    throw error;
  }
}

export async function bootstrapGovernedBranch(
  client: GitHubRefClient,
  request: GovernedBranchBootstrapRequest,
): Promise<BranchBootstrapResult> {
  const failures = validateBranchBootstrapRequest(request);
  if (failures.length > 0) {
    return { status: 'BLOCKED', code: failures[0], reason: failures.join(',') };
  }

  const repository = splitRepository(request.repository)!;
  const base = await client.getRef({
    owner: repository.owner,
    repo: repository.repo,
    ref: `heads/${request.baseBranch}`,
  });
  const actualBaseSha = base.data.object.sha;

  if (actualBaseSha !== request.expectedBaseSha) {
    return {
      status: 'BLOCKED',
      code: 'BASE_SHA_DRIFT',
      reason: `Expected ${request.expectedBaseSha} but found ${actualBaseSha}`,
    };
  }

  const existing = await targetRefSha(client, repository.owner, repository.repo, request.targetBranch);
  if (existing) {
    if (existing === actualBaseSha) {
      return { status: 'EXISTS', repository: request.repository, branch: request.targetBranch, baseSha: actualBaseSha };
    }
    return {
      status: 'BLOCKED',
      code: 'TARGET_BRANCH_ALREADY_MOVED',
      reason: `Target branch already exists at ${existing}`,
    };
  }

  await client.createRef({
    owner: repository.owner,
    repo: repository.repo,
    ref: `refs/heads/${request.targetBranch}`,
    sha: actualBaseSha,
  });

  return { status: 'CREATED', repository: request.repository, branch: request.targetBranch, baseSha: actualBaseSha };
}

export async function bootstrapGovernedBranchWithRuntimeCredential(
  request: GovernedBranchBootstrapRequest,
): Promise<BranchBootstrapResult> {
  const token = process.env.DSG_GITHUB_AUTOMATION_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return {
      status: 'BLOCKED',
      code: 'GITHUB_AUTOMATION_CREDENTIAL_MISSING',
      reason: 'Server-side GitHub automation credential is not configured.',
    };
  }
  const octokit = new Octokit({ auth: token });
  return bootstrapGovernedBranch(octokit.rest.git, request);
}
