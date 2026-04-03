import { NextResponse } from "next/server";
import { getDSGCoreLedger } from "../../../../lib/dsg-core";
import { requireOrgRole } from "../../../../lib/authz";
import { RuntimeRouteRoles } from "../../../../lib/runtime/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { internalErrorMessage, logApiError } from "../../../../lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { executionId: string } }
) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = getSupabaseAdmin();

    const executionId = params.executionId;

    const [{ data: execution, error: executionError }, { data: audit, error: auditError }, coreLedger] = await Promise.all([
      supabase
        .from("executions")
        .select(`
          id,
          org_id,
          agent_id,
          decision,
          latency_ms,
          request_payload,
          context_payload,
          policy_version,
          reason,
          created_at
        `)
        .eq("org_id", access.orgId)
        .eq("id", executionId)
        .maybeSingle(),
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
        .eq("org_id", access.orgId)
        .eq("execution_id", executionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getDSGCoreLedger(50),
    ]);

    if (executionError) {
      logApiError("api/replay/[executionId]", executionError, { stage: "execution-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (auditError) {
      logApiError("api/replay/[executionId]", auditError, { stage: "audit-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (!execution) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const coreMatch = (coreLedger.items || []).find((item: any) => {
      const metadata = item?.metadata || {};
      return metadata?.execution_id === executionId || metadata?.audit_id === audit?.id;
    }) || null;

    return NextResponse.json({
      ok: true,
      execution,
      audit,
      core: {
        ledger_ok: coreLedger.ok,
        matched_item: coreMatch,
        error: coreLedger.ok ? null : coreLedger.error,
      },
    });
  } catch (error) {
    logApiError("api/replay/[executionId]", error, { stage: "unhandled" });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}
