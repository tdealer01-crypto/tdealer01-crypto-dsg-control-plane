import { NextResponse } from "next/server";
import { requireRuntimeAccess } from "../../../lib/authz-runtime";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from "../../../lib/security/rate-limit";
import { logServerError, serverErrorResponse } from "../../../lib/security/error-response";

export const dynamic = "force-dynamic";
const AUDIT_LOGS_RATE_LIMIT = 100;
const AUDIT_LOGS_RATE_WINDOW_MS = 60 * 1000;

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, "audit-logs"),
      limit: AUDIT_LOGS_RATE_LIMIT,
      windowMs: AUDIT_LOGS_RATE_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, AUDIT_LOGS_RATE_LIMIT) }
      );
    }

    const access = await requireRuntimeAccess(request, 'audit_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);

    // Query parameters
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const actor = url.searchParams.get("actor");
    const decision = url.searchParams.get("decision");
    const agentId = url.searchParams.get("agent_id");
    const search = url.searchParams.get("search");

    // Build query
    let query = supabase
      .from("audit_logs")
      .select(`
        id,
        org_id,
        agent_id,
        execution_id,
        decision,
        reason,
        policy_version,
        actor_uuid,
        metadata,
        evidence,
        created_at
      `, { count: "exact" })
      .eq("org_id", access.orgId);

    // Apply filters
    if (startDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", new Date(endDate).toISOString());
    }
    if (decision) {
      query = query.eq("decision", decision);
    }
    if (agentId) {
      query = query.eq("agent_id", agentId);
    }
    if (actor) {
      query = query.eq("actor_uuid", actor);
    }

    // Search in reason (simple text search)
    if (search) {
      query = query.ilike("reason", `%${search}%`);
    }

    // Apply pagination and sorting
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logServerError(error, "audit-logs-get");
      return serverErrorResponse();
    }

    const total = count ?? 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      ok: true,
      events: data ?? [],
      pagination: {
        limit,
        offset,
        total,
        has_more: hasMore,
      },
    });
  } catch (error) {
    logServerError(error, "audit-logs-get");
    return serverErrorResponse();
  }
}
