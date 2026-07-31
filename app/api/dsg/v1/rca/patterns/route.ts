import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get("org_id");
    const root_cause_category = searchParams.get("root_cause_category");
    const min_confidence = parseFloat(searchParams.get("min_confidence") || "0.7");

    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    let query = (supabase as any)
      .from("dsg_rca_patterns")
      .select(
        `
        id,
        pattern_name,
        pattern_description,
        typical_root_cause,
        root_cause_category,
        remediation_steps,
        occurrence_count,
        success_rate,
        confidence,
        first_seen_at,
        last_seen_at
      `
      )
      .eq("org_id", org_id)
      .eq("is_active", true)
      .gte("confidence", min_confidence)
      .order("occurrence_count", { ascending: false });

    if (root_cause_category) {
      query = query.eq("root_cause_category", root_cause_category);
    }

    const { data: patterns, error } = await query;

    if (error) {
      return handleApiError("api/dsg/v1/rca/patterns", error);
    }

    return NextResponse.json(
      {
        count: patterns?.length || 0,
        patterns: patterns || [],
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError("api/dsg/v1/rca/patterns", error);
  }
}
