import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get("org_id");
    const root_cause_category = searchParams.get("root_cause_category");
    const min_confidence = parseFloat(searchParams.get("min_confidence") || "0.7");

    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    let query = supabase
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        count: patterns?.length || 0,
        patterns: patterns || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching RCA patterns:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch patterns",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
