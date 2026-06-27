import { Buffer } from 'node:buffer';
import type { AppBuilderJob } from './model';
import { createAppBuilderRuntimeHandoff, type AppBuilderRuntimeHandoff } from './runtime-handoff';

export type AppBuilderRuntimeEnvironment = {
  appBuilderJobId: string;
  workspaceId: string;
  status: 'ENVIRONMENT_READY';
  environmentType: 'github_branch';
  repository: string;
  baseBranch: string;
  branchName: string;
  manifestPath: string;
  allowedTools: string[];
  allowedPaths: string[];
  allowedCommands: string[];
  requiredSecrets: string[];
  evidence: {
    planHash: string;
    approvalHash: string;
    branchCreatedOrReused: boolean;
    manifestWritten: boolean;
    note: string;
  };
};

type GithubRuntimeConfig = {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
};

type GithubRefResponse = { object?: { sha?: string } };
type GithubContentResponse = { sha?: string };

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`APP_BUILDER_RUNTIME_ENV_REQUIRED:${name}`);
  return value;
}

function runtimeConfig(): GithubRuntimeConfig {
  return {
    token: requireEnv('GITHUB_TOKEN'),
    owner: process.env.DSG_BUILDER_GITHUB_OWNER?.trim() || process.env.GITHUB_OWNER?.trim() || 'tdealer01-crypto',
    repo: process.env.DSG_BUILDER_GITHUB_REPO?.trim() || process.env.GITHUB_REPO?.trim() || 'dsg-one-v1',
    baseBranch: process.env.DSG_BUILDER_BASE_BRANCH?.trim() || 'main',
  };
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'app';
}

async function githubJson<T>(config: GithubRuntimeConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${config.token}`,
      'x-github-api-version': '2022-11-28',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : response.statusText;
    throw new Error(`GITHUB_${response.status}:${message}`);
  }
  return data as T;
}

function encodeRepoPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function currentFileSha(config: GithubRuntimeConfig, path: string, branchName: string): Promise<string | undefined> {
  try {
    const file = await githubJson<GithubContentResponse>(config, `/contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(branchName)}`);
    return file.sha;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('GITHUB_404:')) return undefined;
    throw error;
  }
}

async function ensureBranch(config: GithubRuntimeConfig, branchName: string): Promise<boolean> {
  const ref = await githubJson<GithubRefResponse>(config, `/git/ref/heads/${config.baseBranch}`);
  const baseSha = ref.object?.sha;
  if (!baseSha) throw new Error('GITHUB_BASE_BRANCH_SHA_MISSING');

  try {
    await githubJson(config, '/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('GITHUB_422:')) return false;
    throw error;
  }
}

function manifestFor(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff, branchName: string, config: GithubRuntimeConfig) {
  return {
    appBuilderJobId: job.id,
    workspaceId: job.workspaceId,
    status: 'ENVIRONMENT_READY',
    environmentType: 'github_branch',
    repository: `${config.owner}/${config.repo}`,
    baseBranch: config.baseBranch,
    branchName,
    planHash: handoff.planHash,
    approvalHash: handoff.approvalHash,
    allowedTools: handoff.allowedTools,
    allowedPaths: handoff.allowedPaths,
    allowedCommands: handoff.allowedCommands,
    requiredSecrets: handoff.requiredSecrets,
    createdAt: new Date().toISOString(),
    truthBoundary: 'Runtime environment is ready for approved tool execution. This is not build, deployment, or production proof.',
  };
}

async function writeManifest(input: {
  config: GithubRuntimeConfig;
  branchName: string;
  manifestPath: string;
  manifest: unknown;
  actorId: string;
}) {
  const sha = await currentFileSha(input.config, input.manifestPath, input.branchName);
  await githubJson(input.config, `/contents/${encodeRepoPath(input.manifestPath)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `DSG App Builder: ${sha ? 'update' : 'create'} runtime environment manifest`,
      content: Buffer.from(`${JSON.stringify(input.manifest, null, 2)}\n`, 'utf8').toString('base64'),
      branch: input.branchName,
      sha,
      committer: {
        name: 'DSG Environment Provisioner',
        email: 'dsg-environment@users.noreply.github.com',
      },
      author: {
        name: input.actorId || 'DSG Operator',
        email: 'dsg-operator@users.noreply.github.com',
      },
    }),
  });
}

export function assertEnvironmentProvisioningAllowed(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff) {
  if (job.status !== 'READY_FOR_RUNTIME' && job.status !== 'ENVIRONMENT_READY') {
    throw new Error('APP_BUILDER_ENVIRONMENT_APPROVAL_REQUIRED');
  }
  if (!job.approvedPlan) throw new Error('APP_BUILDER_APPROVED_PLAN_REQUIRED');
  if (!handoff.allowedTools.includes('dsg.environment.provision') && !handoff.allowedTools.includes('github.branch.create')) {
    throw new Error('APP_BUILDER_ENVIRONMENT_TOOL_NOT_ALLOWED');
  }
}

export async function provisionAppBuilderRuntimeEnvironment(job: AppBuilderJob): Promise<AppBuilderRuntimeEnvironment> {
  const handoff = createAppBuilderRuntimeHandoff(job);
  assertEnvironmentProvisioningAllowed(job, handoff);

  const config = runtimeConfig();
  const branchName = `dsg-env-${safeSegment(job.id).slice(0, 16)}`;
  const manifestPath = `docs/dsg-runtime-environments/${safeSegment(job.id)}.json`;
  const branchCreatedOrReused = await ensureBranch(config, branchName);
  const manifest = manifestFor(job, handoff, branchName, config);

  await writeManifest({
    config,
    branchName,
    manifestPath,
    manifest,
    actorId: job.createdBy,
  });

  return {
    appBuilderJobId: job.id,
    workspaceId: job.workspaceId,
    status: 'ENVIRONMENT_READY',
    environmentType: 'github_branch',
    repository: `${config.owner}/${config.repo}`,
    baseBranch: config.baseBranch,
    branchName,
    manifestPath,
    allowedTools: handoff.allowedTools,
    allowedPaths: handoff.allowedPaths,
    allowedCommands: handoff.allowedCommands,
    requiredSecrets: handoff.requiredSecrets,
    evidence: {
      planHash: handoff.planHash,
      approvalHash: handoff.approvalHash,
      branchCreatedOrReused,
      manifestWritten: true,
      note: 'A real GitHub branch environment and manifest were created before build tool execution. This is environment evidence only, not deployment or production proof.',
    },
  };
}
