import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../supabase-server';
import { buildGatewayAuditProof, hashGatewayValue } from './audit';
import { evaluateGatewayToolRequest } from './policy';
import { findGatewayTool } from './tool-registry';
import type { GatewayDecision, GatewayToolRequest } from './types';

function createAuditToken() {
  return `gat_${crypto.randomBytes(24).toString('hex')}`;
}

function constraintsFor(request: GatewayToolRequest, decision: GatewayDecision) {
  return {
    expiresInSeconds: 300,
    allowedTool: request.toolName,
    allowedAction: request.action,
    decision,
  };
}

export async function createMonitorPlanCheck(request: GatewayToolRequest) {
  const registryEntry = await findGatewayTool(request.orgId, request.toolName);
  const policy = evaluateGatewayToolRequest(request, registryEntry);
  const audit = buildGatewayAuditProof(request, null, policy.decision, policy.reason);
  const auditToken = createAuditToken();
  const constraints = constraintsFor(request, policy.decision);
  const decisionHash = hashGatewayValue({ requestHash: audit.requestHash, decision: policy.decision, reason: policy.reason ?? null });

  const supabase = getSupabaseAdmin() as any;
  await supabase.from('gateway_monitor_events').insert({
    org_id: request.orgId,
    plan_id: request.planId ?? null,
    tool_name: request.toolName,
    action: request.action,
    mode: 'monitor',
    decision: policy.decision,
    actor_id: request.actorId,
    actor_role: request.actorRole,
    risk: registryEntry?.risk ?? null,
    status: policy.decision === 'allow' ? 'recorded' : 'rejected',
    request_hash: audit.requestHash,
    decision_hash: decisionHash,
    record_hash: audit.recordHash,
    audit_token: auditToken,
    input: request.input,
    constraints,
  });

  return {
    ok: policy.decision === 'allow',
    decision: policy.decision,
    mode: 'monitor',
    reason: policy.reason,
    auditToken,
    requestHash: audit.requestHash,
    decisionHash,
    recordHash: audit.recordHash,
    constraints,
    registryEntry: registryEntry ?? undefined,
  };
}

export async function commitMonitorAudit(orgId: string, auditToken: string, result: Record<string, unknown>) {
  if (!orgId) {
    return { ok: false, error: 'missing_org_id' };
  }

  if (!auditToken) {
    return { ok: false, error: 'missing_audit_token' };
  }

  const supabase = getSupabaseAdmin() as any;
  const { data: event, error: readError } = await supabase
    .from('gateway_monitor_events')
    .select('id, org_id, request_hash, decision, status')
    .eq('org_id', orgId)
    .eq('audit_token', auditToken)
    .maybeSingle();

  if (readError) {
    throw new Error(`failed_to_read_monitor_event:${readError.message}`);
  }

  if (!event) {
    return { ok: false, error: 'audit_token_not_found' };
  }

  if (event.decision !== 'allow') {
    return { ok: false, error: 'decision_not_allowed' };
  }

  const recordHash = hashGatewayValue({
    requestHash: event.request_hash,
    auditToken,
    result,
    committedAt: 'committed',
  });

  const { error: updateError } = await supabase
    .from('gateway_monitor_events')
    .update({
      status: 'committed',
      result,
      record_hash: recordHash,
      committed_at: new Date().toISOString(),
    })
    .eq('id', event.id);

  if (updateError) {
    throw new Error(`failed_to_commit_monitor_event:${updateError.message}`);
  }

  return {
    ok: true,
    committed: true,
    recordHash,
  };
}
