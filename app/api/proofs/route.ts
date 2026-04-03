import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { logServerError, serverErrorResponse } from "../../../lib/security/error-response";

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

    const { data, error } = await supabase
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
      .limit(limit);

    if (error) {
      logServerError(error, "proofs-get");
      return serverErrorResponse();
    }

    const items = (data || []).map((row: any) => {
      const coreResult = row?.evidence?.core_result || {};
      const proofHash = coreResult?.proof_hash || row?.evidence?.proof_hash || null;
      const stabilityScore =
        row?.evidence?.stability_score ?? coreResult?.stability_score ?? null;

      return {
        id: row.id,
        execution_id: row.execution_id,
        decision: row.decision,
        reason: row.reason,
        proof_hash: proofHash,
        proof_type:
          row.decision === "BLOCK"
            ? "violation"
            : row.decision === "STABILIZE"
              ? "stability"
              : "allow",
        stability_score: stabilityScore,
        artifact: {
          policy_version: coreResult?.policy_version || null,
          version: coreResult?.version || null,
          evaluated_at: coreResult?.evaluated_at || null,
        },
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    logServerError(error, "proofs-get");
    return serverErrorResponse();
  }
}
