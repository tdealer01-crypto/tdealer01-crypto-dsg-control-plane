import { NextRequest, NextResponse } from 'next/server';
import {
  createExecutionRequest,
  planExecution,
} from '../../../lib/agent-governance/service';
import type { AgentExecuteBody } from '../../../lib/agent-governance/types';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as AgentExecuteBody | null;
  if (!body?.workspace_id || !body?.org_id || !body?.provider || !body?.agent_id) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const steps = body.plan?.length ? body.plan : await planExecution(body.message ?? '');
  const created = await createExecutionRequest({ ...body, plan: steps });

  return NextResponse.json({ ok: true, execution_id: created.id, steps: created.steps }, { status: 201 });
}
