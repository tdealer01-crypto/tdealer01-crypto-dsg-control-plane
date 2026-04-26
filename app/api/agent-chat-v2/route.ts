import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { executeToolSafely } from '../../../lib/agent/executor';
import type { AgentContext, AgentPlan } from '../../../lib/agent/context';
import { planGoal } from '../../../lib/agent/planner';
import { DSG_TOOLS } from '../../../lib/agent/tools';
import { callOpenRouterProvider } from '../../../lib/model-provider/openrouter';
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
  const pageContext = String(body?.pageContext || '').trim();
  const sessionId = String(body?.sessionId || access.orgId);
  const approvalToken = typeof body?.approvalToken === 'string' ? body.approvalToken : undefined;
  const customerApiKey = typeof body?.openrouterApiKey === 'string' ? body.openrouterApiKey : null;
  const executeApprovedPlan = body?.executeApprovedPlan === true;

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const context: AgentContext = {
    orgId: access.orgId,
    role: access.grantedRoles.includes('org_admin') ? 'org_admin' : 'operator',
    origin: new URL(request.url).origin,
    authHeader: request.headers.get('authorization') || '',
    cookieHeader: request.headers.get('cookie') || '',
    approvalToken,
  };

  const sessionKey = `${access.orgId}:${sessionId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let plan: AgentPlan;
        let reply = '';
        let modelUsed = 'fallback-skills-planner';
        let provider = 'fallback-skills-planner';
        let keySource = 'none';

        try {
          const providerResult = await callOpenRouterProvider({
            orgId: access.orgId,
            sessionKey,
            message,
            pageContext,
            customerApiKey,
          });
          reply = providerResult.reply;
          plan = providerResult.plan.steps.length > 0 ? providerResult.plan : planGoal(message, pageContext);
          modelUsed = providerResult.modelUsed;
          provider = providerResult.provider;
          keySource = providerResult.keySource;
        } catch (error) {
          logApiError('agent-chat-v2-provider', error, { stage: 'provider-routing' });
          plan = planGoal(message, pageContext);
        }

        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'assistant_reply',
              reply: reply || 'สร้างแผนแล้ว โปรดตรวจและอนุมัติก่อน execution',
              model: modelUsed,
              provider,
              keySource,
              approval: { required_for_write: true, runtime_gate: true },
            }),
          ),
        );

        controller.enqueue(
          encoder.encode(
            sseData({
              type: 'plan',
              steps: plan.steps,
              executionMode: executeApprovedPlan ? 'approved_execution_requested' : 'plan_only',
              definitionOfSuccess: [
                'User reviewed the plan',
                'Write/critical steps include explicit approvalToken',
                'Runtime gate records approval/audit/ledger before action execution',
              ],
            }),
          ),
        );

        if (!executeApprovedPlan) {
          controller.enqueue(
            encoder.encode(
              sseData({
                type: 'approval_required',
                message: 'Plan only. Send executeApprovedPlan=true with an approvalToken to run write/critical steps.',
              }),
            ),
          );
          controller.enqueue(encoder.encode(sseData({ type: 'done' })));
          return;
        }

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
            logApiError('api/agent-chat-v2', error, { stage: 'tool-execution', step: step.id, toolId: step.toolId });
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
