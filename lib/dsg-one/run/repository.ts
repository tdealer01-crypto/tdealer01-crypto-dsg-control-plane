/**
 * DSG ONE — Verified Execution run persistence.
 *
 * Maps between the pure run model in ./types and the dsg_one_runs /
 * dsg_one_run_steps tables. All writes go through the service role; RLS grants
 * browsers read-only access, so the orchestration routes are the only writer.
 *
 * Every read is org-scoped at the query level as well as by RLS. Belt and
 * braces is deliberate here: the API-key path uses the service role, which
 * bypasses RLS entirely, so the org filter in these queries is the only thing
 * standing between two customers' runs.
 */

import { getSupabaseAdmin } from '../../supabase-server';
import {
  DSG_ONE_RUN_SCHEMA,
  type Run,
  type RunPlan,
  type RunStep,
  type StepJudgement,
  type StepObservation,
} from './types';
import type { VerifiedActionSurface } from '../verified-action-receipt';
import type { Json } from '../../database.types';

/**
 * Our run types are precise interfaces; the generated column type for a jsonb
 * column is `Json`, which requires an index signature. Cast only at the three
 * jsonb assignment sites rather than casting whole insert/update payloads, so
 * every other column stays type-checked against the generated schema.
 */
const asJson = (value: unknown) => value as Json;

const RUNS_TABLE = 'dsg_one_runs';
const STEPS_TABLE = 'dsg_one_run_steps';

type RunRow = {
  run_id: string;
  org_id: string;
  actor_id: string;
  surface: string;
  status: string;
  intent: string;
  plan: RunPlan;
  plan_hash: string | null;
  template_id: string | null;
  connected_systems: string[] | null;
  audit_available: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  receipt_id: string | null;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  step_id: string;
  run_id: string;
  org_id: string;
  ordinal: number;
  summary: string;
  action_type: string;
  target_system: string;
  operation: string;
  risk_level: string;
  phase: string;
  status: string;
  gate_verdict: string | null;
  observation: StepObservation | null;
  judgement: StepJudgement | null;
  dispatched_at: string | null;
  settled_at: string | null;
};

function toStep(row: StepRow): RunStep {
  return {
    stepId: row.step_id,
    ordinal: row.ordinal,
    summary: row.summary,
    actionType: row.action_type,
    targetSystem: row.target_system,
    operation: row.operation,
    riskLevel: row.risk_level as RunStep['riskLevel'],
    phase: row.phase as RunStep['phase'],
    status: row.status as RunStep['status'],
    gateVerdict: row.gate_verdict as RunStep['gateVerdict'],
    observation: row.observation,
    judgement: row.judgement,
    dispatchedAt: row.dispatched_at,
    settledAt: row.settled_at,
  };
}

function toRun(row: RunRow, steps: StepRow[]): Run {
  return {
    schema: DSG_ONE_RUN_SCHEMA,
    runId: row.run_id,
    orgId: row.org_id,
    actorId: row.actor_id,
    surface: row.surface as VerifiedActionSurface,
    status: row.status as Run['status'],
    plan: row.plan,
    planHash: row.plan_hash,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    steps: steps.sort((a, b) => a.ordinal - b.ordinal).map(toStep),
    connectedSystems: row.connected_systems ?? [],
    auditAvailable: row.audit_available ?? false,
    receiptId: row.receipt_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateRunInput {
  orgId: string;
  actorId: string;
  surface: VerifiedActionSurface;
  plan: RunPlan;
  templateId: string | null;
  connectedSystems: string[];
  auditAvailable: boolean;
}

/**
 * Persist a DRAFT run and its PENDING steps.
 *
 * The steps are inserted with the ids the planner already assigned so the
 * planHash the user approves covers the same step identities the executor will
 * later reference.
 */
export async function createRun(input: CreateRunInput): Promise<Run> {
  const db = getSupabaseAdmin();

  const { data: runRow, error: runError } = await db
    .from(RUNS_TABLE)
    .insert({
      org_id: input.orgId,
      actor_id: input.actorId,
      surface: input.surface,
      status: 'DRAFT',
      intent: input.plan.intent,
      plan: asJson(input.plan),
      template_id: input.templateId,
      connected_systems: input.connectedSystems,
      audit_available: input.auditAvailable,
    })
    .select('*')
    .single();

  if (runError || !runRow) {
    throw new Error(`dsg_one_runs insert failed: ${runError?.message ?? 'no row returned'}`);
  }

  const row = runRow as unknown as RunRow;

  const stepRows = input.plan.steps.map((step) => ({
    step_id: step.stepId,
    run_id: row.run_id,
    org_id: input.orgId,
    ordinal: step.ordinal,
    summary: step.summary,
    action_type: step.actionType,
    target_system: step.targetSystem,
    operation: step.operation,
    risk_level: step.riskLevel,
    phase: step.phase,
    status: 'PENDING',
  }));

  const { data: inserted, error: stepError } = await db
    .from(STEPS_TABLE)
    .insert(stepRows)
    .select('*');

  if (stepError) {
    // Leave no half-built run behind: a run with no steps would read as
    // "nothing to do" and could be approved into a vacuous VERIFIED.
    await db.from(RUNS_TABLE).delete().eq('run_id', row.run_id);
    throw new Error(`dsg_one_run_steps insert failed: ${stepError.message}`);
  }

  return toRun(row, (inserted ?? []) as unknown as StepRow[]);
}

/** Load one run, scoped to the caller's org. Returns null when not visible. */
export async function getRun(runId: string, orgId: string): Promise<Run | null> {
  const db = getSupabaseAdmin();

  const { data: runRow, error: runError } = await db
    .from(RUNS_TABLE)
    .select('*')
    .eq('run_id', runId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (runError || !runRow) return null;

  const { data: steps, error: stepError } = await db
    .from(STEPS_TABLE)
    .select('*')
    .eq('run_id', runId)
    .eq('org_id', orgId)
    .order('ordinal', { ascending: true });

  if (stepError) {
    throw new Error(`dsg_one_run_steps read failed: ${stepError.message}`);
  }

  return toRun(runRow as unknown as RunRow, (steps ?? []) as unknown as StepRow[]);
}

/** Recent runs for the Activity screen, newest first. */
export async function listRuns(orgId: string, limit = 25): Promise<Run[]> {
  const db = getSupabaseAdmin();
  const capped = Math.min(Math.max(limit, 1), 100);

  const { data: runRows, error: runError } = await db
    .from(RUNS_TABLE)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(capped);

  if (runError) throw new Error(`dsg_one_runs list failed: ${runError.message}`);

  const rows = (runRows ?? []) as unknown as RunRow[];
  if (rows.length === 0) return [];

  const { data: stepRows, error: stepError } = await db
    .from(STEPS_TABLE)
    .select('*')
    .eq('org_id', orgId)
    .in('run_id', rows.map((row) => row.run_id))
    .order('ordinal', { ascending: true });

  if (stepError) throw new Error(`dsg_one_run_steps list failed: ${stepError.message}`);

  const byRun = new Map<string, StepRow[]>();
  for (const step of (stepRows ?? []) as unknown as StepRow[]) {
    const bucket = byRun.get(step.run_id);
    if (bucket) bucket.push(step);
    else byRun.set(step.run_id, [step]);
  }

  return rows.map((row) => toRun(row, byRun.get(row.run_id) ?? []));
}

/**
 * Write a transitioned run back.
 *
 * The state machine has already decided the new state; this only persists it.
 * The database triggers are the second line of defence — if application code
 * ever tries to rewrite a locked plan, the write fails rather than succeeding
 * quietly.
 */
export async function saveRun(run: Run): Promise<void> {
  const db = getSupabaseAdmin();

  const { error: runError } = await db
    .from(RUNS_TABLE)
    .update({
      status: run.status,
      plan_hash: run.planHash,
      approved_by: run.approvedBy,
      approved_at: run.approvedAt,
      expires_at: run.expiresAt,
      receipt_id: run.receiptId,
    })
    .eq('run_id', run.runId)
    .eq('org_id', run.orgId);

  if (runError) throw new Error(`dsg_one_runs update failed: ${runError.message}`);

  for (const step of run.steps) {
    const { error: stepError } = await db
      .from(STEPS_TABLE)
      .update({
        status: step.status,
        gate_verdict: step.gateVerdict,
        observation: asJson(step.observation),
        judgement: asJson(step.judgement),
        dispatched_at: step.dispatchedAt,
        settled_at: step.settledAt,
      })
      .eq('step_id', step.stepId)
      .eq('org_id', run.orgId);

    if (stepError) {
      throw new Error(`dsg_one_run_steps update failed for ${step.stepId}: ${stepError.message}`);
    }
  }
}
