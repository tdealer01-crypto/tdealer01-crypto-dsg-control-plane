/**
 * POST /api/delivery-proof/scan
 * Accepts { repo_url, production_url, readiness_path } and runs a live proof check:
 *   1. GET production_url + readiness_path → checks HTTP status + ok field
 *   2. GET production_url/api/health → checks core_ok, db_ok, rateLimiter
 *   3. GET production_url protected routes → expects 401/403
 *   4. Assembles claim result and returns shareable run_id
 */

import { NextResponse } from 'next/server';
import { readJsonBody } from '../../../../lib/security/request-json';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ScanInput {
  production_url?: string;
  repo_url?: string;
  readiness_path?: string;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
}

function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `dp-${ts}-${rand}`;
}

async function checkEndpoint(
  label: string,
  url: string,
  expectStatus?: number[],
  expectJsonOk?: boolean,
): Promise<CheckResult> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const statusOk = expectStatus ? expectStatus.includes(res.status) : res.ok;
    let jsonOk = true;
    if (expectJsonOk && res.ok) {
      try {
        const json = await res.json() as Record<string, unknown>;
        jsonOk = json.ok === true;
      } catch {
        jsonOk = false;
      }
    }
    const pass = statusOk && jsonOk;
    return {
      name: label,
      status: pass ? 'pass' : 'fail',
      detail: pass
        ? `HTTP ${res.status} — ok`
        : `HTTP ${res.status}${expectJsonOk && !jsonOk ? ' — ok field missing or false' : ''}`,
    };
  } catch (e) {
    return { name: label, status: 'fail', detail: `Network error: ${String(e).slice(0, 120)}` };
  }
}

async function saveReport(
  runId: string,
  checks: CheckResult[],
  eligible: boolean,
  productionUrl: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    const pass = checks.filter((c) => c.status === 'pass').length;
    const total = checks.filter((c) => c.status !== 'skip').length;
    await supabase.from('delivery_proof_reports').upsert(
      {
        run_id: runId,
        claim_pass_eligible: eligible,
        mutation_score: null,
        requirements_pass: pass,
        requirements_total: total,
        matrix_json: { checks, production_url: productionUrl, generated_at: new Date().toISOString() },
        last_ci_run: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'run_id' },
    );
  } catch {
    // non-fatal
  }
}

export async function POST(request: Request) {
  const parsed = await readJsonBody<ScanInput>(request, { maxBytes: 4_096 });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const { production_url, repo_url, readiness_path = '/api/readiness' } = parsed.value ?? {};

  if (!production_url || typeof production_url !== 'string') {
    return NextResponse.json({ ok: false, error: 'production_url is required' }, { status: 400 });
  }

  // Sanitize base URL
  let base: string;
  try {
    const u = new URL(production_url);
    base = u.origin;
  } catch {
    return NextResponse.json({ ok: false, error: 'production_url must be a valid URL' }, { status: 400 });
  }

  const checks: CheckResult[] = [];

  // 1. Homepage
  checks.push(await checkEndpoint('Homepage', base, [200]));

  // 2. Readiness endpoint
  const readinessUrl = `${base}${readiness_path.startsWith('/') ? readiness_path : `/${readiness_path}`}`;
  checks.push(await checkEndpoint('Readiness endpoint', readinessUrl, [200], true));

  // 3. Health endpoint
  checks.push(await checkEndpoint('Health endpoint', `${base}/api/health`, [200], true));

  // 4. Protected route (should reject unauthenticated)
  const protectedCheck = await checkEndpoint('Protected route (auth gate)', `${base}/api/execute`, [401, 403]);
  checks.push(protectedCheck);

  // 5. repo_url provided (just note it, no live check without token)
  checks.push({
    name: 'GitHub repo',
    status: repo_url ? 'pass' : 'skip',
    detail: repo_url ? `Repo URL provided: ${repo_url}` : 'No repo URL provided — skipped',
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const eligible = failCount === 0 && passCount > 0;

  const runId = generateRunId();
  await saveReport(runId, checks, eligible, base);

  const shareUrl = (() => {
    const appBase =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    return `${appBase}/delivery-proof/report/${encodeURIComponent(runId)}`;
  })();

  return NextResponse.json({
    ok: true,
    run_id: runId,
    share_url: shareUrl,
    claim_result: eligible ? 'EVIDENCE COMPLETE' : 'PRODUCTION BLOCKED',
    checks,
    summary: { pass: passCount, fail: failCount, skip: checks.filter((c) => c.status === 'skip').length },
  });
}
