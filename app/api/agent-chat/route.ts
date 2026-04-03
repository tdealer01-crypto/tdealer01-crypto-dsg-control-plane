import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { executeToolSafely } from '../../../lib/agent/executor';
import type { AgentContext } from '../../../lib/agent/context';
import { planGoal } from '../../../lib/agent/planner';
import { DSG_TOOLS } from '../../../lib/agent/tools';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

function sseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const context: AgentContext = {
    orgId: access.orgId,
    role: access.grantedRoles.includes('org_admin') ? 'org_admin' : 'operator',
    origin: new URL(request.url).origin,
    authHeader: request.headers.get('authorization') || '',
    cookieHeader: request.headers.get('cookie') || '',
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const plan = planGoal(message);
        controller.enqueue(encoder.encode(sseData({ type: 'plan', steps: plan.steps })));

        for (const step of plan.steps) {
          const tool = DSG_TOOLS.find((candidate) => candidate.id === step.toolId);
          if (!tool) {
            controller.enqueue(encoder.encode(sseData({ type: 'step_error', step: step.id, error: `Tool not found: ${step.toolId}` })));
            continue;
          }

          controller.enqueue(encoder.encode(sseData({ type: 'step_start', step: step.id, tool: tool.name })));

          try {
            const result = await executeToolSafely(tool, step.params, context);
            controller.enqueue(encoder.encode(sseData({ type: 'step_result', step: step.id, result })));
          } catch (error) {
            logApiError('api/agent-chat', error, { stage: 'tool-execution', step: step.id, toolId: step.toolId });
            controller.enqueue(
              encoder.encode(
                sseData({
                  type: 'step_error',
                  step: step.id,
                  error: internalErrorMessage(),
                }),
              ),
            );
          }
        }

        controller.enqueue(encoder.encode(sseData({ type: 'done' })));
      } finally {
        controller.close();
      }
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
