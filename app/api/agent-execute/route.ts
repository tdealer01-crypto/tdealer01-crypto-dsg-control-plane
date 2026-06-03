import { NextRequest, NextResponse } from 'next/server';
import {
  createExecutionRequest,
  planExecution,
} from '../../../lib/agent-governance/service';
import type { AgentExecuteBody } from '../../../lib/agent-governance/types';
import { readJsonBody } from '../../../lib/security/request-json';
import { requireOrgPermission } from '../../../lib/auth/require-org-permission';
import { fireWebhook } from '../../../lib/webhooks/deliver';

export async function POST(req: NextRequest) {
  const access = await requireOrgPermission('org.execute');
  if (access.ok !== true) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const parsed = await readJsonBody<AgentExecuteBody>(req, { maxBytes: 65_536 });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.value;
  if (!body?.workspace_id || !body?.provider || !body?.agent_id) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  if (body.org_id && body.org_id !== access.orgId) {
    return NextResponse.json({ ok: false, error: 'org_mismatch' }, { status: 403 });
  }

  const steps = body.plan?.length ? body.plan : await planExecution(body.message ?? '');
  const created = await createExecutionRequest({ ...body, org_id: access.orgId, plan: steps });

  void fireWebhook(access.orgId, 'execution.initiated', {
    execution_id: created.id,
    agent_id: body.agent_id,
    workspace_id: body.workspace_id,
  });

  return NextResponse.json({ ok: true, execution_id: created.id, steps: created.steps }, { status: 201 });
}
