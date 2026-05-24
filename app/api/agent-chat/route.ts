import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { executeToolSafely } from '../../../lib/agent/executor';
import type { AgentContext, AgentPlan } from '../../../lib/agent/context';
import { planGoal } from '../../../lib/agent/planner';
import { DSG_TOOLS } from '../../../lib/agent/tools';
import { addToolResultToMemory, routeToModel } from '../../../lib/agent/llm-router';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';
import { agentPreflight } from '../../../lib/agent/preflight';

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
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const context: AgentContext = {
    orgId: access.orgId,
    role: access.grantedRoles.includes('org_admin') ? 'org_admin' : 'operator',
    origin: new URL(request.url).origin,
    authHeader: request.headers.get('authorization') || '',
    cookieHeader: request.headers.get('cookie') || '',
    approvalToken: typeof body?.approvalToken === 'string' ? body.approvalToken : undefined,
    hermesProof: body?.hermesProof ?? undefined,
  };

  const sessionKey = `${access.orgId}:${sessionId}`;

  // Preflight: classify action type from message before planning
  const actionType = /deploy|push|release|ship/i.test(message) ? 'deploy'
    : /edit|fix|change|refactor|update|add.*file|create.*file/i.test(message) ? 'edit_code'
    : /test|typecheck|lint|verify/i.test(message) ? 'run_test'
    : /paper|research|science|literature|genomic/i.test(message) ? 'research'
    : 'answer';

  const preflight = await agentPreflight({
    userGoal: message,
    requestedAction: actionType,
    repoContext: body?.repoContext ?? [],
    orgPlan: undefined,
    actorRole: context.role,
  });

  if (preflight.decision === 'block') {
    return NextResponse.json({ error: 'Blocked by ProofGate', reason: preflight.reason }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit preflight decision so the client knows which tools are active
        controller.enqueue(encoder.encode(sseData({ type: 'preflight', ...preflight })));

        let plan: AgentPlan;
        let reply = '';
        let modelUsed = 'regex';

        if (process.env.OPENROUTER_API_KEY) {
          try {
            const llmResult = await routeToModel(sessionKey, message, pageContext);
            plan = llmResult.plan;
            reply = llmResult.reply;
            modelUsed = llmResult.modelUsed;
          } catch (error) {
            logApiError('agent-chat-llm', error, { stage: 'llm-routing' });
            plan = planGoal(message, pageContext);
          }
        } else {
          plan = planGoal(message, pageContext);
        }

        if (reply) {
          controller.enqueue(
            encoder.encode(
              sseData({
                type: 'assistant_reply',
                reply,
                model: modelUsed,
              }),
            ),
          );
        }

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
            addToolResultToMemory(sessionKey, step.toolId, result);
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
