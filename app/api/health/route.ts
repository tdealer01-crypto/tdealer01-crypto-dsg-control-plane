import { getDSGCoreHealth } from '../../../lib/dsg-core';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

export async function GET(request: Request) {
  const rateLimit = applyRateLimit({
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

  return Response.json({
    ok: core.ok,
    service: 'dsg-control-plane',
    timestamp: new Date().toISOString(),
    core_ok: core.ok,
    error: core.ok ? null : core.error ?? null,
    core: {
      ok: core.ok,
      status: core.status ?? null,
      version: core.version ?? null,
      timestamp: core.timestamp ?? null,
      error: core.ok ? null : core.error ?? 'core_unreachable',
    },
  }, { headers: buildRateLimitHeaders(rateLimit, 60) });
}
