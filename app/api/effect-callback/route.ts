import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../lib/agent-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { processEffectCallback } from '../../../lib/runtime/spine';

export const dynamic = 'force-dynamic';

type CallbackBody = {
  agent_id?: string;
  effect_id?: string;
  request_id?: string;
  status?: 'committed' | 'failed';
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CallbackBody | null;
  if (!body?.agent_id || !body.effect_id || !body.status) {
    return NextResponse.json({ ok: false, error: 'agent_id, effect_id and status are required' }, { status: 400 });
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (!access.ok) {
    const denied = access as Extract<typeof access, { ok: false }>;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  const supabase = getSupabaseAdmin();
  const result = await processEffectCallback({
    supabase,
    orgId: access.orgId,
    effectId: body.effect_id,
    status: body.status,
    payload: body.payload || {},
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  await supabase
    .from('mcp_tool_calls')
    .update({
      status: body.status,
      metadata: {
        callback_payload: body.payload || {},
        request_id: body.request_id || null,
      },
    })
    .eq('org_id', access.orgId)
    .eq('request_id', body.request_id || '')
    .eq('agent_id', access.agentId);

  return NextResponse.json({ ok: true, effect_id: body.effect_id, status: body.status });
}
