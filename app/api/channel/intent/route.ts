import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { issueChannelIntentApproval, type ChannelIntentBody } from '../../../../lib/runtime/channel-spine';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChannelIntentBody | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.agent_id || !body.request_id || !body.action) {
    return NextResponse.json(
      { ok: false, error: 'agent_id, request_id, and action are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  try {
    const result = await issueChannelIntentApproval({
      orgId: access.orgId,
      agentId: access.agentId,
      body,
    });

    return NextResponse.json({
      ok: true,
      status: 'ISSUED',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
