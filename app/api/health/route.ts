import { getDSGCoreHealth } from '../../../lib/dsg-core';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getDeploymentReadiness, type ReadinessReport } from '../../../lib/deployment/readiness';
import { handleApiError } from '../../../lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

const HEALTH_TIMEOUT_MS = 5_000;
const UNAVAILABLE_CHECK = { ok: false, detail: 'health_dependency_unavailable' };
type SupabaseProbeResult = {
  error: { message?: string } | null;
};

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeSupabaseOrganizations(): Promise<SupabaseProbeResult> {
  const admin = getSupabaseAdmin();
  const result = await admin.from('organizations').select('id').limit(1);
  return { error: result.error };
}

function unavailableReadiness(detail: string): ReadinessReport {
  return {
    ok: false,
    checks: {
      env: UNAVAILABLE_CHECK,
      nextAuthSecret: UNAVAILABLE_CHECK,
      supabaseServiceRole: { ok: false, detail },
      dsgCoreConfig: { ok: false, detail },
      dsgCoreHealth: { ok: false, detail },
      financeGovernanceSurface: UNAVAILABLE_CHECK,
      financeGovernanceBackend: { ok: false, detail },
    },
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'health'),
      limit: 60,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 60) }
      );
    }

    let dbOk = false;
    try {
      const dbResult = await withTimeout(
        probeSupabaseOrganizations(),
        'health_db'
      );
      const dbError = dbResult.error;
      dbOk = !dbError;
    } catch {
      dbOk = false;
    }

    const [coreResult, readinessResult] = await Promise.allSettled([
      withTimeout(getDSGCoreHealth(), 'health_core'),
      withTimeout(getDeploymentReadiness(), 'health_readiness', 7_000),
    ]);

    const core = coreResult.status === 'fulfilled'
      ? coreResult.value
      : {
          ok: false,
          error: coreResult.reason instanceof Error ? coreResult.reason.message : 'core_unreachable',
        };

    const readiness = readinessResult.status === 'fulfilled'
      ? readinessResult.value
      : unavailableReadiness(
          readinessResult.reason instanceof Error ? readinessResult.reason.message : 'readiness_unavailable'
        );

    const coreDetails = core as {
      status?: unknown;
      version?: unknown;
      timestamp?: unknown;
      error?: unknown;
    };

    return Response.json({
      ok: core.ok && dbOk && readiness.ok,
      service: 'dsg-control-plane',
      timestamp: new Date().toISOString(),
      core_ok: core.ok,
      db_ok: dbOk,
      error: (core.ok && dbOk && readiness.ok) ? null : (!dbOk ? 'db_unreachable' : (coreDetails.error ?? 'release_not_ready')),
      core: {
        ok: core.ok && dbOk && readiness.ok,
        status: coreDetails.status ?? null,
        version: coreDetails.version ?? null,
        timestamp: coreDetails.timestamp ?? null,
        error: core.ok ? null : coreDetails.error ?? 'core_unreachable',
      },
      readiness,
    }, { headers: buildRateLimitHeaders(rateLimit, 60) });
  } catch (error) {
    return handleApiError('api/health', error);
  }
}
