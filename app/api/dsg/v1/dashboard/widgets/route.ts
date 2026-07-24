export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

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
    const dashboard_id = searchParams.get("dashboard_id");
    const data_source = searchParams.get("data_source");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_dashboard_widgets")
      .select("*")
      .eq("org_id", org_id)
      .order("position", { ascending: true })
      .limit(limit);

    if (dashboard_id) {
      query = query.eq("dashboard_id", dashboard_id);
    }

    if (data_source) {
      query = query.eq("data_source", data_source);
    }

    const { data: widgets, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const widgetsByType = (widgets || []).reduce((acc: any, w: any) => {
      if (!acc[w.widget_type]) acc[w.widget_type] = 0;
      acc[w.widget_type]++;
      return acc;
    }, {});

    const dataSourceBreakdown = (widgets || []).reduce((acc: any, w: any) => {
      if (!acc[w.data_source]) acc[w.data_source] = 0;
      acc[w.data_source]++;
      return acc;
    }, {});

    return NextResponse.json({
      total: widgets?.length || 0,
      widgets: widgets || [],
      summary: {
        widget_types: widgetsByType,
        data_sources: dataSourceBreakdown,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      org_id,
      workspace_id,
      dashboard_id,
      widget_type,
      widget_name,
      data_source,
      metric_type,
      position,
      config = {},
      filters = {},
      refresh_interval_seconds = 60,
      height_units = 4,
      width_units = 6,
    } = body;

    if (!org_id || !workspace_id || !dashboard_id || !widget_type || !widget_name || !data_source) {
      return NextResponse.json(
        {
          error:
            "org_id, workspace_id, dashboard_id, widget_type, widget_name, and data_source are required",
        },
        { status: 400 }
      );
    }

    const { data: stored, error } = await (supabase as any)
      .from("dsg_dashboard_widgets")
      .insert({
        org_id,
        workspace_id,
        dashboard_id,
        widget_type,
        widget_name,
        position: position || 0,
        data_source,
        metric_type: metric_type || null,
        config: { ...config, theme: "light" },
        filters: filters || {},
        refresh_interval_seconds,
        cache_enabled: true,
        cache_ttl_seconds: 300,
        height_units,
        width_units,
        show_title: true,
        show_legend: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to create widget: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      widget_id: stored.id,
      widget_name: stored.widget_name,
      widget_type: stored.widget_type,
      data_source: stored.data_source,
      created_at: stored.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
