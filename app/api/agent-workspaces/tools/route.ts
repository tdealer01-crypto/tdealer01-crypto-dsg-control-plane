import { NextResponse } from 'next/server';
import { requireWorkspaceAgent } from '../../../../lib/agent-workspace/auth';
import {
  AGENT_WORKSPACE_KEY,
  DEFAULT_DEVELOPMENT_SCOPES,
  containsSecretMaterial,
  normalizeWorkspaceEnvironment,
  scopeMatches,
} from '../../../../lib/agent-workspace/policy';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { maxObjectDepth, readJsonBody } from '../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = ['repo_script', 'http_connector', 'mcp', 'sql', 'vercel', 'stripe', 'browser', 'custom'];
const ALLOWED_RISKS = ['low', 'medium', 'high', 'critical'];
const SECRET_REF_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const SAFE_SOURCE_PATH = /^(?:scripts|tools|lib|packages|tests)\/[A-Za-z0-9._/-]{1,240}$/;

function validateEndpoint(value: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return url.toString();
}

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'agent-workspace-tools'),
    limit: 60,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 64_000 });
  if (!parsed.ok || !parsed.value) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status, headers });
  }
  const body = parsed.value;
  const agentAccess = await requireWorkspaceAgent(request, body.agentId);
  if (!agentAccess.ok) {
    return NextResponse.json({ ok: false, error: agentAccess.error }, { status: agentAccess.status, headers });
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
  const rawEndpointUrl = body.endpointUrl == null ? null : String(body.endpointUrl).trim();
  const endpointUrl = validateEndpoint(rawEndpointUrl);
  const secretRefs = Array.isArray(body.secretRefs)
    ? Array.from(new Set<string>(
        body.secretRefs
          .map((value: unknown) => String(value).trim())
          .filter((value: string) => value.length > 0),
      ))
    : [];
  const configuration = body.configuration && typeof body.configuration === 'object' ? body.configuration : {};

  if (!environment || !/^[a-f0-9]{64}$/i.test(planHash) || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(name)) {
    return NextResponse.json({ ok: false, error: 'invalid_environment_plan_hash_or_tool_name' }, { status: 400, headers });
  }
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/i.test(workspaceKey)) {
    return NextResponse.json({ ok: false, error: 'invalid_workspace_key' }, { status: 400, headers });
  }
  if (environment === 'production') {
    return NextResponse.json({ ok: false, error: 'tool_creation_is_development_or_preview_only' }, { status: 403, headers });
  }
  if (!ALLOWED_KINDS.includes(kind) || !ALLOWED_RISKS.includes(risk)) {
    return NextResponse.json({ ok: false, error: 'invalid_tool_kind_or_risk' }, { status: 400, headers });
  }
  if (!scopeMatches(DEFAULT_DEVELOPMENT_SCOPES, scope)) {
    return NextResponse.json({ ok: false, error: 'tool_scope_must_be_development_or_preview_only' }, { status: 400, headers });
  }
  if (sourcePath && (!SAFE_SOURCE_PATH.test(sourcePath) || sourcePath.includes('..'))) {
    return NextResponse.json({ ok: false, error: 'invalid_tool_source_path' }, { status: 400, headers });
  }
  if (rawEndpointUrl && !endpointUrl) {
    return NextResponse.json({ ok: false, error: 'endpoint_must_be_https_or_local_http_without_credentials_query_or_fragment' }, { status: 400, headers });
  }
  if (secretRefs.some((reference) => !SECRET_REF_PATTERN.test(reference))) {
    return NextResponse.json({ ok: false, error: 'invalid_secret_reference_name' }, { status: 400, headers });
  }
  if ((commandTemplate?.length ?? 0) > 2_000 || !maxObjectDepth(configuration, 10)) {
    return NextResponse.json({ ok: false, error: 'tool_configuration_exceeds_limits' }, { status: 400, headers });
  }
  if (containsSecretMaterial({ commandTemplate, endpointUrl, configuration })) {
    return NextResponse.json({ ok: false, error: 'store_secret_references_not_secret_values' }, { status: 400, headers });
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
      { status: authorizationError ? 500 : 403, headers },
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
    return NextResponse.json({ ok: false, error: 'failed_to_register_workspace_tool' }, { status: 500, headers });
  }

  return NextResponse.json({ ok: true, tool }, { status: 201, headers });
}
