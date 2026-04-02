import { NextResponse } from "next/server";
import { getDSGCoreHealth } from "../../../lib/dsg-core";
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from "../../../lib/security/rate-limit";
import {
  KNOWN_GAPS,
  SOURCE_OF_TRUTH_MAP,
  VERIFIED_FORMAL_CORE,
} from "../../../lib/integration-status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'integration'),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit, 30) }
    );
  }

  const core = await getDSGCoreHealth();

  return NextResponse.json({
    ok: true,
    service: "dsg-control-plane",
    timestamp: new Date().toISOString(),
    verified_formal_core: VERIFIED_FORMAL_CORE,
    source_of_truth: SOURCE_OF_TRUTH_MAP,
    integration_status: {
      control_plane_ready: true,
      core_health_ok: core.ok,
      core,
    },
    known_gaps: KNOWN_GAPS,
  }, { headers: buildRateLimitHeaders(rateLimit, 30) });
}
