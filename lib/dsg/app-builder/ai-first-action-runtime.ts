import { Buffer } from 'node:buffer';
import { buildAiGenericGeneratedAppFiles } from './ai-generic-generator';
import { executeApprovedAppBuilderJob, type AppBuilderGeneratedFile, type AppBuilderRuntimeExecutionResult } from './action-runtime';
import type { AppBuilderJob } from './model';
import { createAppBuilderRuntimeHandoff, type AppBuilderRuntimeHandoff } from './runtime-handoff';
import { buildVirtualPcGeneratedAppFiles, isVirtualPcAppBuilderJob } from './virtual-pc-generated-files';

type GithubRuntimeConfig = {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
};

type GithubRefResponse = { object?: { sha?: string } };
type GithubContentResponse = { sha?: string };
type GithubPullResponse = { html_url: string; number: number };

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

function isAllowedPath(path: string, allowedPatterns: string[]): boolean {
  return allowedPatterns.some((pattern) => {
    if (pattern.endsWith('/**')) return path.startsWith(pattern.slice(0, -3));
    return path === pattern;
  });
}

function assertRuntimeAllowed(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff, files: AppBuilderGeneratedFile[]) {
  if (job.status !== 'READY_FOR_RUNTIME') throw new Error('APP_BUILDER_JOB_NOT_READY_FOR_RUNTIME');
  if (!job.approvedPlan) throw new Error('APP_BUILDER_APPROVED_PLAN_REQUIRED');
  if (!handoff.allowedTools.includes('file.write') && !handoff.allowedTools.includes('github.contents.write')) {
    throw new Error('APP_BUILDER_FILE_WRITE_NOT_ALLOWED');
  }
  for (const file of files) {
    if (!isAllowedPath(file.path, handoff.allowedPaths)) throw new Error(`APP_BUILDER_PATH_NOT_ALLOWED:${file.path}`);
  }
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

async function ensureBranch(config: GithubRuntimeConfig, branchName: string): Promise<void> {
  const ref = await githubJson<GithubRefResponse>(config, `/git/ref/heads/${config.baseBranch}`);
  const baseSha = ref.object?.sha;
  if (!baseSha) throw new Error('GITHUB_BASE_BRANCH_SHA_MISSING');
  try {
    await githubJson(config, '/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith('GITHUB_422:')) throw error;
  }
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

async function putFile(config: GithubRuntimeConfig, branchName: string, file: AppBuilderGeneratedFile, job: AppBuilderJob): Promise<void> {
  const sha = await currentFileSha(config, file.path, branchName);
  await githubJson(config, `/contents/${encodeRepoPath(file.path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `DSG AI App Builder: ${sha ? 'update' : 'create'} ${file.path}`,
      content: Buffer.from(file.content, 'utf8').toString('base64'),
      branch: branchName,
      sha,
      committer: { name: 'DSG AI App Builder', email: 'dsg-app-builder@users.noreply.github.com' },
      author: { name: job.createdBy || 'DSG Operator', email: 'dsg-operator@users.noreply.github.com' },
    }),
  });
}

async function createOrGetPullRequest(config: GithubRuntimeConfig, branchName: string, job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff, mode: string): Promise<GithubPullResponse> {
  const body = [
    '## DSG AI-First App Builder Runtime Output',
    '',
    `App Builder Job: \`${job.id}\``,
    `Plan Hash: \`${handoff.planHash}\``,
    `Approval Hash: \`${handoff.approvalHash}\``,
    `Generator Mode: \`${mode}\``,
    '',
    mode === 'virtual_pc_renderer'
      ? 'The runtime selected the Virtual PC renderer before generic fallback. This PR contains a Virtual PC monitor UI, governed remote mouse API, migration, and runbook.'
      : 'The runtime attempted AI blueprint generation before deterministic fallback. This PR contains the AI-generated frontend/API/migration/runbook files when generation succeeded.',
    '',
    '**Claim boundary:** IMPLEMENTED_UNVERIFIED only. Do not claim DEPLOYABLE or PRODUCTION until CI, migration apply, deployment proof, and production-flow proof pass.',
  ].join('\n');

  try {
    return await githubJson<GithubPullResponse>(config, '/pulls', {
      method: 'POST',
      body: JSON.stringify({
        title: `DSG AI App Builder output: ${job.prd?.title || job.id}`,
        head: branchName,
        base: config.baseBranch,
        body,
        draft: false,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith('GITHUB_422:')) throw error;
    const pulls = await githubJson<GithubPullResponse[]>(config, `/pulls?head=${encodeURIComponent(`${config.owner}:${branchName}`)}&state=open`);
    if (!pulls[0]) throw error;
    return pulls[0];
  }
}

function selectGeneratedFiles(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff) {
  if (isVirtualPcAppBuilderJob(job)) {
    return { mode: 'virtual_pc_renderer', files: buildVirtualPcGeneratedAppFiles(job, handoff) as AppBuilderGeneratedFile[] };
  }
  return null;
}

export async function executeApprovedAiFirstAppBuilderJob(job: AppBuilderJob): Promise<AppBuilderRuntimeExecutionResult> {
  const handoff = createAppBuilderRuntimeHandoff(job);
  const selected = selectGeneratedFiles(job, handoff);
  const aiFiles = selected ? null : await buildAiGenericGeneratedAppFiles(job, handoff);
  if (!selected && !aiFiles?.length) return executeApprovedAppBuilderJob(job);

  const mode = selected?.mode || 'ai_blueprint_generator';
  const files = selected?.files || (aiFiles as AppBuilderGeneratedFile[]);
  assertRuntimeAllowed(job, handoff, files);

  const config = runtimeConfig();
  const branchPrefix = mode === 'virtual_pc_renderer' ? 'dsg-virtual-pc' : 'dsg-ai-builder';
  const branchName = `${branchPrefix}-${safeSegment(job.id).slice(0, 16)}`;
  await ensureBranch(config, branchName);
  for (const file of files) await putFile(config, branchName, file, job);
  const pullRequest = await createOrGetPullRequest(config, branchName, job, handoff, mode);

  return {
    appBuilderJobId: job.id,
    workspaceId: job.workspaceId,
    status: 'PR_CREATED',
    claimStatus: 'IMPLEMENTED_UNVERIFIED',
    branchName,
    pullRequestUrl: pullRequest.html_url,
    pullRequestNumber: pullRequest.number,
    baseBranch: config.baseBranch,
    repository: `${config.owner}/${config.repo}`,
    generatedFiles: files.map((file) => ({ path: file.path, evidenceKind: file.evidenceKind })),
    evidence: {
      planHash: handoff.planHash,
      approvalHash: handoff.approvalHash,
      githubBranch: branchName,
      githubPullRequest: pullRequest.html_url,
      generatedFileCount: files.length,
      note: mode === 'virtual_pc_renderer'
        ? 'Virtual PC renderer selected before generic fallback. Files were written through GitHub Contents API after approved runtime handoff. This is not real Windows VM provider proof.'
        : 'AI blueprint generation succeeded before deterministic fallback. Files were written through GitHub Contents API after approved runtime handoff. Build/deploy/production claims remain blocked until external evidence passes.',
    },
  };
}
