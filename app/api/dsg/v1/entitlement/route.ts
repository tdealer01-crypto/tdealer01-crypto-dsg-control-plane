import { NextResponse } from 'next/server';
import {
  dsgAuthError,
  requireDsgAuth,
} from '@/lib/dsg/auth/require-dsg-auth';
import { checkGateEntitlement } from '@/lib/dsg/gate-entitlement';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dsg/v1/entitlement
 *
 * Client contract for web, Android, and MCP clients. It exposes only the
 * caller's effective tier and usage state; Stripe identifiers remain server-side.
 */
export async function GET(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-entitlement:${caller.orgId}`),
    limit: 60,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers },
    );
  }

  const entitlement = await checkGateEntitlement(caller.orgId);

  return NextResponse.json(
    {
      ok: true,
      entitlement: {
        allowed: entitlement.allowed,
        tier: entitlement.tier,
        evalsRemaining: entitlement.evalsRemaining,
        accessMode: entitlement.accessMode,
        requiresPayment: entitlement.requiresPayment,
        message: entitlement.message,
        upgradeUrl: entitlement.upgradeUrl,
      },
    },
    { headers },
  );
}
