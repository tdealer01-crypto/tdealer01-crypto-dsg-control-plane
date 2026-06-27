import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';

export const dynamic = 'force-dynamic';

function bearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const apiKey = bearerToken(request);
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'MCP_CALL_API_KEY_REQUIRED',
        message: 'MCP runtime calls require Authorization: Bearer <agent API key>. Use the Dashboard agent API key or Command Center UI before executing runtime tools.',
        nextStep: 'Create or select an active agent, copy its API key, then retry with a Bearer token.',
      },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const payload = normalizeSpinePayload({
    agent_id: body?.agent_id,
    action: body?.action || body?.tool_name || 'mcp-call',
    input: body?.payload || {},
    context: {
      source: 'mcp-call',
      tool_name: body?.tool_name || 'mcp_call',
    },
  });

  if (!payload.agentId) {
    return NextResponse.json({ ok: false, error: 'agent_id is required' }, { status: 400 });
  }

  const issued = await issueSpineIntent({
    orgId: access.orgId,
    apiKey,
    payload,
  });

  if (!issued.ok) {
    return NextResponse.json({ ok: false, ...issued.body }, { status: issued.status });
  }

  const executed = await executeSpineIntent({
    orgId: access.orgId,
    apiKey,
    payload,
  });

  return NextResponse.json(
    {
      ok: executed.ok,
      intent: issued.body,
      result: executed.body,
      truthBoundary: 'MCP call executed through the DSG runtime spine with the provided agent API key. This is internal runtime evidence, not external certification.',
    },
    { status: executed.status },
  );
}
