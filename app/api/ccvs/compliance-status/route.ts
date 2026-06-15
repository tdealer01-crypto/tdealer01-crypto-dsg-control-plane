/**
 * GET  /api/ccvs/compliance-status          — latest report (Supabase-backed, fail-closed)
 * GET  /api/ccvs/compliance-status?run_id=X — fetch specific report by run_id (shareable link)
 * POST /api/ccvs/compliance-status          — CI uploads compliance matrix after each run
 *
 * Persists to `delivery_proof_reports` Supabase table so reports survive cold starts
 * and can be shared via /delivery-proof/report/[run_id].
 * Returns 503 when Supabase is unavailable — no in-memory fallback.
 */

import { NextResponse } from 'next/server';
import type { ComplianceMatrix } from '../../../../lib/ccvs/compliance-matrix';
import { REQUIREMENT_CATALOG } from '../../../../lib/ccvs/compliance-matrix';
import { readJsonBody } from '../../../../lib/security/request-json';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

interface DbStatus {
  claim_pass_eligible: boolean;
  last_ci_run: string;
  run_id: string;
  mutation_score: number | null;
  requirements_pass: number;
  requirements_total: number;
  updated_at: string;
}

function shieldColor(eligible: boolean | null): string {
  if (eligible === null) return 'lightgrey';
  return eligible ? 'brightgreen' : 'red';
}

function shieldMessage(eligible: boolean | null): string {
  if (eligible === null) return 'pending';
  return eligible ? 'eligible' : 'not eligible';
}

function getShareUrl(runId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'https://tdealer01-crypto-dsg-control-plane.vercel.app';
  return `${base}/delivery-proof/report/${encodeURIComponent(runId)}`;
}

type SupabaseResult =
  | { ok: true; data: DbStatus }
  | { ok: false; notFound: true }
  | { ok: false; notFound: false; error: string };

async function loadFromSupabase(runId?: string): Promise<SupabaseResult> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from('delivery_proof_reports')
      .select('run_id, claim_pass_eligible, mutation_score, requirements_pass, requirements_total, last_ci_run, updated_at');

    const { data, error } = runId
      ? await query.eq('run_id', runId).single()
      : await query.order('created_at', { ascending: false }).limit(1).single();

    if (error) {
      // PGRST116 = no rows found — not a DB connectivity error
      if ((error as { code?: string }).code === 'PGRST116') {
        return { ok: false, notFound: true };
      }
      return { ok: false, notFound: false, error: error.message };
    }
    if (!data) return { ok: false, notFound: true };

    return {
      ok: true,
      data: {
        claim_pass_eligible: data.claim_pass_eligible as boolean,
        last_ci_run: (data.last_ci_run as string) ?? new Date().toISOString(),
        run_id: data.run_id as string,
        mutation_score: (data.mutation_score as number | null) ?? null,
        requirements_pass: (data.requirements_pass as number) ?? 0,
        requirements_total: (data.requirements_total as number) ?? REQUIREMENT_CATALOG.length,
        updated_at: data.updated_at as string,
      },
    };
  } catch (err) {
    return { ok: false, notFound: false, error: err instanceof Error ? err.message : 'db_error' };
  }
}

async function saveToSupabase(status: DbStatus, matrix: ComplianceMatrix): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('delivery_proof_reports').upsert(
      {
        run_id: status.run_id,
        claim_pass_eligible: status.claim_pass_eligible,
        mutation_score: status.mutation_score,
        requirements_pass: status.requirements_pass,
        requirements_total: status.requirements_total,
        matrix_json: matrix as unknown as import('../../../../lib/database.types').Json,
        last_ci_run: status.last_ci_run,
        updated_at: status.updated_at,
      },
      { onConflict: 'run_id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'db_error' };
  }
}

export async function GET(request?: Request) {
  const runId = request?.url
    ? (new URL(request.url).searchParams.get('run_id') ?? undefined)
    : undefined;

  const deployment = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
    env: process.env.VERCEL_ENV ?? 'local',
    policy_version: process.env.DSG_POLICY_VERSION ?? 'v1',
  };

  const result = await loadFromSupabase(runId);

  if (result.ok === false && result.notFound === false) {
    // DB connectivity failure — fail closed, do not return stale or fake compliance data
    return NextResponse.json(
      { ok: false, error: 'db_unavailable', deployment },
      { status: 503 },
    );
  }

  const status = result.ok ? result.data : null;
  const eligible = status?.claim_pass_eligible ?? null;

  return NextResponse.json({
    ok: true,
    schema_version: '1.0.0',
    deployment,
    claim_pass_eligible: eligible,
    last_ci_run: status?.last_ci_run ?? null,
    run_id: status?.run_id ?? null,
    mutation_score: status?.mutation_score ?? null,
    requirements_pass: status?.requirements_pass ?? null,
    requirements_total: status?.requirements_total ?? REQUIREMENT_CATALOG.length,
    shield: {
      label: 'CCVS',
      message: shieldMessage(eligible),
      color: shieldColor(eligible),
    },
    share_url: status?.run_id ? getShareUrl(status.run_id) : null,
    updated_at: status?.updated_at ?? null,
    note: 'POST { matrix, run_id, mutation_score } here from CI to update live status.',
  });
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.CCVS_UPLOAD_TOKEN;
  if (expected && token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await readJsonBody<{ matrix?: ComplianceMatrix; run_id?: string; mutation_score?: number }>(
    request,
    { maxBytes: 262_144 },
  );
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const { matrix, run_id, mutation_score } = parsed.value ?? {};

  if (!matrix || typeof matrix !== 'object') {
    return NextResponse.json({ ok: false, error: 'matrix is required' }, { status: 400 });
  }
  if (!run_id || typeof run_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'run_id is required' }, { status: 400 });
  }
  if (!matrix.summary || typeof matrix.summary.claim_pass_eligible !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'matrix.summary.claim_pass_eligible is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newStatus: DbStatus = {
    claim_pass_eligible: matrix.summary.claim_pass_eligible,
    last_ci_run: matrix.generated_at ?? now,
    run_id,
    mutation_score: typeof mutation_score === 'number' ? mutation_score : null,
    requirements_pass: matrix.summary.pass ?? 0,
    requirements_total: matrix.summary.total ?? REQUIREMENT_CATALOG.length,
    updated_at: now,
  };

  const saved = await saveToSupabase(newStatus, matrix);
  if (!saved.ok) {
    return NextResponse.json(
      { ok: false, error: 'db_unavailable', detail: saved.error },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    claim_pass_eligible: newStatus.claim_pass_eligible,
    run_id,
    share_url: getShareUrl(run_id),
    shield: {
      label: 'CCVS',
      message: shieldMessage(newStatus.claim_pass_eligible),
      color: shieldColor(newStatus.claim_pass_eligible),
    },
    updated_at: newStatus.updated_at,
  });
}
