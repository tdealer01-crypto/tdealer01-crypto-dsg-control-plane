import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { RemediationOrchestrator } from "@/lib/dsg/remediation/remediation-orchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { org_id, plan_id, anomaly_id, credentials = [] } = body;

    if (!org_id || !plan_id) {
      return NextResponse.json(
        { error: "org_id and plan_id are required" },
        { status: 400 }
      );
    }

    // Fetch plan from database
    const { data: planData, error: planError } = await (supabase as any)
      .from("dsg_remediation_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("org_id", org_id)
      .single();

    if (planError || !planData) {
      return NextResponse.json(
        { error: "Plan not found or access denied" },
        { status: 404 }
      );
    }

    // Check if plan requires approval
    if (planData.requires_approval && planData.status !== "approved") {
      return NextResponse.json(
        {
          error: "Plan requires approval before execution",
          plan_status: planData.status,
        },
        { status: 403 }
      );
    }

    // Reconstruct plan object
    const plan = {
      id: planData.id,
      name: planData.name,
      description: planData.description,
      planType: planData.plan_type,
      status: planData.status,
      triggerAnomalyType: planData.trigger_anomaly_type,
      triggerSeverityLevel: planData.trigger_severity_level,
      triggerConfidenceThreshold: planData.trigger_confidence_threshold,
      steps: planData.steps || [],
      planHash: planData.plan_hash,
      requiresApproval: planData.requires_approval,
      autoExecute: planData.auto_execute,
      rollbackOnFailure: planData.rollback_on_failure,
      maxConcurrentExecutions: planData.max_concurrent_executions,
      successCriteria: planData.success_criteria,
      failureActions: planData.failure_actions,
      createdAt: new Date(planData.created_at),
      updatedAt: new Date(planData.updated_at),
      createdBy: planData.created_by,
      lastModifiedBy: planData.last_modified_by,
    };

    // Execute remediation
    const orchestrator = new RemediationOrchestrator();
    const result = await orchestrator.executeRemediationPlan(plan, {
      planId: plan_id,
      anomalyId: anomaly_id,
      credentials: credentials,
      requestedBy: org_id,
    });

    // Store execution record
    const { data: executionRecord, error: storeError } = await (supabase as any)
      .from("dsg_remediation_executions")
      .insert({
        org_id,
        workspace_id: planData.workspace_id,
        plan_id,
        anomaly_id,
        execution_status:
          result.status === "success"
            ? "success"
            : result.status === "blocked"
              ? "failed"
              : "failed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_result: result.results,
        plan_hash_executed: plan.planHash,
        commands_executed: result.results.map((r) => r.stepId),
        conformance_verified: result.conformance.planHashMatches,
        evidence: result.conformance,
      })
      .select()
      .single();

    if (storeError) {
      console.error("Error storing execution:", storeError);
    }

    return NextResponse.json(
      {
        execution_id: result.executionId,
        plan_id: result.planId,
        status: result.status,
        duration_ms: result.duration,
        steps_executed: result.results.length,
        steps: result.results.map((r) => ({
          step_id: r.stepId,
          success: r.success,
          duration: r.duration,
          error: r.error,
        })),
        conformance: {
          plan_hash_matches: result.conformance.planHashMatches,
          all_steps_completed: result.conformance.allStepsCompleted,
          no_unauthorized_commands: result.conformance.noUnauthorizedCommands,
          all_paths_whitelisted: result.conformance.allPathsWhitelisted,
          credentials_verified: result.conformance.credentialsVerified,
          audit_trail_complete: result.conformance.auditTrailComplete,
          summary: result.conformance.summary,
        },
        timestamp: result.timestamp.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing remediation plan:", error);
    return NextResponse.json(
      {
        error: "Failed to execute remediation plan",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
