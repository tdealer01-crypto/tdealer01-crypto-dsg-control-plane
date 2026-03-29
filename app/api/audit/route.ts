import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism
} from "../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type DeterminismResult = Awaited<ReturnType<typeof getDSGCoreDeterminism>>;

function getDeterminismData(result: DeterminismResult) {
  if (result.ok && "data" in result) {
    return result.data;
  }
  return null;
}

function getDeterminismError(result: DeterminismResult) {
  if (!result.ok && "error" in result) {
    return result.error;
  }

  return "Unknown error";
}

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

    const auditEvents = await getDSGCoreAuditEvents(limit);

    const sequences = Array.from(
      new Set(
        (auditEvents.items || [])
          .map((item) => Number(item.sequence))
          .filter((n) => Number.isFinite(n))
      )
    ).slice(0, 5);

    const determinismResults = await Promise.all(
      sequences.map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
