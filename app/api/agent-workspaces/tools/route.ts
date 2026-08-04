import { NextResponse } from 'next/server';
import { requireWorkspaceAgent } from '../../../../lib/agent-workspace/auth';
import {
  AGENT_WORKSPACE_KEY,
  containsSecretMaterial,
  normalizeWorkspaceEnvironment,
} from '../../../../lib/agent-workspace/policy';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = ['repo_script', 'http_connector', 'mcp', 'sql', 'vercel', 'stripe', 'browser', 'custom'];
const ALLOWED_RISKS = ['low', 'medium', 'high', 'critical'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const agentAccess = await requireWorkspaceAgent(request, body.agentId);
  if (!agentAccess.ok) {
    return NextResponse.json({ ok: false, error: agentAccess.error }, { status: agentAccess.status });
  }

  const workspaceKey = String(body.workspaceKey || AGENT_WORKSPACE_KEY).trim();
  const environment = normalizeWorkspaceEnvironment(body.environment || 'development');
  const planHash = String(body.planHash || '').trim();
  const name = String(body.name || '').trim();
  const kind = String(body.kind || 'custom').trim();
  const scope = String(body.scope || 'tool.execute').trim();
  const risk = String(body.risk || 'medium').trim();
  const sourcePath = body.sourcePath == null ? null : String(body.sourcePath).trim();
  const commandTemplate = body.commandTemplate == null ? null : String(body.commandTemplate).trim();
  const endpointUrl = body.endpointUrl == null ? null : String(body.endpointUrl).trim();
  const secretRefs = Array.isArray(body.secretRefs)
    ? body.secretRefs.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [];
  const configuration = body.configuration && typeof body.configuration === 'object' ? body.configuration : {};

  if (!environment || !planHash || !name) {
    return NextResponse.json({ ok: false, error: 'environment, planHash and name are required' }, { status: 400 });
  }
  if (environment === 'production') {
    return NextResponse.json({ ok: false, error: 'tool_creation_is_development_or_preview_only' }, { status: 403 });
  }
  if (!ALLOWED_KINDS.includes(kind) || !ALLOWED_RISKS.includes(risk)) {
    return NextResponse.json({ ok: false, error: 'invalid_tool_kind_or_risk' }, { status: 400 });
  }
  if (containsSecretMaterial({ commandTemplate, endpointUrl, configuration })) {
    return NextResponse.json({ ok: false, error: 'store_secret_references_not_secret_values' }, { status: 400 });
  }

  const admin = getSupabaseAdmin() as any;
  const { data: authorization, error: authorizationError } = await admin.rpc('authorize_agent_workspace_action', {
    p_workspace_key: workspaceKey,
    p_agent_id: agentAccess.agentId,
    p_org_id: agentAccess.orgId,
    p_scope: 'tool.create',
    p_environment: environment,
    p_plan_hash: planHash,
    p_action: 'register_tool',
    p_target: name,
    p_input_hash: null,
    p_evidence: { kind, scope, risk, sourcePath, secretRefs },
    p_promotion_id: null,
    p_commit_sha: null,
  });

  const decision = Array.isArray(authorization) ? authorization[0] : authorization;
  if (authorizationError || !decision?.allowed) {
    return NextResponse.json(
      { ok: false, error: decision?.reason || 'tool_creation_not_authorized' },
      { status: authorizationError ? 500 : 403 },
    );
  }

  const workspaceId = String(decision.workspace_id);
  const { data: tool, error: toolError } = await admin
    .from('agent_workspace_tool_registry')
    .upsert({
      workspace_id: workspaceId,
      org_id: agentAccess.orgId,
      name,
      kind,
      scope,
      risk,
      source_path: sourcePath,
      command_template: commandTemplate,
      endpoint_url: endpointUrl,
      secret_refs: secretRefs,
      configuration,
      status: 'active',
      production_enabled: false,
      created_by_agent: agentAccess.agentId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,name' })
    .select('id, workspace_id, name, kind, scope, risk, source_path, endpoint_url, secret_refs, status, production_enabled, created_by_agent, updated_at')
    .single();

  if (toolError) {
    return NextResponse.json({ ok: false, error: 'failed_to_register_workspace_tool' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tool }, { status: 201 });
}
