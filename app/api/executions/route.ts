import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDSGCoreLedger, getDSGCoreMetrics } from "../../../lib/dsg-core";
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

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
        .eq("org_id", profile.org_id)
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
