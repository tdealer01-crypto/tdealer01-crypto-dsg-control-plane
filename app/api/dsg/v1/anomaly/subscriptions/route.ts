import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get("org_id");
    const workspace_id = searchParams.get("workspace_id");
    const is_active = searchParams.get("is_active");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_anomaly_subscriptions")
      .select(
        `
        id,
        org_id,
        workspace_id,
        name,
        description,
        anomaly_types,
        min_similarity_score,
        severity_levels,
        alert_channels,
        recipients,
        auto_investigate,
        auto_resolve_threshold,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq("org_id", org_id)
      .order("created_at", { ascending: false });

    if (workspace_id) {
      query = query.eq("workspace_id", workspace_id);
    }

    if (is_active !== null) {
      const isActiveValue = is_active === "true";
      query = query.eq("is_active", isActiveValue);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      return handleApiError("api/dsg/v1/anomaly/subscriptions", error);
    }

    return NextResponse.json(
      {
        count: subscriptions?.length || 0,
        subscriptions: subscriptions || [],
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError("api/dsg/v1/anomaly/subscriptions", error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      org_id,
      workspace_id,
      name,
      description,
      anomaly_types = [],
      severity_levels = ["high", "critical"],
      alert_channels = [],
      recipients = {},
      auto_investigate = false,
      auto_resolve_threshold,
    } = body;

    if (
      !org_id ||
      !workspace_id ||
      !name ||
      !alert_channels ||
      alert_channels.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "org_id, workspace_id, name, and alert_channels are required",
        },
        { status: 400 }
      );
    }

    const { data: subscription, error } = await (supabase as any)
      .from("dsg_anomaly_subscriptions")
      .insert({
        org_id,
        workspace_id,
        name,
        description,
        anomaly_types: anomaly_types.length > 0 ? anomaly_types : null,
        severity_levels,
        alert_channels,
        recipients,
        auto_investigate,
        auto_resolve_threshold,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return handleApiError("api/dsg/v1/anomaly/subscriptions", error);
    }

    return NextResponse.json(
      {
        id: subscription?.id,
        created_at: subscription?.created_at,
        name: subscription?.name,
        is_active: subscription?.is_active,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError("api/dsg/v1/anomaly/subscriptions", error);
  }
}
