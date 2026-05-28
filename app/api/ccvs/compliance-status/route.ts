/**
 * GET  /api/ccvs/compliance-status  — live badge + claim_pass_eligible status
 * POST /api/ccvs/compliance-status  — CI uploads compliance matrix after each run
 *
 * In-memory cache is intentional: resets on cold start so CI must re-upload
 * after each Vercel deployment. No auth for MVP (public CI upload).
 */

import { NextResponse } from 'next/server';
import type { ComplianceMatrix } from '../../../../lib/ccvs/compliance-matrix';
import { REQUIREMENT_CATALOG } from '../../../../lib/ccvs/compliance-matrix';
import { readJsonBody } from '../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

interface CachedStatus {
  claim_pass_eligible: boolean;
  last_ci_run: string;
  run_id: string;
  mutation_score: number | null;
  requirements_pass: number;
  requirements_total: number;
  updated_at: string;
}

let cachedStatus: CachedStatus | null = null;

function shieldColor(eligible: boolean | null): string {
  if (eligible === null) return 'lightgrey';
  return eligible ? 'brightgreen' : 'red';
}

function shieldMessage(eligible: boolean | null): string {
  if (eligible === null) return 'pending';
  return eligible ? 'eligible' : 'not eligible';
}

export async function GET() {
  const deployment = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
    env: process.env.VERCEL_ENV ?? 'local',
    policy_version: process.env.DSG_POLICY_VERSION ?? 'v1',
  };

  const eligible = cachedStatus?.claim_pass_eligible ?? null;

  return NextResponse.json({
    ok: true,
    schema_version: '1.0.0',
    deployment,
    claim_pass_eligible: eligible,
    last_ci_run: cachedStatus?.last_ci_run ?? null,
    run_id: cachedStatus?.run_id ?? null,
    mutation_score: cachedStatus?.mutation_score ?? null,
    requirements_pass: cachedStatus?.requirements_pass ?? null,
    requirements_total: cachedStatus?.requirements_total ?? REQUIREMENT_CATALOG.length,
    shield: {
      label: 'CCVS',
      message: shieldMessage(eligible),
      color: shieldColor(eligible),
    },
    updated_at: cachedStatus?.updated_at ?? null,
    note: 'POST { matrix, run_id, mutation_score } here from CI to update live status. Cache resets on cold start.',
  });
}

export async function POST(request: Request) {
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

  cachedStatus = {
    claim_pass_eligible: matrix.summary.claim_pass_eligible,
    last_ci_run: matrix.generated_at ?? new Date().toISOString(),
    run_id,
    mutation_score: typeof mutation_score === 'number' ? mutation_score : null,
    requirements_pass: matrix.summary.pass ?? 0,
    requirements_total: matrix.summary.total ?? REQUIREMENT_CATALOG.length,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({
    ok: true,
    claim_pass_eligible: cachedStatus.claim_pass_eligible,
    shield: {
      label: 'CCVS',
      message: shieldMessage(cachedStatus.claim_pass_eligible),
      color: shieldColor(cachedStatus.claim_pass_eligible),
    },
    updated_at: cachedStatus.updated_at,
  });
}
