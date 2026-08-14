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
  'GITHUB_RUN_URL',
  'PREVIEW_URL',
  'ROLLBACK_URL',
]);

const promotionId = process.env.PROMOTION_ID.trim();
const commitSha = process.env.COMMIT_SHA.trim();
const workspaceKey = String(process.env.WORKSPACE_KEY || 'dsg-agent-dev').trim();
const releaseAgentId = process.env.AGENT_WORKSPACE_RELEASE_AGENT_ID.trim();
const githubRunUrl = assertHttpsUrl('github_run_url', process.env.GITHUB_RUN_URL.trim());
const previewUrl = assertHttpsUrl('preview_url', process.env.PREVIEW_URL.trim());
const rollbackUrl = assertHttpsUrl('rollback_url', process.env.ROLLBACK_URL.trim());

if (!/^[a-f0-9]{7,64}$/i.test(commitSha)) throw new Error('invalid_commit_sha');

const promotion = await fetchSingle(
  'agent_workspace_promotions',
  { id: `eq.${promotionId}`, status: 'eq.pending' },
  'id,workspace_id,org_id,status,commit_sha,requested_scopes,expires_at,checks',
);

if (String(promotion.commit_sha).toLowerCase() !== commitSha.toLowerCase()) {
  throw new Error('promotion_commit_does_not_match_workflow_commit');
}
if (!promotion.expires_at || new Date(promotion.expires_at).getTime() <= Date.now()) {
  throw new Error('promotion_expired');
}
if (!Array.isArray(promotion.requested_scopes)
  || promotion.requested_scopes.length !== 1
  || promotion.requested_scopes[0] !== 'deploy.production') {
  throw new Error('promoted_deployment_workflow_accepts_only_deploy_production_scope');
}

const workspace = await fetchSingle(
  'agent_workspaces',
  {
    id: `eq.${promotion.workspace_id}`,
    workspace_key: `eq.${workspaceKey}`,
    org_id: `eq.${promotion.org_id}`,
    status: 'eq.active',
  },
  'id,workspace_key,org_id,status,plan_hash,production_access,production_locked,vercel_project_id',
);

if (workspace.production_access !== false || workspace.production_locked !== true) {
  throw new Error('workspace_production_flags_are_not_locked');
}

await fetchSingle(
  'agents',
  {
    id: `eq.${releaseAgentId}`,
    org_id: `eq.${promotion.org_id}`,
    status: 'eq.active',
  },
  'id,org_id,status',
);

const lease = await fetchSingle(
  'agent_workspace_leases',
  {
    workspace_id: `eq.${workspace.id}`,
    agent_id: `eq.${releaseAgentId}`,
    org_id: `eq.${promotion.org_id}`,
    status: 'eq.active',
  },
  'id,scopes,environments,expires_at,auto_renew_until,status',
);

if (!Array.isArray(lease.scopes) || !lease.scopes.includes('deploy.production')) {
  throw new Error('release_agent_lease_missing_deploy_production_scope');
}
if (!Array.isArray(lease.environments) || !lease.environments.includes('production')) {
  throw new Error('release_agent_lease_missing_production_environment');
}
if (new Date(lease.auto_renew_until).getTime() <= Date.now()) {
  throw new Error('release_agent_lease_no_longer_renewable');
}

const checks = {
  approval_mode: 'trusted_release_ci',
  promotion_id: promotion.id,
  commit_sha: commitSha,
  typecheck: 'pass',
  unit_tests: 'pass',
  build: 'pass',
  preview_smoke: 'pass',
  migration_check: 'pass',
  security_check: 'pass',
  rollback_ready: 'pass',
  github_run_url: githubRunUrl,
  preview_url: previewUrl,
  rollback_url: rollbackUrl,
  verified_at: new Date().toISOString(),
};
const evidenceHash = sha256(checks);
const approvedBy = `github-actions:${githubRunUrl}`;

const approved = await patchSingle(
  'agent_workspace_promotions',
  {
    id: `eq.${promotion.id}`,
    status: 'eq.pending',
    commit_sha: `eq.${commitSha}`,
  },
  {
    status: 'approved',
    checks,
    evidence_hash: evidenceHash,
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  },
  'id,workspace_id,org_id,status,commit_sha,evidence_hash,requested_scopes,approved_by,approved_at,expires_at',
);

const authorizationEvidence = {
  source: 'promoted-production-deploy',
  github_run_url: githubRunUrl,
  preview_url: previewUrl,
  rollback_url: rollbackUrl,
  evidence_hash: evidenceHash,
};
const authorization = await supabaseRequest('rpc/authorize_agent_workspace_action', {
  method: 'POST',
  body: {
    p_workspace_key: workspace.workspace_key,
    p_agent_id: releaseAgentId,
    p_org_id: promotion.org_id,
    p_scope: 'deploy.production',
    p_environment: 'production',
    p_plan_hash: workspace.plan_hash,
    p_action: 'deploy_production',
    p_target: workspace.vercel_project_id,
    p_input_hash: sha256({ promotionId, commitSha, authorizationEvidence }),
    p_evidence: authorizationEvidence,
    p_promotion_id: promotion.id,
    p_commit_sha: commitSha,
  },
});

const decision = Array.isArray(authorization) ? authorization[0] : authorization;
if (!decision?.allowed || decision.reason !== 'approved_production_promotion') {
  throw new Error(`production_authorization_denied:${decision?.reason || 'unknown'}`);
}

writeGithubOutput({
  promotion_id: approved.id,
  evidence_hash: approved.evidence_hash,
  authorization_reason: decision.reason,
  workspace_id: workspace.id,
});

console.log(JSON.stringify({
  ok: true,
  promotionId: approved.id,
  commitSha,
  evidenceHash: approved.evidence_hash,
  authorization: decision.reason,
}, null, 2));
