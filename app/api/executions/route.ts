import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDSGCoreLedger, getDSGCoreMetrics } from "../../../lib/dsg-core";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      executions: data ?? [],
      core: {
        ledger_ok: coreLedger.ok,
        ledger_items: coreLedger.items,
        metrics_ok: coreMetrics.ok,
        metrics: coreMetrics.ok ? coreMetrics.data : null,
        error: !coreLedger.ok ? coreLedger.error : !coreMetrics.ok ? coreMetrics.error : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
