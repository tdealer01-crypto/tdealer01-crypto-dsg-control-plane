import { NextResponse } from "next/server";
import { getDSGCoreLedger } from "../../../lib/dsg-core";
import { fetchAuditLogsForExport } from "../../../lib/security/audit-export";
import { requireOrgRole } from "../../../lib/authz";
import { RuntimeRouteRoles } from "../../../lib/runtime/permissions";
import { handleApiError } from "../../../lib/security/api-error";

export const dynamic = "force-dynamic";
type LedgerEvidence = {
  core_result?: {
    proof_hash?: string;
    stability_score?: number;
  };
  proof_hash?: string;
  stability_score?: number;
} & Record<string, unknown>;

export async function GET(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    const [auditExport, coreLedger] = await Promise.all([
      fetchAuditLogsForExport(access.orgId, limit),
      getDSGCoreLedger(limit, { orgId: access.orgId }),
    ]);

    if (!auditExport.ok) {
      if ("reason" in auditExport && auditExport.reason === "relation-missing") {
        return NextResponse.json({ error: "Audit export is temporarily unavailable because audit_logs relation is missing." }, { status: 503 });
      }

      return handleApiError("api/ledger", auditExport, { details: { stage: "audit-export" } });
    }

    const items = (auditExport.rows || []).map((row: {
      id: string;
      execution_id: string | null;
      decision: string | null;
      reason: string | null;
      evidence: LedgerEvidence | null;
      created_at: string | null;
    }) => ({
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
    return handleApiError('api/ledger', error, { details: { stage: 'unhandled' } });
  }
}
