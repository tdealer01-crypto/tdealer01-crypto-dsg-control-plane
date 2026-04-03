import { requireOrgRole } from '../../../lib/authz';
import type { RuntimeRole } from '../../../lib/authz';
import { executeToolSafely } from '../../../lib/agent/executor';
import { planGoal } from '../../../lib/agent/planner';

function toSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function resolveChatRole(grantedRoles: string[]): RuntimeRole {
  if (grantedRoles.includes('org_admin')) return 'org_admin';
  return 'operator';
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return new Response(JSON.stringify({ error: access.error }), {
      status: access.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const plan = planGoal(message);
  const context = {
    orgId: access.orgId,
    role: resolveChatRole(access.grantedRoles || []),
    origin: new URL(request.url).origin,
    authHeaders: {
      cookie: request.headers.get('cookie') || undefined,
      authorization: request.headers.get('authorization') || undefined,
    },
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(toSseEvent('plan', { goal: plan.goal, steps: plan.steps })));

      for (const step of plan.steps) {
        controller.enqueue(encoder.encode(toSseEvent('step_start', step)));
        const result = await executeToolSafely(step.toolId, step.params, context);
        controller.enqueue(encoder.encode(toSseEvent('step_result', { step_id: step.id, result })));
      }

      controller.enqueue(encoder.encode(toSseEvent('done', { ok: true, step_count: plan.steps.length })));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
