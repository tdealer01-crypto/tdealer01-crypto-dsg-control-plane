import { getDSGCoreHealth } from '../../../lib/dsg-core';
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

    const core = await getDSGCoreHealth();
    const coreDetails = core as {
      status?: unknown;
      version?: unknown;
      timestamp?: unknown;
      error?: unknown;
    };

    return Response.json({
      ok: core.ok,
      service: 'dsg-control-plane',
      timestamp: new Date().toISOString(),
      core_ok: core.ok,
      error: core.ok ? null : coreDetails.error ?? null,
      core: {
        ok: core.ok,
        status: coreDetails.status ?? null,
        version: coreDetails.version ?? null,
        timestamp: coreDetails.timestamp ?? null,
        error: core.ok ? null : coreDetails.error ?? 'core_unreachable',
      },
    }, { headers: buildRateLimitHeaders(rateLimit, 60) });
  } catch (error) {
    return handleApiError('api/health', error);
  }
}
