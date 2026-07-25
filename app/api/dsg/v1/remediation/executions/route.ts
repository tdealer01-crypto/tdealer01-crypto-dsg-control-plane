import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get("org_id");
    const plan_id = searchParams.get("plan_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!org_id) {
      return NextResponse.json(
        { error: "org_id is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from("dsg_remediation_executions")
      .select(
        `
        id,
        org_id,
        workspace_id,
        plan_id,
        anomaly_id,
        execution_status,
        started_at,
        completed_at,
        execution_result,
        plan_hash_executed,
        conformance_verified,
        evidence,
        created_at
      `
      )
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (plan_id) {
      query = query.eq("plan_id", plan_id);
    }

    if (status) {
      query = query.eq("execution_status", status);
    }

    const { data: executions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Group executions by status
    const statusSummary = {
      pending:
        executions?.filter((e: any) => e.execution_status === "pending")
          .length || 0,
      running:
        executions?.filter((e: any) => e.execution_status === "running")
          .length || 0,
      success:
        executions?.filter((e: any) => e.execution_status === "success")
          .length || 0,
      failed:
        executions?.filter((e: any) => e.execution_status === "failed")
          .length || 0,
      rolled_back:
        executions?.filter((e: any) => e.execution_status === "rolled_back")
          .length || 0,
    };

    return NextResponse.json(
      {
        count: executions?.length || 0,
        executions: executions?.map((e: any) => ({
          execution_id: e.id,
          plan_id: e.plan_id,
          anomaly_id: e.anomaly_id,
          status: e.execution_status,
          started_at: e.started_at,
          completed_at: e.completed_at,
          steps_executed: e.execution_result?.length || 0,
          conformance_verified: e.conformance_verified,
          evidence_summary: e.evidence?.summary,
          created_at: e.created_at,
        })) || [],
        summary: statusSummary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching remediation executions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch execution history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
