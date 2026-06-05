import type {
  AppBuilderApprovedPlan,
  AppBuilderGateResult,
  AppBuilderGoalInput,
  AppBuilderJob,
  AppBuilderPrd,
  AppBuilderProposedPlan,
  LockedAppBuilderGoal,
} from '@/lib/dsg/app-builder/model';
import type {
  AppBuilderApprovalDecision,
  AppBuilderClaimStatus,
  AppBuilderJobStatus,
} from '@/lib/dsg/app-builder/status';
import type { AppBuilderRequestContext } from './context';
import { supabaseRest } from './supabase-rest';

type Row = Record<string, unknown>;

function mapJob(row: Row): AppBuilderJob {
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

function queryId(ctx: AppBuilderRequestContext, id: string): string {
  return `?id=eq.${id}&workspace_id=eq.${ctx.workspaceId}&select=*`;
}

export async function listAppBuilderJobs(ctx: AppBuilderRequestContext): Promise<AppBuilderJob[]> {
  const rows = await supabaseRest<Row[]>({
    path: 'dsg_app_builder_jobs',
    query: `?workspace_id=eq.${ctx.workspaceId}&select=*&order=created_at.desc`,
  });
  return rows.map(mapJob);
}

export async function createAppBuilderJob(input: {
  ctx: AppBuilderRequestContext;
  rawGoal: AppBuilderGoalInput;
  lockedGoal: LockedAppBuilderGoal;
}): Promise<AppBuilderJob> {
  const rows = await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_app_builder_jobs',
    body: {
      workspace_id: input.ctx.workspaceId,
      created_by: input.ctx.actorId,
      status: 'GOAL_LOCKED',
      claim_status: 'NOT_STARTED',
      goal: input.lockedGoal,
      metadata: { rawGoal: input.rawGoal },
    },
  });
  return mapJob(rows[0]);
}

export async function getAppBuilderJob(ctx: AppBuilderRequestContext, id: string): Promise<AppBuilderJob> {
  const rows = await supabaseRest<Row[]>({ path: 'dsg_app_builder_jobs', query: queryId(ctx, id) });
  if (!rows[0]) throw new Error('APP_BUILDER_JOB_NOT_FOUND');
  return mapJob(rows[0]);
}

export async function updateAppBuilderJob(input: {
  ctx: AppBuilderRequestContext;
  id: string;
  patch: Record<string, unknown>;
}): Promise<AppBuilderJob> {
  const rows = await supabaseRest<Row[]>({
    method: 'PATCH',
    path: 'dsg_app_builder_jobs',
    query: queryId(input.ctx, input.id),
    body: { ...input.patch, updated_at: new Date().toISOString() },
  });
  if (!rows[0]) throw new Error('APP_BUILDER_JOB_UPDATE_FAILED');
  return mapJob(rows[0]);
}

export async function recordAppBuilderApproval(input: {
  ctx: AppBuilderRequestContext;
  jobId: string;
  decision: AppBuilderApprovalDecision;
  reason?: string;
  approvedPlan?: AppBuilderApprovedPlan;
  gateResult?: AppBuilderGateResult;
}): Promise<void> {
  await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_app_builder_approvals',
    body: {
      app_builder_job_id: input.jobId,
      workspace_id: input.ctx.workspaceId,
      decision: input.decision,
      decided_by: input.ctx.actorId,
      reason: input.reason,
      plan_hash: input.approvedPlan?.planHash ?? null,
      approval_hash: input.approvedPlan?.approvalHash ?? null,
      gate_result: input.gateResult ?? null,
    },
  });
}

export async function recordAppBuilderToolAudit(input: {
  ctx: AppBuilderRequestContext;
  jobId: string;
  toolName: string;
  outcome: string;
  evidenceRefs: string[];
  auditEvent: Record<string, unknown>;
}): Promise<void> {
  await supabaseRest<Row[]>({
    method: 'POST',
    path: 'dsg_app_builder_tool_audits',
    body: {
      app_builder_job_id: input.jobId,
      workspace_id: input.ctx.workspaceId,
      actor_id: input.ctx.actorId,
      tool_name: input.toolName,
      outcome: input.outcome,
      evidence_refs: input.evidenceRefs,
      audit_event: input.auditEvent,
    },
  });
}
