import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  buildEvidenceEnvelope,
  buildRunContextFromEnv,
  buildOIDCFromEnv,
} from '@/lib/ccvs/evidence-collector';
import type {
  AgentActionResultRequest,
  AgentActionResultReceipt,
  AgentCommandGateRequest,
  AgentCommandGateResult,
} from '@/lib/dsg/agent-command-gate';

type ActorContext = {
  orgId: string;
  actorId: string;
  actorRole?: string;
};

export async function recordAgentCommandGateDecision(input: {
  actor: ActorContext;
  request: AgentCommandGateRequest;
  result: AgentCommandGateResult;
}) {
  const supabase = getSupabaseAdmin() as any;
  const { actor, request, result } = input;

  const { error } = await supabase.from('dsg_agent_command_gate_decisions').insert({
    org_id: actor.orgId,
    workspace_id: request.workspaceId,
    command_id: request.command.commandId,
    agent_id: request.runtime.agentId,
    session_id: request.runtime.sessionId,
    actor_id: actor.actorId,
    actor_role: actor.actorRole ?? null,
    gate_version: result.gateVersion,
    decision: result.decision,
    can_agent_execute: result.canAgentExecute,
    status: result.status,
    command_hash: result.commandHash,
    decision_hash: result.decisionHash,
    reasons: result.reasons,
    invariant_checks: result.invariantChecks,
    action_envelope: result.actionEnvelope ?? null,
    request_body: request,
    result_body: result,
  });

  if (error) {
    throw new Error(`failed_to_record_agent_command_gate_decision:${error.message}`);
  }

  // Emit CCVS oversight evidence for every gate decision (L4 oversight level).
  // Fire-and-forget — do not let evidence emission block or fail the gate response.
  emitGateEvidenceEnvelope({ actor, request, result }).catch(() => undefined);
}

async function emitGateEvidenceEnvelope(input: {
  actor: ActorContext;
  request: AgentCommandGateRequest;
  result: AgentCommandGateResult;
}) {
  const { actor, request, result } = input;
  const envelope = buildEvidenceEnvelope({
    evidenceType: 'oversight',
    subjects: [
      {
        name: `agent-command-gate:${request.command.commandId}`,
        digest: {
          'sha256-command': result.commandHash,
          'sha256-decision': result.decisionHash,
        },
      },
    ],
    run: buildRunContextFromEnv(),
    oidc: buildOIDCFromEnv('dsg-gate-evidence'),
    metrics: {
      tests_total: result.invariantChecks.length,
      pass: result.invariantChecks.filter((c) => c.status === 'PASS').length as unknown as number,
    },
    policyVersion: result.gateVersion,
  });

  const supabase = getSupabaseAdmin() as any;
  await supabase.from('dsg_ccvs_evidence').insert({
    org_id: actor.orgId,
    workspace_id: request.workspaceId,
    command_id: request.command.commandId,
    decision: result.decision,
    evidence_type: envelope.evidence_type,
    severity_level: envelope.severity_level,
    chain_hash: envelope.integrity.chain_hash,
    envelope,
  });
}

export async function recordAgentActionResultReceipt(input: {
  actor: ActorContext;
  request: AgentActionResultRequest;
  receipt: AgentActionResultReceipt;
}) {
  const supabase = getSupabaseAdmin() as any;
  const { actor, request, receipt } = input;

  const { error } = await supabase.from('dsg_agent_action_result_receipts').insert({
    org_id: actor.orgId,
    workspace_id: request.workspaceId,
    command_id: request.commandId,
    agent_id: request.agentId,
    session_id: request.sessionId,
    envelope_id: request.envelopeId,
    actor_id: actor.actorId,
    actor_role: actor.actorRole ?? null,
    gate_version: receipt.gateVersion,
    accepted: receipt.accepted,
    status: request.status,
    result_hash: receipt.resultHash,
    receipt_hash: receipt.receiptHash,
    request_body: request,
    receipt_body: receipt,
  });

  if (error) {
    throw new Error(`failed_to_record_agent_action_result_receipt:${error.message}`);
  }
}
