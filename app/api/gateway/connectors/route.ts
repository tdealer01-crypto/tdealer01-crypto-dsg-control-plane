import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

function isAllowedRole(role: string) {
  return ['owner', 'admin', 'finance_admin', 'agent_operator'].includes(role.toLowerCase());
}

function parseUrl(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const orgId = header(request, 'x-org-id');
  const actorId = header(request, 'x-actor-id') || header(request, 'x-user-id');
  const actorRole = header(request, 'x-actor-role') || header(request, 'x-user-role');

  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'missing_org_id' }, { status: 400 });
  }

  if (!actorId) {
    return NextResponse.json({ ok: false, error: 'missing_actor_id' }, { status: 400 });
  }

  if (!isAllowedRole(actorRole)) {
    return NextResponse.json({ ok: false, error: 'role_not_allowed' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const endpointUrl = parseUrl(body.endpointUrl);
  const connectorName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Customer webhook';
  const toolName = typeof body.toolName === 'string' && body.toolName.trim()
    ? body.toolName.trim()
    : 'custom_http.customer_webhook';
  const action = typeof body.action === 'string' && body.action.trim() ? body.action.trim() : 'post';
  const risk = typeof body.risk === 'string' && body.risk.trim() ? body.risk.trim() : 'medium';
  const requiresApproval = Boolean(body.requiresApproval);

  if (!endpointUrl) {
    return NextResponse.json({ ok: false, error: 'invalid_endpoint_url' }, { status: 400 });
  }

  if (!['low', 'medium', 'high', 'critical'].includes(risk)) {
    return NextResponse.json({ ok: false, error: 'invalid_risk' }, { status: 400 });
  }

  const executionMode = risk === 'critical' || requiresApproval ? 'critical' : 'gateway';
  const supabase = getSupabaseAdmin() as any;

  const { data: connector, error: connectorError } = await supabase
    .from('gateway_connectors')
    .upsert({
      org_id: orgId,
      provider: 'custom_http',
      status: 'connected',
      name: connectorName,
      endpoint_url: endpointUrl,
      metadata: {
        created_by: actorId,
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,provider,name' })
    .select('id, org_id, provider, name, endpoint_url, status')
    .single();

  if (connectorError) {
    return NextResponse.json({ ok: false, error: `failed_to_save_connector:${connectorError.message}` }, { status: 500 });
  }

  const { data: tool, error: toolError } = await supabase
    .from('gateway_tools')
    .upsert({
      org_id: orgId,
      connector_id: connector.id,
      name: toolName,
      provider: 'custom_http',
      action,
      risk,
      execution_mode: executionMode,
      requires_approval: requiresApproval,
      enabled: true,
      description: typeof body.description === 'string' ? body.description : 'Customer-managed HTTP webhook tool',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id,name' })
    .select('id, name, provider, action, risk, execution_mode, requires_approval, enabled')
    .single();

  if (toolError) {
    return NextResponse.json({ ok: false, error: `failed_to_save_tool:${toolError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, connector, tool }, { status: 200 });
}
