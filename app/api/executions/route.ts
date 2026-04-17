import { NextResponse } from "next/server";
import { getDSGCoreLedger, getDSGCoreMetrics } from "../../../lib/dsg-core";
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from "../../../lib/security/rate-limit";
import { logServerError, serverErrorResponse } from "../../../lib/security/error-response";

export const dynamic = "force-dynamic";
const EXECUTIONS_RATE_LIMIT = 60;
const EXECUTIONS_RATE_WINDOW_MS = 60 * 1000;

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, "executions"),
      limit: EXECUTIONS_RATE_LIMIT,
      windowMs: EXECUTIONS_RATE_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, EXECUTIONS_RATE_LIMIT) }
      );
    }

    const access = await requireRuntimeAccess(request, 'executions_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);

    const [{ data, error }, coreLedger, coreMetrics] = await Promise.all([
      supabase
        .from("executions")
        .select(`
          id,
          org_id,
          agent_id,
          decision,
          latency_ms,
          policy_version,
          reason,
          created_at
        `)
        .eq("org_id", access.orgId)
        .order("created_at", { ascending: false })
        .limit(limit),
      getDSGCoreLedger(limit),
      getDSGCoreMetrics(),
    ]);

    if (error) {
      logServerError(error, "executions-get");
      return serverErrorResponse();
    }

    const metricsData = coreMetrics.ok && "data" in coreMetrics ? coreMetrics.data : null;
    const metricsError = !coreMetrics.ok && "error" in coreMetrics ? coreMetrics.error : null;

    return NextResponse.json({
      ok: true,
      executions: data ?? [],
      core: {
        ledger_ok: coreLedger.ok,
        ledger_items: coreLedger.items,
        metrics_ok: coreMetrics.ok,
        metrics: metricsData,
        error: !coreLedger.ok ? coreLedger.error : metricsError,
      },
    });
  } catch (error) {
    logServerError(error, "executions-get");
    return serverErrorResponse();
  }
}
