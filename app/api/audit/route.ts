import { NextResponse } from "next/server";
import {
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism
} from "../../../lib/dsg-core";
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { internalErrorMessage, logApiError } from "../../../lib/security/api-error";

export const dynamic = "force-dynamic";

type DeterminismResult = Awaited<ReturnType<typeof getDSGCoreDeterminism>>;

function getDeterminismData(result: DeterminismResult) {
  if (result.ok && "data" in result) {
    return result.data;
  }
  return null;
}

function getDeterminismError(result: DeterminismResult): string {
  if (!result.ok && "error" in result) {
    return result.error;
  }

  return "Unknown error";
}

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'monitor');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    const auditEvents = await getDSGCoreAuditEvents(limit, { orgId: access.orgId });

    const sequences: number[] = Array.from(
      new Set<number>(
        (auditEvents.items || [])
          .map((item) => Number(item.sequence))
          .filter((n): n is number => Number.isFinite(n))
      )
    ).slice(0, 5);

    const determinismResults = await Promise.all(
      sequences.map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence, { orgId: access.orgId });
        const data = getDeterminismData(result);

        if (data) {
          return {
            sequence,
            ok: true,
            data,
            error: null,
          };
        }

        return {
          sequence,
          ok: false,
          data: null,
          error: getDeterminismError(result),
        };
      })
    );

    const overallOk = auditEvents.ok && determinismResults.every((res) => res.ok);
    const determinismErrors = determinismResults
      .filter((res) => !res.ok)
      .map((res) => res.error)
      .filter(Boolean);

    return NextResponse.json({
      ok: overallOk,
      items: auditEvents.items,
      determinism: determinismResults,
      core_ok: auditEvents.ok,
      error: overallOk
        ? null
        : auditEvents.ok
          ? determinismErrors.join("; ")
          : auditEvents.error ?? null,
    });
  } catch (error) {
    logApiError("api/audit", error, { stage: "unhandled" });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}
