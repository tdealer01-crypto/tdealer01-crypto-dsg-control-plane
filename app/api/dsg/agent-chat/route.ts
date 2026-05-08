import { NextResponse } from 'next/server';
import { runOpenAIAdapter, type OpenAIChatMessage } from '@/lib/dsg/ai/openai-adapter';
import { routeAgentCommand } from '@/lib/dsg/agent-runtime/command-router';
import { DSG_STUDIO_REFERENCE_PROMPT, buildPlanPaneInstruction } from '@/lib/dsg/agent-runtime/studio-reference';
import { DSG_GRAPHIFY_CONTEXT_PROMPT, buildGraphifyInstruction, shouldUseGraphifyContext } from '@/lib/dsg/agent-runtime/graphify-reference';
import { DSG_PHASE1_GOVERNANCE_PROMPT, buildPhase1GovernanceInstruction, shouldUsePhase1Governance } from '@/lib/dsg/agent-runtime/phase1-governance-reference';
import { DSG_GOVERNANCE_DB_PROMPT, buildGovernanceDbInstruction, shouldUseGovernanceDb } from '@/lib/dsg/agent-runtime/governance-db-reference';

export const runtime = 'nodejs';

type ChatBody = {
  message?: string;
  context?: {
    stage?: string;
    idea?: string;
    features?: string[];
    notes?: string[];
    surface?: string;
  };
};

function shouldPlan(message: string) {
  return /plan|วางแผน|แผน|workflow|flow|ขั้นตอน|execute|browser|approval|อนุมัติ|proof|evidence|หลักฐาน|สร้าง|build|app/i.test(message);
}

function buildMessages(body: ChatBody): OpenAIChatMessage[] {
  const message = body.message?.trim();
  if (!message) throw new Error('AGENT_CHAT_MESSAGE_REQUIRED');
  const useGraphify = shouldUseGraphifyContext(message);
  const usePhase1Governance = shouldUsePhase1Governance(message);
  const useGovernanceDb = shouldUseGovernanceDb(message);

  return [
    {
      role: 'developer',
      content: [
        'You are DSG ONE V1 Agent, an enterprise governed app-builder assistant.',
        'Answer the user directly and specifically. Do not repeat a fixed script.',
        'Use concise Thai unless the user asks for English.',
        'When the user wants to build, plan, operate, verify, inspect a repo, connect tools, read governance memory/state, or work with a codebase, use the DSG planning, execution, Graphify, Phase 1 governance, and governance database rules below.',
        'Respect the DSG truth boundary: do not claim deploy, production verification, audit proof, PR evidence, browser proof, repo implementation, connector execution, database row existence, or build status unless the UI/API/tool/database has produced evidence.',
        'Prefer actionable next steps the user can click or verify in the app.',
        '',
        DSG_STUDIO_REFERENCE_PROMPT,
        '',
        useGraphify ? DSG_GRAPHIFY_CONTEXT_PROMPT : 'Graphify context is available but not required for this ordinary question.',
        '',
        usePhase1Governance ? DSG_PHASE1_GOVERNANCE_PROMPT : 'Phase 1 connector/governance reference is available but not required for this ordinary question.',
        '',
        useGovernanceDb ? DSG_GOVERNANCE_DB_PROMPT : 'Governance DB schema reference is available but not required for this ordinary question.',
        '',
        useGraphify ? buildGraphifyInstruction(message) : '',
        usePhase1Governance ? buildPhase1GovernanceInstruction(message) : '',
        useGovernanceDb ? buildGovernanceDbInstruction(message) : '',
        shouldPlan(message) ? buildPlanPaneInstruction(message) : 'For ordinary questions, answer briefly and only add a plan pane if it is useful.',
      ].filter(Boolean).join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userMessage: message,
        appBuilderContext: body.context ?? {},
      }),
    },
  ];
}

function localFallbackReply(message: string, providerError: string) {
  const graphify = shouldUseGraphifyContext(message);
  const phase1 = shouldUsePhase1Governance(message);
  const governanceDb = shouldUseGovernanceDb(message);
  const route = routeAgentCommand({
    command: message,
    context: graphify || phase1 || governanceDb
      ? 'Fallback from DSG Agent Chat because the AI provider is unavailable. Use DSG Action Layer GED, DSG Graphify Context, Phase 1 Governance Automation, and Governance DB schema rules. Do not invent repo, connector, or database evidence.'
      : 'Fallback from DSG Agent Chat because the AI provider is unavailable. Use DSG Action Layer GED planning rules, deterministic stage order, permission policy, and evidence boundary.',
    userBenefit: 'ผู้ใช้ยังได้คำตอบและขั้นตอนต่อไป แม้ AI provider จะใช้งานไม่ได้ชั่วคราว',
  });

  const evidence = route.evidence.length ? route.evidence.join(', ') : 'route decision';
  const graphifyNote = graphify
    ? 'Graphify boundary: ถ้ายังไม่ได้ inspect repo จริง ต้องถือว่าเป็น BLOCKED/REVIEW ไม่ใช่ verified context graph.'
    : undefined;
  const phase1Note = phase1
    ? 'Phase 1 governance boundary: connector/tool execution ต้องผ่าน risk classification, policy decision, approval/evidence/replay hash; ยังไม่ claim production ถ้าไม่มี RBAC, vault, migration, CI, และ live connector proof.'
    : undefined;
  const dbNote = governanceDb
    ? 'Governance DB boundary: agent_jobs / approval_requests / execution_steps / governance_audit_logs เป็น durable state source แต่ต้อง query DB จริงก่อน claim ว่า row มีอยู่.'
    : undefined;

  const reply = [
    `ตอนนี้ AI model ใช้งานไม่ได้ชั่วคราว: ${providerError}`,
    '',
    'ผมใช้ DSG local fallback วิเคราะห์คำสั่งแทน โดยยึดกฎ planning / permission / evidence ที่ตั้งไว้',
    graphifyNote,
    phase1Note,
    dbNote,
    `สถานะ: ${route.status}`,
    `ประเภทงาน: ${route.intent}`,
    `action ที่แนะนำ: ${route.actionLabel}`,
    route.endpoint ? `endpoint: ${route.method || 'GET'} ${route.endpoint}` : undefined,
    `หลักฐานที่ควรได้: ${evidence}`,
    '',
    route.status === 'blocked'
      ? 'คำสั่งนี้ถูกบล็อกตาม policy ต้องปรับคำขอให้ปลอดภัยก่อน'
      : 'ถ้าต้องการสร้างจริง ให้ใช้ Agent Command Center ด้านล่าง แล้วกด Build Now / Run Builder Request เพื่อเข้า governed builder flow',
    '',
    'ลำดับมาตรฐานที่ระบบจะใช้: goal lock → current-state inspection → architecture summary → risk and permission checkpoints → approved execution → verification → final review',
    graphify ? 'ถ้าเป็นงาน repo/codebase ต้องเพิ่ม: repository inspection → privacy/secret gate → context graph → graph report → plan gate' : undefined,
    phase1 ? 'ถ้าเป็นงาน connector/tool ต้องเพิ่ม: connector registry → tool mapping → risk classification → policy evaluation → approval queue/evidence manifest → audit/replay proof' : undefined,
    governanceDb ? 'ถ้าเป็นงาน durable memory/governance state ต้องเช็ก: agent_jobs → approval_requests → execution_steps → governance_audit_logs' : undefined,
    `Truth boundary: ${route.truthBoundary}`,
  ].filter(Boolean).join('\n');

  return { reply, route };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ChatBody | null;
  if (!body?.message?.trim()) {
    return NextResponse.json({ ok: false, error: { message: 'AGENT_CHAT_MESSAGE_REQUIRED' } }, { status: 400 });
  }

  try {
    const result = await runOpenAIAdapter({
      messages: buildMessages(body),
      maxOutputTokens: 1800,
      temperature: 0.25,
    });

    return NextResponse.json({
      ok: true,
      data: {
        reply: result.outputText || 'ผมยังตอบไม่ได้จากโมเดลในรอบนี้ ลองพิมพ์รายละเอียดเพิ่มอีกครั้งครับ',
        model: result.model,
        responseId: result.responseId,
        usage: result.usage,
        fallback: false,
      },
    });
  } catch (error) {
    const providerError = error instanceof Error ? error.message : 'AGENT_CHAT_MODEL_UNAVAILABLE';
    const fallback = localFallbackReply(body.message, providerError);
    return NextResponse.json({
      ok: true,
      data: {
        reply: fallback.reply,
        model: 'dsg-local-fallback',
        providerError,
        fallback: true,
        route: fallback.route,
      },
    });
  }
}
