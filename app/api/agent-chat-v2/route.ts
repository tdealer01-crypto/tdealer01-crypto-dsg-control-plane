import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import type { ChatbotSkillContext } from '../../../lib/agent-v2/skills';
import { planChatbotSkills } from '../../../lib/agent-v2/skills';

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

  const context: ChatbotSkillContext = {
    orgId: access.orgId,
    origin: new URL(request.url).origin,
    authHeader: request.headers.get('authorization') || '',
    cookieHeader: request.headers.get('cookie') || '',
  };

  const plan = planChatbotSkills(message);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'assistant_reply',
              reply: 'DSG Agent v2 พร้อมใช้งานจาก skills bundle',
              model: 'skills-v2',
            }),
          ),
        );

        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'plan',
              steps: plan.map((step) => ({ id: step.id, toolId: step.toolId })),
            }),
          ),
        );

        for (const step of plan) {
          controller.enqueue(encoder.encode(sseData({ type: 'step_start', step: step.id, tool: step.toolName })));

          try {
            const result = await step.run(context);
            controller.enqueue(encoder.encode(sseData({ type: 'step_result', step: step.id, result })));
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                sseData({
                  type: 'step_error',
                  step: step.id,
                  error: error instanceof Error ? error.message : 'Internal server error',
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
