import { NextResponse } from "next/server";
import { requireRuntimeAccess } from "../../../../../lib/authz-runtime";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireRuntimeAccess(request, "monitor");
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("breach_signal_evaluations")
      .select(
        "id, source_url, owner, legal_purpose, decision, evidence_level, severity, reasons, hibp_checked, hibp_breach_count, hibp_elevated_evidence, raw_data_stored, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data ?? [], total: data?.length ?? 0 });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
