import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { generateRuntimeGovernedModelReply } from '../../../lib/agent-v2/openrouter-provider';
import type { ChatbotSkillContext } from '../../../lib/agent-v2/skills';
import { planChatbotSkills } from '../../../lib/agent-v2/skills';

function sseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function hasApprovalToken(value: unknown) {
  return typeof value === 'string' && value.trim().length >= 8;
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();
  const pageContext = String(body?.pageContext || '').trim();
  const executeApprovedPlan = body?.executeApprovedPlan === true;
  const approvalToken = body?.approvalToken;
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
        let modelReply = null as Awaited<ReturnType<typeof generateRuntimeGovernedModelReply>>;
        try {
          modelReply = await generateRuntimeGovernedModelReply({
            orgId: access.orgId,
            message,
            pageContext,
          });
        } catch {
          modelReply = null;
        }

        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'assistant_reply',
              reply: modelReply?.reply || 'DSG Agent v2 สร้างแผนแล้ว โปรดตรวจและอนุมัติก่อน execution',
              model: modelReply?.modelUsed || 'skills-v2',
              provider: modelReply?.provider || 'internal-skills',
              providerSource: modelReply?.providerSource || 'runtime',
              runtimeGoverned: true,
              approval: { required_for_execution: true, runtime_gate: true },
            }),
          ),
        );

        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'plan',
              steps: plan.map((step) => ({ id: step.id, toolId: step.toolId, toolName: step.toolName })),
              executionMode: executeApprovedPlan ? 'approved_execution_requested' : 'plan_only',
              runtimeGoverned: true,
              definitionOfSuccess: [
                'User reviews the plan',
                'Execution request includes executeApprovedPlan=true and approvalToken',
                'Runtime tool result confirms the action outcome',
              ],
            }),
          ),
        );

        if (!executeApprovedPlan || !hasApprovalToken(approvalToken)) {
          controller.enqueue(
            encoder.encode(
              sseData({
                type: 'approval_required',
                message: 'Plan only. Send executeApprovedPlan=true with approvalToken to run planned steps.',
              }),
            ),
          );
          controller.enqueue(encoder.encode(sseData({ type: 'done' })));
          return;
        }

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
