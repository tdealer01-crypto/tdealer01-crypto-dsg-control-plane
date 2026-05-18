import { getSupabaseAdmin } from '@/lib/supabase-server';
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
