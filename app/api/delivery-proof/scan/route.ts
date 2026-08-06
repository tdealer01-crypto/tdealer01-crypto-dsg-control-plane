/**
 * POST /api/delivery-proof/scan
 * Runs a live delivery-proof check and returns a report only after authenticated
 * usage evidence has been persisted safely.
 */

import { NextResponse } from 'next/server';
import { readJsonBody } from '../../../../lib/security/request-json';
import { createClient } from '../../../../lib/supabase/server';
import { fireWebhook } from '../../../../lib/webhooks/deliver';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import {
  checkDeliveryProofEntitlement,
  recordDeliveryProofScan,
  type EntitlementCheck,
} from '../../../../lib/delivery-proof/entitlement';

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
        const json = (await res.json()) as Record<string, unknown>;
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
        : `HTTP ${res.status}${
            expectJsonOk && !jsonOk ? ' — ok field missing or false' : ''
          }`,
    };
  } catch (e) {
    return {
      name: label,
      status: 'fail',
      detail: `Network error: ${String(e).slice(0, 120)}`,
    };
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
        matrix_json: {
          checks,
          production_url: productionUrl,
          generated_at: new Date().toISOString(),
        } as unknown as import('../../../../lib/database.types').Json,
        last_ci_run: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'run_id' },
    );
  } catch {
    // Report persistence is a separate best-effort read model. Paid delivery is
    // controlled by recordDeliveryProofScan below.
  }
}

export async function POST(request: Request) {
  const parsed = await readJsonBody<ScanInput>(request, { maxBytes: 4_096 });
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status },
    );
  }

  const {
    production_url,
    repo_url,
    readiness_path = '/api/readiness',
  } = parsed.value ?? {};

  if (!production_url || typeof production_url !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'production_url is required' },
      { status: 400 },
    );
  }

  let base: string;
  try {
    const u = new URL(production_url);
    base = u.origin;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'production_url must be a valid URL' },
      { status: 400 },
    );
  }

  let orgId: string | null = null;
  let entitlementCheck: EntitlementCheck | null = null;

  try {
    const profile = await requireActiveProfile();
    if (profile.ok) {
      orgId = profile.orgId;
      entitlementCheck = await checkDeliveryProofEntitlement(orgId);

      if (!entitlementCheck.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: entitlementCheck.message,
            requiresUpgrade: entitlementCheck.requiresPayment,
            tier: entitlementCheck.tier,
          },
          { status: entitlementCheck.requiresPayment ? 402 : 503 },
        );
      }
    }
  } catch {
    const freeCheck = await checkDeliveryProofEntitlement(null);
    if (!freeCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: freeCheck.message,
          requiresUpgrade: freeCheck.requiresPayment,
        },
        { status: freeCheck.requiresPayment ? 402 : 503 },
      );
    }
    entitlementCheck = freeCheck;
  }

  const checks: CheckResult[] = [];
  checks.push(await checkEndpoint('Homepage', base, [200]));

  const readinessUrl = `${base}${
    readiness_path.startsWith('/') ? readiness_path : `/${readiness_path}`
  }`;
  checks.push(
    await checkEndpoint('Readiness endpoint', readinessUrl, [200], true),
  );
  checks.push(
    await checkEndpoint('Health endpoint', `${base}/api/health`, [200], true),
  );
  checks.push(
    await checkEndpoint(
      'Protected route (auth gate)',
      `${base}/api/agent-executions`,
      [401, 403],
    ),
  );
  checks.push({
    name: 'GitHub repo',
    status: repo_url ? 'pass' : 'skip',
    detail: repo_url
      ? `Repo URL provided: ${repo_url}`
      : 'No repo URL provided — skipped',
  });

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const eligible = failCount === 0 && passCount > 0;

  const runId = generateRunId();
  await saveReport(runId, checks, eligible, base);

  const recordResult = await recordDeliveryProofScan(
    runId,
    orgId,
    base,
    eligible ? 'EVIDENCE COMPLETE' : 'PRODUCTION BLOCKED',
    passCount,
    checks.filter((c) => c.status !== 'skip').length,
  );

  if (!recordResult.scanRecorded) {
    return NextResponse.json(
      {
        ok: false,
        error: 'delivery_proof_usage_evidence_unavailable',
        message:
          'Report withheld because authenticated usage or billing evidence could not be completed safely.',
      },
      { status: 503 },
    );
  }

  const billingStatus = recordResult.meterEventId
    ? 'meter_sent'
    : recordResult.error
      ? 'meter_retry_pending'
      : 'included_or_demo';

  void (async () => {
    try {
      const profile = await requireActiveProfile();
      if (profile.ok) {
        await fireWebhook(profile.orgId, 'proof.scan_completed', {
          run_id: runId,
          production_url: base,
          claim_result: eligible
            ? 'EVIDENCE COMPLETE'
            : 'PRODUCTION BLOCKED',
          pass: passCount,
          tier: entitlementCheck?.tier,
          billing_status: billingStatus,
        });
      }
    } catch {
      // Webhook delivery is downstream notification, not billing evidence.
    }
  })();

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
    summary: {
      pass: passCount,
      fail: failCount,
      skip: checks.filter((c) => c.status === 'skip').length,
    },
    billing_status: billingStatus,
    entitlement: entitlementCheck
      ? {
          tier: entitlementCheck.tier,
          scansRemaining: entitlementCheck.scansRemaining,
        }
      : undefined,
  });
}
