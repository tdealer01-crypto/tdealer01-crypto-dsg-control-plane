import { NextResponse } from "next/server";
import { requireRuntimeAccess } from "../../../lib/authz-runtime";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { logServerError, serverErrorResponse } from "../../../lib/security/error-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Match the sibling read routes (/api/executions, /api/audit): a
    // server-verified runtime access check + the service-role admin client
    // scoped by org_id. The previous cookie-SSR client ran the audit_logs
    // query under RLS as the `authenticated` role, which failed and surfaced
    // as a generic 500 to callers such as the Hermes "Proof list" tool.
    const access = await requireRuntimeAccess(request, "executions_read");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();

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
      .eq("org_id", access.orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logServerError(error, "proofs-get");
      return serverErrorResponse();
    }

    const items = (data || []).map((row) => {
      const evidence = (row.evidence || null) as Record<string, unknown> | null;
      const coreResult = (evidence?.core_result || {}) as Record<string, unknown>;
      const proofHash = coreResult?.proof_hash || evidence?.proof_hash || null;
      const stabilityScore = evidence?.stability_score ?? coreResult?.stability_score ?? null;

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
