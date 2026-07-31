export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/security/api-error";

let supabaseClient: any = null;

function getSupabaseAdmin() {
  if (!supabaseClient) {
    const { createClient } = require("@supabase/supabase-js");
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return supabaseClient;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    const org_id = searchParams.get("org_id");
    const user_id = searchParams.get("user_id");
    const is_default = searchParams.get("is_default");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_dashboard_configs")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    if (is_default !== null) {
      query = query.eq("is_default", is_default === "true");
    }

    const { data: configs, error } = await query;

    if (error) {
      return handleApiError("api/dsg/v1/dashboard/configs", error);
    }

    return NextResponse.json({
      total: configs?.length || 0,
      dashboards: configs || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError("api/dsg/v1/dashboard/configs", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      org_id,
      workspace_id,
      user_id,
      name,
      description,
      layout_type = "grid",
      theme = "light",
      refresh_interval_seconds = 60,
    } = body;

    if (!org_id || !workspace_id || !name) {
      return NextResponse.json(
        { error: "org_id, workspace_id, and name are required" },
        { status: 400 }
      );
    }

    const dashboardId = `dashboard-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const { data: stored, error } = await (supabase as any)
      .from("dsg_dashboard_configs")
      .insert({
        org_id,
        workspace_id,
        user_id: user_id || null,
        name,
        description: description || null,
        layout_type,
        theme,
        refresh_interval_seconds,
        config: {
          layout_type,
          theme,
          widgets: [],
        },
        is_default: false,
        is_shared: false,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      return handleApiError("api/dsg/v1/dashboard/configs", error);
    }

    return NextResponse.json({
      dashboard_id: stored.id,
      name: stored.name,
      layout_type: stored.layout_type,
      created_at: stored.created_at,
    });
  } catch (error) {
    return handleApiError("api/dsg/v1/dashboard/configs", error);
  }
}
