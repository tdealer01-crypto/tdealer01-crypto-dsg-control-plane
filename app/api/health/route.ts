import { getDSGCoreHealth } from '../../../lib/dsg-core';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getDeploymentReadiness } from '../../../lib/deployment/readiness';
import { handleApiError } from '../../../lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

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
      const admin = getSupabaseAdmin();
      const { error: dbError } = await admin.from('organizations').select('id').limit(1);
      dbOk = !dbError;
    } catch {
      dbOk = false;
    }

    const [core, readiness] = await Promise.all([
      getDSGCoreHealth(),
      getDeploymentReadiness(),
    ]);
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
