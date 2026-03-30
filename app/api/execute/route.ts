import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../lib/agent-auth';
import { executeThroughSpine } from '../../../lib/runtime/spine';
import type { IntentEnvelope } from '../../../lib/runtime/approval';

export const dynamic = 'force-dynamic';

type ExecuteBody = IntentEnvelope & {
  agent_id?: string;
  approval_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ExecuteBody | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.approval_id || !body.request_id || !body.action) {
    return NextResponse.json(
      { ok: false, error: 'approval_id, request_id, and action are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  try {
    const result = await executeThroughSpine(
      {
        orgId: access.orgId,
        agentId: access.agentId,
      },
      {
        request_id: body.request_id,
        action: body.action,
        next_v: body.next_v,
        next_t: Number(body.next_t),
        next_g: body.next_g,
        next_i: body.next_i,
        approval_id: body.approval_id,
      }
    );

    return NextResponse.json({
      ok: true,
      status: 'COMMITTED',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';

    const status =
      message === 'ERR_INVALID_APPROVAL' ? 400
      : message === 'ERR_REPLAY_ATTACK' ? 409
      : message === 'ERR_EXPIRED' ? 400
      : message === 'ERR_REQUEST_MISMATCH' ? 400
      : message === 'ERR_ACTION_MISMATCH' ? 400
      : message === 'ERR_INTEGRITY_MISMATCH' ? 400
      : message === 'ERR_EPOCH_MISMATCH' ? 409
      : 500;

    return NextResponse.json(
      {
        ok: false,
        status: 'FAILED',
        error: message,
      },
      { status }
    );
  }
}
