import { createRuntimePlan as buildRuntimePlan } from '../runtime/planner';
import type { RuntimeTask } from '../runtime/types';
import { callDsgRpc, getDsgSupabaseRpcConfig, readDsgRest } from './supabase-rpc';

export type DsgRepositoryContext = {
  workspaceId: string;
  actorId: string;
  userAccessToken?: string;
};

export type DsgRuntimeJobRecord = {
  id: string;
  workspaceId: string;
  goal: string;
  status: string;
  riskLevel?: string;
  currentWaveId?: string | null;
  currentStepId?: string | null;
  completionReportId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
};

type DsgJobRow = {
  id: string;
  workspace_id: string;
  goal: string;
  status: string;
  risk_level: string;
  current_wave_id: string | null;
  current_step_id: string | null;
  completion_report_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
};

export function assertRepositoryContext(context: DsgRepositoryContext): void {
  if (!context.workspaceId) throw new Error('DSG_WORKSPACE_REQUIRED');
  if (!context.actorId) throw new Error('DSG_ACTOR_REQUIRED');
  if (!context.userAccessToken) throw new Error('DSG_USER_ACCESS_TOKEN_REQUIRED');
}

function mapJob(row: DsgJobRow): DsgRuntimeJobRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    goal: row.goal,
    status: row.status,
    riskLevel: row.risk_level,
    currentWaveId: row.current_wave_id,
    currentStepId: row.current_step_id,
    completionReportId: row.completion_report_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata,
  };
}

export async function listRuntimeJobs(context: DsgRepositoryContext): Promise<DsgRuntimeJobRecord[]> {
  assertRepositoryContext(context);
  const rows = await readDsgRest<DsgJobRow[]>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_runtime_jobs', {
    workspace_id: `eq.${context.workspaceId}`,
    select: 'id,workspace_id,goal,status,risk_level,current_wave_id,current_step_id,completion_report_id,created_by,created_at,updated_at,metadata',
    order: 'created_at.desc',
    limit: '50',
  });
  return rows.map(mapJob);
}

export async function getRuntimeJob(context: DsgRepositoryContext, jobId: string): Promise<DsgRuntimeJobRecord> {
  assertRepositoryContext(context);
  if (!jobId) throw new Error('DSG_JOB_REQUIRED');
  const rows = await readDsgRest<DsgJobRow[]>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_runtime_jobs', {
    id: `eq.${jobId}`,
    workspace_id: `eq.${context.workspaceId}`,
    select: 'id,workspace_id,goal,status,risk_level,current_wave_id,current_step_id,completion_report_id,created_by,created_at,updated_at,metadata',
    limit: '1',
  });
  const row = rows[0];
  if (!row) throw new Error('DSG_JOB_NOT_FOUND');
  return mapJob(row);
}

export async function getRuntimeJobTimeline(context: DsgRepositoryContext, jobId: string): Promise<{
  job: DsgRuntimeJobRecord;
  events: unknown[];
  evidenceItems: unknown[];
  evidenceManifests: unknown[];
  auditExports: unknown[];
  replayProofs: unknown[];
  deploymentProofs: unknown[];
  productionFlowProofs: unknown[];
  completionReports: unknown[];
}> {
  const job = await getRuntimeJob(context, jobId);
  const config = getDsgSupabaseRpcConfig(context.userAccessToken);
  const base = { job_id: `eq.${jobId}`, workspace_id: `eq.${context.workspaceId}` };

  const [events, evidenceItems, evidenceManifests, auditExports, replayProofs, deploymentProofs, productionFlowProofs, completionReports] = await Promise.all([
    readDsgRest<unknown[]>(config, 'dsg_runtime_events', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_evidence_items', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_evidence_manifests', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_audit_exports', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_replay_proofs', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_deployment_proofs', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_production_flow_proofs', { ...base, select: '*', order: 'created_at.asc' }),
    readDsgRest<unknown[]>(config, 'dsg_completion_reports', { ...base, select: '*', order: 'created_at.asc' }),
  ]);

  return { job, events, evidenceItems, evidenceManifests, auditExports, replayProofs, deploymentProofs, productionFlowProofs, completionReports };
}

export async function createWorkspace(
  context: Omit<DsgRepositoryContext, 'workspaceId'>,
  input: { name: string; slug: string },
): Promise<string> {
  if (!context.actorId) throw new Error('DSG_ACTOR_REQUIRED');
  if (!context.userAccessToken) throw new Error('DSG_USER_ACCESS_TOKEN_REQUIRED');
  if (!input.name.trim() || !input.slug.trim()) throw new Error('DSG_WORKSPACE_INPUT_REQUIRED');

  return callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_create_workspace', {
    p_name: input.name,
    p_slug: input.slug,
  });
}

export async function createRuntimeJob(
  context: DsgRepositoryContext,
  input: { goal: string; successCriteria?: unknown[] },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.goal.trim()) throw new Error('DSG_GOAL_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_create_runtime_job', {
    p_workspace_id: context.workspaceId,
    p_goal: input.goal,
    p_success_criteria: input.successCriteria ?? [],
  });

  return { id };
}

export async function createRuntimePlan(
  context: DsgRepositoryContext,
  input: { jobId: string; tasks: RuntimeTask[] },
): Promise<{ taskPlanId: string; wavePlanId: string; planHash: string; waveHash: string }> {
  assertRepositoryContext(context);
  if (!input.jobId) throw new Error('DSG_JOB_REQUIRED');
  const plan = buildRuntimePlan(input.tasks);

  const data = await callDsgRpc<{ taskPlanId: string; wavePlanId: string }>(
    getDsgSupabaseRpcConfig(context.userAccessToken),
    'dsg_create_plan',
    {
      p_job_id: input.jobId,
      p_plan_hash: plan.planHash,
      p_tasks: plan.tasks,
      p_dependency_edges: plan.edges,
      p_wave_hash: plan.waveHash,
      p_waves: plan.waves,
    },
  );

  return { ...data, planHash: plan.planHash, waveHash: plan.waveHash };
}

export async function writeEvidence(
  context: DsgRepositoryContext,
  input: { jobId: string; evidenceType: string; contentHash: string; summary: string; uri?: string; metadata?: Record<string, unknown> },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.contentHash || !input.summary) throw new Error('DSG_EVIDENCE_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_record_evidence', {
    p_job_id: input.jobId,
    p_evidence_type: input.evidenceType,
    p_content_hash: input.contentHash,
    p_summary: input.summary,
    p_uri: input.uri ?? null,
    p_metadata: input.metadata ?? {},
  });

  return { id };
}

export async function createEvidenceManifest(
  context: DsgRepositoryContext,
  input: { jobId: string; manifestHash: string; evidenceIds: string[] },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.manifestHash || input.evidenceIds.length === 0) throw new Error('DSG_MANIFEST_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_create_evidence_manifest', {
    p_job_id: input.jobId,
    p_manifest_hash: input.manifestHash,
    p_evidence_ids: input.evidenceIds,
  });

  return { id };
}

export async function createAuditExport(
  context: DsgRepositoryContext,
  input: { jobId: string; exportHash: string },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.exportHash) throw new Error('DSG_AUDIT_EXPORT_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_create_audit_export', {
    p_job_id: input.jobId,
    p_export_hash: input.exportHash,
  });

  return { id };
}

export async function recordReplayProof(
  context: DsgRepositoryContext,
  input: { jobId: string; replayHash: string; status: 'PASS' | 'BLOCK' | 'FAILED'; details?: Record<string, unknown> },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.replayHash) throw new Error('DSG_REPLAY_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_record_replay_proof', {
    p_job_id: input.jobId,
    p_replay_hash: input.replayHash,
    p_status: input.status,
    p_details: input.details ?? {},
  });

  return { id };
}

export async function recordDeploymentProof(
  context: DsgRepositoryContext,
  input: { jobId: string; environment: string; deploymentUrl: string; proofHash: string; status: 'PASS' | 'BLOCK' | 'FAILED'; details?: Record<string, unknown> },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.environment || !input.deploymentUrl || !input.proofHash) throw new Error('DSG_DEPLOYMENT_PROOF_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_record_deployment_proof', {
    p_job_id: input.jobId,
    p_environment: input.environment,
    p_deployment_url: input.deploymentUrl,
    p_proof_hash: input.proofHash,
    p_status: input.status,
    p_details: input.details ?? {},
  });

  return { id };
}

export async function recordProductionFlowProof(
  context: DsgRepositoryContext,
  input: { jobId: string; flowName: string; proofHash: string; status: 'PASS' | 'BLOCK' | 'FAILED'; details?: Record<string, unknown> },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.flowName || !input.proofHash) throw new Error('DSG_PRODUCTION_FLOW_PROOF_REQUIRED');

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_record_production_flow_proof', {
    p_job_id: input.jobId,
    p_flow_name: input.flowName,
    p_proof_hash: input.proofHash,
    p_status: input.status,
    p_details: input.details ?? {},
  });

  return { id };
}

export async function createCompletionReport(
  context: DsgRepositoryContext,
  input: {
    jobId: string;
    reportHash: string;
    evidenceManifestId: string;
    auditExportId: string;
    replayProofId: string;
    deploymentProofId?: string | null;
    productionFlowProofId?: string | null;
    usesMockState?: boolean;
    isDevOrSmokeOnly?: boolean;
  },
): Promise<{ id: string }> {
  assertRepositoryContext(context);
  if (!input.jobId || !input.reportHash || !input.evidenceManifestId || !input.auditExportId || !input.replayProofId) {
    throw new Error('DSG_COMPLETION_REQUIRED');
  }

  const id = await callDsgRpc<string>(getDsgSupabaseRpcConfig(context.userAccessToken), 'dsg_create_completion_report', {
    p_job_id: input.jobId,
    p_report_hash: input.reportHash,
    p_evidence_manifest_id: input.evidenceManifestId,
    p_audit_export_id: input.auditExportId,
    p_replay_proof_id: input.replayProofId,
    p_deployment_proof_id: input.deploymentProofId ?? null,
    p_production_flow_proof_id: input.productionFlowProofId ?? null,
    p_uses_mock_state: input.usesMockState ?? false,
    p_is_dev_or_smoke_only: input.isDevOrSmokeOnly ?? true,
  });

  return { id };
}
