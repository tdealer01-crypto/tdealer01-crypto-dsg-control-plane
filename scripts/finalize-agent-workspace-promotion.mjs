#!/usr/bin/env node
import {
  assertHttpsUrl,
  fetchSingle,
  patchSingle,
  requireEnvironment,
  sha256,
  supabaseRequest,
  writeGithubOutput,
} from './lib/agent-workspace-release.mjs';

requireEnvironment([
  'AGENT_WORKSPACE_SUPABASE_URL',
  'AGENT_WORKSPACE_SUPABASE_SERVICE_ROLE_KEY',
  'AGENT_WORKSPACE_RELEASE_AGENT_ID',
  'PROMOTION_ID',
  'COMMIT_SHA',
  'PROMOTION_OUTCOME',
  'GITHUB_RUN_URL',
]);

const promotionId = process.env.PROMOTION_ID.trim();
const commitSha = process.env.COMMIT_SHA.trim();
const releaseAgentId = process.env.AGENT_WORKSPACE_RELEASE_AGENT_ID.trim();
const outcome = process.env.PROMOTION_OUTCOME.trim().toLowerCase();
const githubRunUrl = assertHttpsUrl('github_run_url', process.env.GITHUB_RUN_URL.trim());

if (!['executed', 'rejected'].includes(outcome)) {
  throw new Error('promotion_outcome_must_be_executed_or_rejected');
}

const promotion = await fetchSingle(
  'agent_workspace_promotions',
  { id: `eq.${promotionId}` },
  'id,workspace_id,org_id,status,commit_sha,requested_scopes,checks,evidence_hash,expires_at,executed_at',
);
if (String(promotion.commit_sha).toLowerCase() !== commitSha.toLowerCase()) {
  throw new Error('promotion_commit_does_not_match_finalize_commit');
}

const workspace = await fetchSingle(
  'agent_workspaces',
  { id: `eq.${promotion.workspace_id}`, org_id: `eq.${promotion.org_id}` },
  'id,workspace_key,org_id,plan_hash,production_access,production_locked',
);

const lease = await fetchSingle(
  'agent_workspace_leases',
  {
    workspace_id: `eq.${workspace.id}`,
    agent_id: `eq.${releaseAgentId}`,
    org_id: `eq.${promotion.org_id}`,
  },
  'id,status',
);

if (outcome === 'executed') {
  requireEnvironment(['PRODUCTION_URL']);
  const productionUrl = assertHttpsUrl('production_url', process.env.PRODUCTION_URL.trim());
  if (promotion.status !== 'approved') throw new Error('only_approved_promotion_can_be_executed');

  const checks = {
    ...(promotion.checks ?? {}),
    production_health: 'pass',
    production_url: productionUrl,
    executed_at: new Date().toISOString(),
  };

  const finalized = await patchSingle(
    'agent_workspace_promotions',
    { id: `eq.${promotion.id}`, status: 'eq.approved', commit_sha: `eq.${commitSha}` },
    {
      status: 'executed',
      checks,
      executed_at: checks.executed_at,
      updated_at: checks.executed_at,
    },
    'id,status,commit_sha,evidence_hash,executed_at,checks',
  );

  const auditEvidence = {
    github_run_url: githubRunUrl,
    production_url: productionUrl,
    evidence_hash: promotion.evidence_hash,
    commit_sha: commitSha,
  };
  await supabaseRequest('agent_workspace_audit_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      workspace_id: workspace.id,
      org_id: promotion.org_id,
      agent_id: releaseAgentId,
      action: 'production_deploy_completed',
      requested_scope: 'deploy.production',
      environment: 'production',
      target: productionUrl,
      plan_hash: workspace.plan_hash,
      input_hash: sha256(auditEvidence),
      authorized: true,
      reason: 'approved_production_promotion_executed',
      lease_id: lease.id,
      promotion_id: promotion.id,
      evidence: auditEvidence,
    },
  });

  writeGithubOutput({ promotion_status: finalized.status, production_url: productionUrl });
  console.log(JSON.stringify({ ok: true, status: finalized.status, productionUrl }, null, 2));
  process.exit(0);
}

if (!['pending', 'approved'].includes(promotion.status)) {
  console.log(JSON.stringify({ ok: true, status: promotion.status, unchanged: true }, null, 2));
  process.exit(0);
}

const failureReason = String(process.env.FAILURE_REASON || 'trusted_release_workflow_failed').slice(0, 500);
const rejected = await patchSingle(
  'agent_workspace_promotions',
  { id: `eq.${promotion.id}`, status: `eq.${promotion.status}`, commit_sha: `eq.${commitSha}` },
  {
    status: 'rejected',
    rejection_reason: failureReason,
    updated_at: new Date().toISOString(),
  },
  'id,status,commit_sha,rejection_reason',
);

const rejectionEvidence = {
  github_run_url: githubRunUrl,
  commit_sha: commitSha,
  previous_status: promotion.status,
  failure_reason: failureReason,
};
await supabaseRequest('agent_workspace_audit_events', {
  method: 'POST',
  prefer: 'return=minimal',
  body: {
    workspace_id: workspace.id,
    org_id: promotion.org_id,
    agent_id: releaseAgentId,
    action: 'production_promotion_rejected',
    requested_scope: 'deploy.production',
    environment: 'production',
    target: null,
    plan_hash: workspace.plan_hash,
    input_hash: sha256(rejectionEvidence),
    authorized: false,
    reason: 'trusted_release_workflow_failed',
    lease_id: lease.id,
    promotion_id: promotion.id,
    evidence: rejectionEvidence,
  },
});

writeGithubOutput({ promotion_status: rejected.status });
console.log(JSON.stringify({ ok: true, status: rejected.status, reason: rejected.rejection_reason }, null, 2));
