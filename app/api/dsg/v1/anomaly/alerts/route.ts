import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get("org_id");
    const workspace_id = searchParams.get("workspace_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_anomaly_alerts")
      .select(
        `
        id,
        org_id,
        workspace_id,
        anomaly_id,
        alert_type,
        channel,
        recipient_id,
        recipient_email,
        status,
        sent_at,
        delivered_at,
        acknowledged_at,
        acknowledged_by,
        acknowledgment_note,
        created_at,
        updated_at
      `
      )
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (workspace_id) {
      query = query.eq("workspace_id", workspace_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: alerts, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Group alerts by status
    const alertsByStatus = {
      pending: alerts?.filter((a: any) => a.status === "pending").length || 0,
      sent: alerts?.filter((a: any) => a.status === "sent").length || 0,
      delivered: alerts?.filter((a: any) => a.status === "delivered").length || 0,
      failed: alerts?.filter((a: any) => a.status === "failed").length || 0,
      acknowledged: alerts?.filter((a: any) => a.status === "acknowledged").length || 0,
    };

    return NextResponse.json(
      {
        count: alerts?.length || 0,
        alerts: alerts || [],
        summary: alertsByStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      org_id,
      workspace_id,
      anomaly_id,
      channel,
      recipient_email,
      alert_type = "anomaly_detected",
    } = body;

    if (!org_id || !workspace_id || !anomaly_id || !channel) {
      return NextResponse.json(
        {
          error:
            "org_id, workspace_id, anomaly_id, and channel are required",
        },
        { status: 400 }
      );
    }

    const { data: alert, error } = await (supabase as any)
      .from("dsg_anomaly_alerts")
      .insert({
        org_id,
        workspace_id,
        anomaly_id,
        alert_type,
        channel,
        recipient_email,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: alert?.id,
        created_at: alert?.created_at,
        status: alert?.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      {
        error: "Failed to create alert",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
