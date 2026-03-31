import { NextResponse } from 'next/server';
import { resolveAgentFromApiKey } from '../../../lib/agent-auth';
import { buildApprovalKey } from '../../../lib/runtime/approval';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.intent);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7).trim();
    const body = await request.json().catch(() => null);
    const agentId = String(body?.agent_id || '');
    const intent = body?.intent ?? {};

    if (!agentId) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const agent = await resolveAgentFromApiKey(agentId, apiKey);
    if (!agent || agent.status !== 'active' || agent.org_id !== access.orgId) {
      return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401 });
    }

    const approvalKey = buildApprovalKey({ orgId: agent.org_id, agentId: agent.id, request: intent });
    const supabase = getSupabaseAdmin();

    const { data: prior, error: priorError } = await supabase
      .from('runtime_approval_requests')
      .select('id, status, expires_at')
      .eq('org_id', agent.org_id)
      .eq('agent_id', agent.id)
      .eq('approval_key', approvalKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (priorError) {
      return NextResponse.json({ error: priorError.message }, { status: 500 });
    }

    if (prior && prior.status !== 'pending') {
      return NextResponse.json({
        error: 'Intent already consumed/revoked/expired and cannot be revived',
        request_id: prior.id,
        status: prior.status,
      }, { status: 409 });
    }

    if (prior && prior.status === 'pending') {
      return NextResponse.json({ request_id: prior.id, status: prior.status, reused: true });
    }

    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { data: created, error: createError } = await supabase
      .from('runtime_approval_requests')
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        approval_key: approvalKey,
        request_payload: intent,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || 'Failed to create intent' }, { status: 500 });
    }

    return NextResponse.json({ request_id: created.id, status: created.status, expires_at: created.expires_at });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
