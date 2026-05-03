import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppBuilderApprovedPlan,
  AppBuilderGateResult,
  AppBuilderGoalInput,
  AppBuilderJob,
  AppBuilderPrd,
  AppBuilderProposedPlan,
  LockedAppBuilderGoal,
} from '../../app-builder/model';
import type {
  AppBuilderApprovalDecision,
  AppBuilderClaimStatus,
  AppBuilderJobStatus,
} from '../../app-builder/status';

export type AppBuilderRepositoryContext = {
  db: SupabaseClient;
  workspaceId: string;
  actorId: string;
};

function assertContext(ctx: AppBuilderRepositoryContext): void {
  if (!ctx.workspaceId) throw new Error('WORKSPACE_ID_REQUIRED');
  if (!ctx.actorId) throw new Error('ACTOR_ID_REQUIRED');
}

function mapJob(row: Record<string, unknown>): AppBuilderJob {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    createdBy: String(row.created_by),
    status: row.status as AppBuilderJobStatus,
    claimStatus: row.claim_status as AppBuilderClaimStatus,
    goal: row.goal as LockedAppBuilderGoal | undefined,
    prd: row.prd as AppBuilderPrd | undefined,
    proposedPlan: row.proposed_plan as AppBuilderProposedPlan | undefined,
    gateResult: row.gate_result as AppBuilderGateResult | undefined,
    approvedPlan: row.approved_plan as AppBuilderApprovedPlan | undefined,
    planHash: row.plan_hash as string | undefined,
    approvalHash: row.approval_hash as string | undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata as Record<string, unknown> | undefined,
  };
}

export async function createAppBuilderJob(
  ctx: AppBuilderRepositoryContext,
  input: { rawGoal: AppBuilderGoalInput; lockedGoal: LockedAppBuilderGoal },
): Promise<AppBuilderJob> {
  assertContext(ctx);
  const { data, error } = await ctx.db
    .from('dsg_app_builder_jobs')
    .insert({
      workspace_id: ctx.workspaceId,
      created_by: ctx.actorId,
      status: 'GOAL_LOCKED',
      claim_status: 'NOT_STARTED',
      goal: input.lockedGoal,
      metadata: { rawGoal: input.rawGoal },
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapJob(data);
}

export async function getAppBuilderJob(
  ctx: AppBuilderRepositoryContext,
  jobId: string,
): Promise<AppBuilderJob> {
  assertContext(ctx);
  const { data, error } = await ctx.db
    .from('dsg_app_builder_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('workspace_id', ctx.workspaceId)
    .single();
  if (error) throw error;
  return mapJob(data);
}

export async function listAppBuilderJobs(
  ctx: AppBuilderRepositoryContext,
): Promise<AppBuilderJob[]> {
  assertContext(ctx);
  const { data, error } = await ctx.db
    .from('dsg_app_builder_jobs')
    .select('*')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapJob(row));
}

export async function attachAppBuilderPlan(
  ctx: AppBuilderRepositoryContext,
  input: { jobId: string; prd: AppBuilderPrd; proposedPlan: AppBuilderProposedPlan; gateResult: AppBuilderGateResult },
): Promise<AppBuilderJob> {
  assertContext(ctx);
  const status = input.gateResult.status === 'BLOCK'
    ? 'BLOCKED'
    : input.gateResult.approvalRequired
      ? 'WAITING_APPROVAL'
      : 'PLAN_READY';
  const { data, error } = await ctx.db
    .from('dsg_app_builder_jobs')
    .update({
      status,
      claim_status: 'PLANNED_ONLY',
      prd: input.prd,
      proposed_plan: input.proposedPlan,
      gate_result: input.gateResult,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.jobId)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .single();
  if (error) throw error;
  return mapJob(data);
}

export async function recordAppBuilderApproval(
  ctx: AppBuilderRepositoryContext,
  input: { jobId: string; decision: AppBuilderApprovalDecision; reason?: string; approvedPlan?: AppBuilderApprovedPlan; gateResult?: AppBuilderGateResult },
): Promise<AppBuilderJob> {
  assertContext(ctx);
  const current = await getAppBuilderJob(ctx, input.jobId);
  if (current.status === 'BLOCKED') throw new Error('APP_BUILDER_BLOCKED_JOB_CANNOT_BE_APPROVED');
  if (input.decision === 'APPROVE' && !input.approvedPlan) throw new Error('APP_BUILDER_APPROVED_PLAN_REQUIRED');
  const nextStatus = input.decision === 'APPROVE' ? 'READY_FOR_RUNTIME' : input.decision === 'REJECT' ? 'REJECTED' : 'WAITING_APPROVAL';
  const planHash = input.approvedPlan?.planHash;
  const approvalHash = input.approvedPlan?.approvalHash;
  const { error: approvalError } = await ctx.db.from('dsg_app_builder_approvals').insert({
    app_builder_job_id: input.jobId,
    workspace_id: ctx.workspaceId,
    decision: input.decision,
    decided_by: ctx.actorId,
    reason: input.reason,
    plan_hash: planHash,
    approval_hash: approvalHash,
    gate_result: input.gateResult,
  });
  if (approvalError) throw approvalError;
  const { data, error } = await ctx.db
    .from('dsg_app_builder_jobs')
    .update({
      status: nextStatus,
      claim_status: input.decision === 'APPROVE' ? 'APPROVED_ONLY' : 'PLANNED_ONLY',
      approved_plan: input.approvedPlan ?? null,
      plan_hash: planHash ?? null,
      approval_hash: approvalHash ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.jobId)
    .eq('workspace_id', ctx.workspaceId)
    .select('*')
    .single();
  if (error) throw error;
  return mapJob(data);
}
