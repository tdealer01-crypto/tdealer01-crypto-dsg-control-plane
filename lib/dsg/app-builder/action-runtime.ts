import { Buffer } from 'node:buffer';
import type { AppBuilderJob } from './model';
import { createAppBuilderRuntimeHandoff, type AppBuilderRuntimeHandoff } from './runtime-handoff';

export type AppBuilderGeneratedFile = {
  path: string;
  content: string;
  evidenceKind: 'frontend' | 'backend_api' | 'database_migration' | 'documentation';
};

export type AppBuilderRuntimeExecutionResult = {
  appBuilderJobId: string;
  workspaceId: string;
  status: 'PR_CREATED';
  claimStatus: 'IMPLEMENTED_UNVERIFIED';
  branchName: string;
  pullRequestUrl: string;
  pullRequestNumber: number;
  baseBranch: string;
  repository: string;
  generatedFiles: Array<Pick<AppBuilderGeneratedFile, 'path' | 'evidenceKind'>>;
  evidence: {
    planHash: string;
    approvalHash: string;
    githubBranch: string;
    githubPullRequest: string;
    generatedFileCount: number;
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

function timestampForMigration(now = new Date()): string {
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function escapeComment(value: string): string {
  return value.replace(/\*\//g, '* /');
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
    if (!isAllowedPath(file.path, handoff.allowedPaths)) {
      throw new Error(`APP_BUILDER_PATH_NOT_ALLOWED:${file.path}`);
    }
  }
}

function generatedFrontend(job: AppBuilderJob): string {
  const appId = JSON.stringify(job.id);
  const title = JSON.stringify(job.prd?.title || 'Generated DSG App');
  const summary = JSON.stringify(job.prd?.summary || job.goal?.normalizedGoal || 'Generated full-stack app');
  const planHash = JSON.stringify(job.planHash || 'missing');
  const approvalHash = JSON.stringify(job.approvalHash || 'missing');

  return `'use client';

import React, { useEffect, useState } from 'react';

type Item = { id: string; title: string; completed: boolean; created_at: string };

const APP_ID = ${appId};
const APP_TITLE = ${title};
const APP_SUMMARY = ${summary};
const PLAN_HASH = ${planHash};
const APPROVAL_HASH = ${approvalHash};

export default function GeneratedDsgAppPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('First governed task');
  const [status, setStatus] = useState('Loading backend evidence…');

  async function loadItems() {
    setStatus('Loading backend evidence…');
    const response = await fetch(\`/api/generated-apps/\${APP_ID}/items\`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_BACKEND_FAILED');
    setItems(json.data.items);
    setStatus('Backend API + database table reachable');
  }

  async function addItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const response = await fetch(\`/api/generated-apps/\${APP_ID}/items\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_CREATE_FAILED');
    setTitle('');
    await loadItems();
  }

  useEffect(() => {
    loadItems().catch((error) => setStatus(error instanceof Error ? error.message : 'GENERATED_APP_LOAD_FAILED'));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8 shadow-2xl shadow-indigo-950/30">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">DSG Generated Full-Stack App</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">{APP_TITLE}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{APP_SUMMARY}</p>
          <div className="mt-6 grid gap-3 text-xs font-mono text-slate-400 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">planHash: {PLAN_HASH}</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">approvalHash: {APPROVAL_HASH}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Add a database-backed item"
            />
            <button onClick={() => addItem().catch((error) => setStatus(error instanceof Error ? error.message : 'GENERATED_APP_CREATE_FAILED'))} className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500">
              Add item
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-400">{status}</p>
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!items.length && <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">No rows yet, or database migration has not been applied.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
`;
}

function generatedApiRoute(job: AppBuilderJob): string {
  const appId = JSON.stringify(job.id);
  return `import { NextResponse } from 'next/server';

type SupabaseRequest = { method?: 'GET' | 'POST'; path: string; query?: string; body?: unknown };
type ItemRow = { id: string; app_id: string; title: string; completed: boolean; created_at: string };

const APP_ID = ${appId};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('GENERATED_APP_SUPABASE_ENV_REQUIRED');
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  return { url: normalizedUrl, key };
}

async function supabaseRest<T>(input: SupabaseRequest): Promise<T> {
  const { url, key } = supabaseConfig();
  const response = await fetch(\`\${url}/rest/v1/\${input.path}\${input.query ?? ''}\`, {
    method: input.method ?? 'GET',
    headers: {
      apikey: key,
      authorization: \`Bearer \${key}\`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : response.statusText;
    throw new Error(message || 'GENERATED_APP_SUPABASE_REQUEST_FAILED');
  }
  return data as T;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'GENERATED_APP_REQUEST_FAILED';
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 400 });
}

export async function GET() {
  try {
    const rows = await supabaseRest<ItemRow[]>({
      path: 'generated_app_items',
      query: \`?app_id=eq.\${encodeURIComponent(APP_ID)}&select=id,title,completed,created_at&order=created_at.desc\`,
    });
    return NextResponse.json({ ok: true, data: { appId: APP_ID, items: rows } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string };
    const title = body.title?.trim();
    if (!title) throw new Error('GENERATED_APP_TITLE_REQUIRED');
    const rows = await supabaseRest<ItemRow[]>({
      method: 'POST',
      path: 'generated_app_items',
      body: { app_id: APP_ID, title, completed: false },
    });
    return NextResponse.json({ ok: true, data: { item: rows[0] } });
  } catch (error) {
    return fail(error);
  }
}
`;
}

function generatedMigration(job: AppBuilderJob): string {
  return `-- Generated by DSG App Builder runtime for job ${job.id}
-- Goal: ${escapeComment(job.goal?.normalizedGoal || 'generated app')}

create extension if not exists pgcrypto;

create table if not exists generated_app_items (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_app_items_app_id_created_at_idx
  on generated_app_items(app_id, created_at desc);

alter table generated_app_items enable row level security;
`;
}

function generatedRunbook(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff): string {
  return `# DSG Generated App Evidence

- App Builder Job: \`${job.id}\`
- Workspace: \`${job.workspaceId}\`
- Plan Hash: \`${handoff.planHash}\`
- Approval Hash: \`${handoff.approvalHash}\`
- Claim Status: \`IMPLEMENTED_UNVERIFIED\`

## What was generated

1. A Next.js frontend route under \`app/generated-apps/${job.id}/page.tsx\`.
2. A Next.js backend API route under \`app/api/generated-apps/${job.id}/items/route.ts\`.
3. A Supabase migration for \`generated_app_items\`.

## Truth boundary

This PR is implementation evidence only. Do not claim DEPLOYABLE or PRODUCTION until CI, migration apply, deployment proof, and production-flow proof pass.
`;
}

export function buildGeneratedAppFiles(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff): AppBuilderGeneratedFile[] {
  const appSlug = safeSegment(job.id);
  const migrationStamp = timestampForMigration();
  return [
    {
      path: `app/generated-apps/${appSlug}/page.tsx`,
      content: generatedFrontend(job),
      evidenceKind: 'frontend',
    },
    {
      path: `app/api/generated-apps/${appSlug}/items/route.ts`,
      content: generatedApiRoute(job),
      evidenceKind: 'backend_api',
    },
    {
      path: `supabase/migrations/${migrationStamp}_create_generated_app_items_${appSlug.slice(0, 8)}.sql`,
      content: generatedMigration(job),
      evidenceKind: 'database_migration',
    },
    {
      path: `docs/dsg-generated-apps/${appSlug}.md`,
      content: generatedRunbook(job, handoff),
      evidenceKind: 'documentation',
    },
  ];
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
      message: `DSG App Builder: ${sha ? 'update' : 'create'} ${file.path}`,
      content: Buffer.from(file.content, 'utf8').toString('base64'),
      branch: branchName,
      sha,
      committer: {
        name: 'DSG App Builder',
        email: 'dsg-app-builder@users.noreply.github.com',
      },
      author: {
        name: job.createdBy || 'DSG Operator',
        email: 'dsg-operator@users.noreply.github.com',
      },
    }),
  });
}

async function createOrGetPullRequest(config: GithubRuntimeConfig, branchName: string, job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff): Promise<GithubPullResponse> {
  const body = [
    '## DSG App Builder Runtime Output',
    '',
    `App Builder Job: \`${job.id}\``,
    `Plan Hash: \`${handoff.planHash}\``,
    `Approval Hash: \`${handoff.approvalHash}\``,
    '',
    'This PR contains generated frontend, backend API route, database migration, and evidence runbook.',
    '',
    '**Claim boundary:** IMPLEMENTED_UNVERIFIED only. Do not claim DEPLOYABLE or PRODUCTION until CI, migration apply, deployment proof, and production-flow proof pass.',
  ].join('\n');

  try {
    return await githubJson<GithubPullResponse>(config, '/pulls', {
      method: 'POST',
      body: JSON.stringify({
        title: `DSG App Builder output: ${job.prd?.title || job.id}`,
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

export async function executeApprovedAppBuilderJob(job: AppBuilderJob): Promise<AppBuilderRuntimeExecutionResult> {
  const handoff = createAppBuilderRuntimeHandoff(job);
  const files = buildGeneratedAppFiles(job, handoff);
  assertRuntimeAllowed(job, handoff, files);

  const config = runtimeConfig();
  const branchName = `dsg-builder-${safeSegment(job.id).slice(0, 16)}`;

  await ensureBranch(config, branchName);
  for (const file of files) await putFile(config, branchName, file, job);
  const pullRequest = await createOrGetPullRequest(config, branchName, job, handoff);

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
      note: 'Files were written through GitHub Contents API after approved runtime handoff. Build/deploy/production claims remain blocked until external evidence passes.',
    },
  };
}
