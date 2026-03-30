import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../lib/agent-auth';
import { executeThroughSpine } from '../../../lib/runtime/spine';
import type { IntentEnvelope } from '../../../lib/runtime/approval';

export const dynamic = 'force-dynamic';

type ExecuteBody = IntentEnvelope & {
  agent_id?: string;
  approval_id?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateExecuteBody(body: ExecuteBody | null) {
  if (!body) {
    return { ok: false as const, status: 400, error: 'Invalid JSON body' };
  }

  const requiredStringFields = ['approval_id', 'request_id', 'action', 'next_g', 'next_i'] as const;
  for (const field of requiredStringFields) {
    const value = body[field];
    if (typeof value !== 'string' || !value.trim()) {
      return { ok: false as const, status: 400, error: `${field} must be a non-empty string` };
    }
  }

  if (!isRecord(body.next_v)) {
    return { ok: false as const, status: 400, error: 'next_v must be an object' };
  }

  if (typeof body.next_t !== 'number' || !Number.isFinite(body.next_t)) {
    return { ok: false as const, status: 400, error: 'next_t must be a finite number' };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ExecuteBody | null;
  const validation = validateExecuteBody(body);

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: validation.status });
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
        next_t: body.next_t,
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
