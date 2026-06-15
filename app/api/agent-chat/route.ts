import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { executeToolSafely } from '../../../lib/agent/executor';
import type { AgentContext, AgentPlan } from '../../../lib/agent/context';
import { planGoal } from '../../../lib/agent/planner';
import { DSG_TOOLS } from '../../../lib/agent/tools';
import { addToolResultToMemory, routeToModel } from '../../../lib/agent/llm-router';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';
import { agentPreflight } from '../../../lib/agent/preflight';
import { evaluateAnswerGate, detectClaimsInReply } from '../../../lib/dsg/answer-gate';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

async function synthesizeWithClaude(
  userMessage: string,
  toolResults: Array<{ toolId: string; result: unknown }>,
): Promise<{ reply: string; gateDecision: string; gateAllowed: boolean; claimsDetected: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { reply: '', gateDecision: 'NO_API_KEY', gateAllowed: true, claimsDetected: [] };

  const toolSummary = toolResults
    .map((r) => `[${r.toolId}]: ${JSON.stringify(r.result, null, 2).slice(0, 1500)}`)
    .join('\n\n');

  const systemPrompt = `คุณคือ Hermes Agent ผู้ช่วย AI สำหรับ DSG ONE Control Plane
ตอบเป็นภาษาไทยหรืออังกฤษตามที่ผู้ใช้ถาม
สรุปผลลัพธ์จาก tool ให้เข้าใจง่าย กระชับ มีประโยชน์
ห้ามพิมพ์ JSON ดิบทั้งก้อน ให้สรุปเป็นภาษาธรรมชาติ
ถ้าข้อมูลมีปัญหา ให้บอกตรงๆ
ห้ามอ้างว่าระบบ production-ready, deployed, หรือ tests passed ถ้าไม่มีหลักฐานจาก tool`;

  let reply = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: `คำถาม: ${userMessage}\n\nผลลัพธ์จาก tools:\n${toolSummary}` }],
      }),
    });
    if (!res.ok) return { reply: '', gateDecision: 'API_ERROR', gateAllowed: true, claimsDetected: [] };
    const data = await res.json() as { content: Array<{ type: string; text?: string }> };
    reply = data.content?.[0]?.text ?? '';
  } catch {
    return { reply: '', gateDecision: 'FETCH_ERROR', gateAllowed: true, claimsDetected: [] };
  }

  // DSG Answer Gate — pure deterministic Boolean logic, zero LLM
  const facts = detectClaimsInReply(reply, { executedSteps: toolResults.length > 0, hasUserQuestion: true });
  const gate = evaluateAnswerGate(facts);
  const finalReply = !gate.allowed ? `⚠️ [DSG Gate: ${gate.final_decision}]\n\n${reply}` : reply;
  const claimsDetected = Object.entries(facts)
    .filter(([key, val]) => key.startsWith('contains_') && val === true)
    .map(([key]) => key);

  return { reply: finalReply, gateDecision: gate.final_decision, gateAllowed: gate.allowed, claimsDetected };
}

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
          // DSG Answer Gate — runs after full reply is buffered, pure deterministic Boolean logic
          const routerFacts = detectClaimsInReply(reply, { executedSteps: false, hasUserQuestion: true });
          const routerGate = evaluateAnswerGate(routerFacts);
          const gatedReply = !routerGate.allowed
            ? `⚠️ [DSG Gate: ${routerGate.final_decision}]\n\n${reply}`
            : reply;
          controller.enqueue(
            encoder.encode(
              sseData({
                type: 'assistant_reply',
                reply: gatedReply,
                model: modelUsed,
                gate_decision: routerGate.final_decision,
                gate_allowed: routerGate.allowed,
              }),
            ),
          );
          // Emit dedicated gate_decision event after full reply is assembled
          const routerClaimsDetected = Object.entries(routerFacts)
            .filter(([key, val]) => key.startsWith('contains_') && val === true)
            .map(([key]) => key);
          controller.enqueue(
            encoder.encode(
              sseData({
                type: 'gate_decision',
                decision: routerGate.final_decision,
                claims_detected: routerClaimsDetected,
                allowed: routerGate.allowed,
              }),
            ),
          );
        }

        controller.enqueue(encoder.encode(sseData({ type: 'plan', steps: plan.steps })));

        const collectedResults: Array<{ toolId: string; result: unknown }> = [];

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
            collectedResults.push({ toolId: step.toolId, result });
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

        // Synthesize reply via Haiku 4.5 + run through DSG Answer Gate (pure logic)
        if (!reply && collectedResults.length > 0) {
          const { reply: synthesis, gateDecision, gateAllowed, claimsDetected } = await synthesizeWithClaude(message, collectedResults);
          const finalReply = synthesis || collectedResults
            .map((r) => {
              const data = r.result as Record<string, unknown>;
              if (data?.success === false) return `❌ ${r.toolId}: ${data?.error ?? 'error'}`;
              return `✅ ${r.toolId}: เสร็จสิ้น`;
            })
            .join('\n');
          controller.enqueue(encoder.encode(sseData({
            type: 'assistant_reply',
            reply: finalReply,
            model: synthesis ? HAIKU_MODEL : 'fallback',
            gate_decision: gateDecision,
            gate_allowed: gateAllowed,
          })));
          // Emit dedicated gate_decision event after full reply is assembled
          controller.enqueue(encoder.encode(sseData({
            type: 'gate_decision',
            decision: gateDecision,
            claims_detected: claimsDetected,
            allowed: gateAllowed,
          })));
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
