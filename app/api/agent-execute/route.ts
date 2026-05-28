import { NextRequest, NextResponse } from 'next/server';
import {
  createExecutionRequest,
  planExecution,
} from '../../../lib/agent-governance/service';
import type { AgentExecuteBody } from '../../../lib/agent-governance/types';
import { readJsonBody } from '../../../lib/security/request-json';

export async function POST(req: NextRequest) {
  const parsed = await readJsonBody<AgentExecuteBody>(req, { maxBytes: 65_536 });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body?.workspace_id || !body?.org_id || !body?.provider || !body?.agent_id) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const steps = body.plan?.length ? body.plan : await planExecution(body.message ?? '');
  const created = await createExecutionRequest({ ...body, plan: steps });

  return NextResponse.json({ ok: true, execution_id: created.id, steps: created.steps }, { status: 201 });
}
