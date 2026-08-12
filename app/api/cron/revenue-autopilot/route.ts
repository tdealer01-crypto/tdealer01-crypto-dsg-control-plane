import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { requireCronAuth } from '../../../../lib/security/cron-auth';
import { verifyGitHubActionsOidcToken } from '../../../../lib/security/github-actions-oidc';
import { getDueRevenueAutopilotJobs, type DueRevenueAutopilotJob } from '../../../../lib/revenue/autopilot-schedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const STALE_RUNNING_MS = 30 * 60 * 1000;
const MAX_RESULT_CHARS = 4000;

type AuthKind = 'github-oidc' | 'cron-secret';
type RunRow = {
  id: string;
  status: 'running' | 'success' | 'failure' | 'skipped';
  attempts: number;
  started_at: string;
};

type JobResult = {
  job: string;
  bucket: string;
  status: 'success' | 'failure' | 'skipped';
  httpStatus?: number;
  detail?: unknown;
};

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function authorize(request: Request): Promise<
  | { ok: true; kind: AuthKind }
  | { ok: false; response: NextResponse }
> {
  const token = bearerToken(request);
  if (token && token.split('.').length === 3) {
    const audience = process.env.DSG_GITHUB_OIDC_AUDIENCE?.trim() || 'dsg-revenue-autopilot';
    const repository = process.env.DSG_GITHUB_OIDC_REPOSITORY?.trim() || 'tdealer01-crypto/tdealer01-crypto-dsg-control-plane';
    const verified = await verifyGitHubActionsOidcToken(token, {
      audience,
      repository,
      ref: 'refs/heads/main',
      workflowPath: '.github/workflows/revenue-autopilot.yml',
      allowedEvents: ['schedule', 'workflow_dispatch'],
    });
    if (verified.ok === true) return { ok: true, kind: 'github-oidc' };
  }

  const cron = requireCronAuth(request, 'revenue-autopilot');
  if (cron.ok === true) return { ok: true, kind: 'cron-secret' };
  return { ok: false, response: cron.response };
}

function compactResult(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (serialized.length <= MAX_RESULT_CHARS) return value;
  return { truncated: true, preview: serialized.slice(0, MAX_RESULT_CHARS) };
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) return compactResult(await response.json());
    return compactResult(await response.text());
  } catch {
    return null;
  }
}

async function claimJob(job: DueRevenueAutopilotJob, source: AuthKind): Promise<
  | { run: RunRow; execute: true }
  | { run: RunRow | null; execute: false; reason: string }
> {
  const admin = getSupabaseAdmin() as any;
  const now = new Date();
  const insert = await admin
    .from('revenue_autopilot_runs')
    .insert({
      job: job.name,
      bucket: job.bucket,
      source,
      status: 'running',
      attempts: 1,
      started_at: now.toISOString(),
    })
    .select('id,status,attempts,started_at')
    .maybeSingle();

  if (!insert.error && insert.data) {
    return { run: insert.data as RunRow, execute: true };
  }

  if (String(insert.error?.code ?? '') !== '23505') {
    return { run: null, execute: false, reason: 'claim_failed' };
  }

  const existing = await admin
    .from('revenue_autopilot_runs')
    .select('id,status,attempts,started_at')
    .eq('job', job.name)
    .eq('bucket', job.bucket)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return { run: null, execute: false, reason: 'claim_lookup_failed' };
  }

  const row = existing.data as RunRow;
  if (row.status === 'success') return { run: row, execute: false, reason: 'already_success' };
  if (row.attempts >= MAX_ATTEMPTS) return { run: row, execute: false, reason: 'max_attempts' };

  const startedMs = new Date(row.started_at).getTime();
  const stale = !Number.isFinite(startedMs) || now.getTime() - startedMs >= STALE_RUNNING_MS;
  if (row.status === 'running' && !stale) return { run: row, execute: false, reason: 'already_running' };
  if (row.status !== 'failure' && row.status !== 'running') return { run: row, execute: false, reason: 'not_retryable' };

  const retry = await admin
    .from('revenue_autopilot_runs')
    .update({
      source,
      status: 'running',
      attempts: row.attempts + 1,
      started_at: now.toISOString(),
      finished_at: null,
      http_status: null,
      result: null,
      error: null,
    })
    .eq('id', row.id)
    .eq('attempts', row.attempts)
    .select('id,status,attempts,started_at')
    .maybeSingle();

  if (retry.error || !retry.data) return { run: row, execute: false, reason: 'retry_claim_lost' };
  return { run: retry.data as RunRow, execute: true };
}

async function finishRun(
  id: string,
  update: { status: 'success' | 'failure'; http_status: number; result?: unknown; error?: string | null },
): Promise<void> {
  const admin = getSupabaseAdmin() as any;
  await admin
    .from('revenue_autopilot_runs')
    .update({
      ...update,
      result: update.result === undefined ? null : compactResult(update.result),
      finished_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function executeJob(
  job: DueRevenueAutopilotJob,
  baseUrl: string,
  cronSecret: string,
  source: AuthKind,
): Promise<JobResult> {
  const claim = await claimJob(job, source);
  if (claim.execute === false) {
    return { job: job.name, bucket: job.bucket, status: 'skipped', detail: claim.reason };
  }

  const run = claim.run;
  try {
    const response = await fetch(`${baseUrl}${job.path}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'user-agent': 'DSG-Revenue-Autopilot/1.0',
        'x-dsg-autopilot-job': job.name,
        'x-dsg-autopilot-bucket': job.bucket,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
    const detail = await parseResponse(response);

    if (!response.ok) {
      await finishRun(run.id, {
        status: 'failure',
        http_status: response.status,
        result: detail,
        error: `job_http_${response.status}`,
      });
      return { job: job.name, bucket: job.bucket, status: 'failure', httpStatus: response.status, detail };
    }

    await finishRun(run.id, {
      status: 'success',
      http_status: response.status,
      result: detail,
      error: null,
    });
    return { job: job.name, bucket: job.bucket, status: 'success', httpStatus: response.status, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'job_request_failed';
    await finishRun(run.id, {
      status: 'failure',
      http_status: 0,
      error: message,
    });
    return { job: job.name, bucket: job.bucket, status: 'failure', httpStatus: 0, detail: message };
  }
}

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const auth = await authorize(request);
  if (auth.ok === false) return auth.response;

  if (process.env.DSG_REVENUE_AUTOPILOT_ENABLED !== 'true') {
    return NextResponse.json(
      { ok: false, error: 'revenue_autopilot_disabled' },
      { status: 503, headers },
    );
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'cron_secret_required_for_internal_jobs' },
      { status: 503, headers },
    );
  }

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = (configuredUrl || new URL(request.url).origin).replace(/\/$/, '');
  const now = new Date();
  const due = getDueRevenueAutopilotJobs(now);
  const results: JobResult[] = [];

  for (const job of due) {
    results.push(await executeJob(job, baseUrl, cronSecret, auth.kind));
  }

  const failed = results.filter((result) => result.status === 'failure');
  const executed = results.filter((result) => result.status === 'success');
  const skipped = results.filter((result) => result.status === 'skipped');

  return NextResponse.json({
    ok: failed.length === 0,
    auth: auth.kind,
    run_at: now.toISOString(),
    due: due.map((job) => job.name),
    executed: executed.map((result) => result.job),
    skipped: skipped.map((result) => ({ job: result.job, reason: result.detail })),
    failed: failed.map((result) => ({ job: result.job, status: result.httpStatus, detail: result.detail })),
  }, { status: failed.length === 0 ? 200 : 207, headers });
}
