import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDSGCoreAuditEvents, getDSGCoreDeterminism } from "../../../lib/dsg-core";

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
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    const auditEvents = await getDSGCoreAuditEvents(limit);
    const sequences = Array.from(
      new Set((auditEvents.items || []).map((item) => Number(item.sequence)).filter((n) => Number.isFinite(n)))
    ).slice(0, 5);

    const determinismResults = await Promise.all(
      sequences.map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence);
        return {
          sequence,
          ok: result.ok,
          data: result.ok ? result.data : null,
          error: result.ok ? null : result.error,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      items: auditEvents.items,
      determinism: determinismResults,
      core_ok: auditEvents.ok,
      error: auditEvents.ok ? null : auditEvents.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
