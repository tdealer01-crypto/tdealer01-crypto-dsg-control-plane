import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDSGCoreLedger } from "../../../lib/dsg-core";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
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
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    const [{ data, error }, coreLedger] = await Promise.all([
      supabase
        .from("audit_logs")
        .select(`
          id,
          execution_id,
          decision,
          reason,
          evidence,
          created_at
        `)
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(limit),
      getDSGCoreLedger(limit),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      execution_id: row.execution_id,
      decision: row.decision,
      reason: row.reason,
      proof_hash:
        row?.evidence?.core_result?.proof_hash ||
        row?.evidence?.proof_hash ||
        null,
      stability_score:
        row?.evidence?.stability_score ??
        row?.evidence?.core_result?.stability_score ??
        null,
      created_at: row.created_at,
      evidence: row.evidence || {},
    }));

    return NextResponse.json({
      ok: true,
      items,
      core: {
        ledger_ok: coreLedger.ok,
        items: coreLedger.items,
        error: coreLedger.ok ? null : coreLedger.error,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
