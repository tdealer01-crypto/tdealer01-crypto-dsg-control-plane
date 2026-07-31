import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { RemediationOrchestrator } from "@/lib/dsg/remediation/remediation-orchestrator";
import { handleApiError } from "@/lib/security/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { org_id, workspace_id, anomaly_type, severity, context = {} } = body;

    if (!org_id || !workspace_id || !anomaly_type || !severity) {
      return NextResponse.json(
        {
          error:
            "org_id, workspace_id, anomaly_type, and severity are required",
        },
        { status: 400 }
      );
    }

    // Propose plan using orchestrator
    const orchestrator = new RemediationOrchestrator();
    const plan = await orchestrator.proposePlan(anomaly_type, severity, context);

    // Update plan with org/workspace info
    const planWithScope = {
      ...plan,
      org_id,
      workspace_id,
    };

    // Store proposed plan in database
    const { data: storedPlan, error: storeError } = await (supabase as any)
      .from("dsg_remediation_plans")
      .insert({
        org_id,
        workspace_id,
        name: plan.name,
        description: plan.description,
        plan_type: plan.planType,
        status: plan.status,
        trigger_anomaly_type: plan.triggerAnomalyType,
        trigger_severity_level: plan.triggerSeverityLevel,
        trigger_confidence_threshold: plan.triggerConfidenceThreshold,
        steps: plan.steps,
        plan_hash: plan.planHash,
        requires_approval: plan.requiresApproval,
        auto_execute: plan.autoExecute,
        rollback_on_failure: plan.rollbackOnFailure,
        max_concurrent_executions: plan.maxConcurrentExecutions,
        success_criteria: plan.successCriteria,
        failure_actions: plan.failureActions,
        created_by: org_id,
      })
      .select()
      .single();

    if (storeError) {
      return handleApiError("api/dsg/v1/remediation/propose", storeError);
    }

    return NextResponse.json(
      {
        plan_id: storedPlan?.id,
        name: storedPlan?.name,
        plan_type: storedPlan?.plan_type,
        status: storedPlan?.status,
        steps_count: storedPlan?.steps?.length || 0,
        plan_hash: storedPlan?.plan_hash,
        requires_approval: storedPlan?.requires_approval,
        created_at: storedPlan?.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError("api/dsg/v1/remediation/propose", error);
  }
}
