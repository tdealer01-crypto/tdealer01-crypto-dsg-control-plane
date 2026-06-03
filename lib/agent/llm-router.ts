import type { AgentPlan, AgentPlanStep } from './context';
import { DSG_TOOLS } from './tools';

type ModelSpec = {
  id: string;
  openRouterId: string;
  strengths: string[];
  maxTokens: number;
};

const FREE_MODELS: ModelSpec[] = [
  {
    id: 'qwen-planner',
    openRouterId: 'qwen/qwen-2.5-7b-instruct:free',
    strengths: ['planning', 'tool-selection', 'thai'],
    maxTokens: 2048,
  },
  {
    id: 'deepseek-reasoner',
    openRouterId: 'deepseek/deepseek-r1-0528:free',
    strengths: ['reasoning', 'analysis', 'audit', 'proof'],
    maxTokens: 4096,
  },
  {
    id: 'llama-chat',
    openRouterId: 'meta-llama/llama-4-scout:free',
    strengths: ['chat', 'summary', 'explain', 'help'],
    maxTokens: 2048,
  },
  {
    id: 'qwen-coder',
    openRouterId: 'qwen/qwen-2.5-coder-7b-instruct:free',
    strengths: ['code', 'json', 'config', 'technical'],
    maxTokens: 2048,
  },
];

export type MemoryEntry = {
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  model_id?: string;
  page_context?: string;
  timestamp: number;
};

// In-memory only (best effort on serverless/warm instances).
const memoryStore = new Map<string, MemoryEntry[]>();
const MAX_MEMORY = 50;
const SESSION_TTL_MS = 30 * 60 * 1000;

type Intent = 'planning' | 'reasoning' | 'chat' | 'code';

export function getMemory(sessionKey: string): MemoryEntry[] {
  return memoryStore.get(sessionKey) || [];
}

export function addMemory(sessionKey: string, entry: MemoryEntry) {
  const mem = memoryStore.get(sessionKey) || [];
  mem.push(entry);

  cleanupStaleSessions(entry.timestamp);

  if (mem.length > MAX_MEMORY) {
    memoryStore.set(sessionKey, mem.slice(-MAX_MEMORY));
    return;
  }

  memoryStore.set(sessionKey, mem);
}

function cleanupStaleSessions(now: number) {
  for (const [key, entries] of memoryStore.entries()) {
    const lastEntry = entries.at(-1);
    if (!lastEntry) {
      memoryStore.delete(key);
      continue;
    }

    if (now - lastEntry.timestamp > SESSION_TTL_MS) {
      memoryStore.delete(key);
    }
  }
}

function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase();

  if (/json|config|policy.*create|schema|sql|code/.test(lower)) {
    return 'code';
  }

  if (/why|analyze|audit|proof|compare|explain/.test(lower)) {
    return 'reasoning';
  }

  if (/^(hi|hello|help|what|how|tell)/.test(lower)) {
    return 'chat';
  }

  return 'planning';
}

function selectModel(intent: Intent): ModelSpec {
  switch (intent) {
    case 'code':
      return FREE_MODELS.find((model) => model.id === 'qwen-coder')!;
    case 'reasoning':
      return FREE_MODELS.find((model) => model.id === 'deepseek-reasoner')!;
    case 'chat':
      return FREE_MODELS.find((model) => model.id === 'llama-chat')!;
    case 'planning':
    default:
      return FREE_MODELS.find((model) => model.id === 'qwen-planner')!;
  }
}

function buildSystemPrompt(pageContext?: string): string {
  return `You are Hermes Agent — the autonomous AI assistant for DSG ONE Control Plane.
You speak Thai and English. Match the user's language exactly.
Current page: ${pageContext || '/dashboard/hermes'}

════════════════════════════════════════════════════════
 IDENTITY & PRODUCT
════════════════════════════════════════════════════════
DSG ONE = runtime governance middleware (ไม่ใช่ marketplace)
- นั่งอยู่ระหว่าง AI logic ของ operator กับ action จริงที่กระทบ end user
- ทุก AI action ผ่าน gate: ALLOW → execute / BLOCK → หยุด / STABILIZE → human review
- ลูกค้า integrate ผ่าน POST /api/execute + Bearer API key ใน backend ตัวเอง
- End user ไม่เห็น DSG โดยตรง — DSG เป็น middleware layer

════════════════════════════════════════════════════════
 HERMES FULL OPTION RUNTIME — สิ่งที่ฉันทำได้
════════════════════════════════════════════════════════
ฉันทำงานตาม loop: วางแผน → lock plan กับ DSG → execute → collect evidence → ส่ง proof
Workers ที่ฉันใช้: file | terminal | browser | api | db | deploy | skill | subagent | research
Memory 5 ชั้น: User / Project / Workflow / Error-Fix / Skill
Adaptive: ถ้า error → retry + fix อัตโนมัติ; ถ้า out-of-plan → replan; ไม่ claim เกินหลักฐาน

════════════════════════════════════════════════════════
 TOOL MANUAL — 25 tools พร้อมใช้ทันที
════════════════════════════════════════════════════════

## 📊 SYSTEM STATUS
• readiness — ตรวจ deployment readiness ทั้งระบบ
  ใช้เมื่อ: "system status", "is the system up?", "สถานะระบบ"
  params: (none)

• capacity — quota remaining & utilization
  ใช้เมื่อ: "quota เหลือเท่าไหร่", "how much quota left"
  params: (none)

• get_metrics — control-plane performance ของวันนี้
  ใช้เมื่อ: "metrics", "performance ของวันนี้"
  params: (none)

• get_integration — integration status & source-of-truth posture
  ใช้เมื่อ: "integration status", "ระบบเชื่อมต่อ"
  params: (none)

## 🤖 AGENTS
• list_agents — list agents ทั้งหมดในองค์กร
  ใช้เมื่อ: "list agents", "มี agent อะไรบ้าง"
  params: (none)

• create_agent — สร้าง agent ใหม่ ได้ API key กลับมาครั้งเดียว
  ใช้เมื่อ: "create agent", "สร้าง agent ชื่อ X"
  params: name (required), policy_id (optional), monthly_limit (optional)

• create_chatbot_agent — สร้าง chatbot agent พร้อม safe defaults
  ใช้เมื่อ: "create chatbot agent", "สร้าง agent สำหรับ chat"
  params: name (optional), policy_id (optional), monthly_limit (optional, default 50000)

• get_agent_detail — ดูรายละเอียด + monthly usage ของ agent
  ใช้เมื่อ: "detail agent X", "ข้อมูล agent ID นี้"
  params: agent_id (required)

• update_agent — แก้ไข name / status / policy / limit
  ใช้เมื่อ: "rename agent", "disable agent", "เพิ่ม limit"
  params: agent_id (required), name/status/policy_id/monthly_limit (optional)

• rotate_agent_key — สร้าง API key ใหม่ (key เดิมใช้ไม่ได้ทันที)
  ใช้เมื่อ: "rotate key", "เปลี่ยน API key"
  params: agent_id (required)

• delete_agent — disable agent (soft delete)
  ใช้เมื่อ: "disable agent", "ปิด agent"
  params: agent_id (required)

## 📋 POLICIES
• list_policies — list policy ทั้งหมด
  ใช้เมื่อ: "list policies", "policies มีอะไรบ้าง"
  params: (none)

## ⚡ EXECUTIONS & EVIDENCE
• list_executions — executions ล่าสุด
  ใช้เมื่อ: "executions", "การ execute ล่าสุด"
  params: limit (optional, default 10)

• get_execution_proof — proof + replay ของ execution
  ใช้เมื่อ: "proof of execution X", "หลักฐาน execution นี้"
  params: execution_id (required)

• list_proofs — proof artifacts จาก audit logs
  ใช้เมื่อ: "list proofs", "หลักฐานทั้งหมด"
  params: limit (optional, default 20)

• get_ledger — ledger + core-ledger snapshot
  ใช้เมื่อ: "ledger", "truth sequence"
  params: limit (optional, default 20)

## 🔍 AUDIT & COMPLIANCE
• get_audit — audit events + determinism checks
  ใช้เมื่อ: "audit log", "audit events"
  params: limit (optional, default 20)

• audit_summary — runtime truth + ledger summary ของ agent
  ใช้เมื่อ: "audit summary for agent X"
  params: agent_id (required)

• get_enterprise_proof — enterprise proof & attestation report
  ใช้เมื่อ: "enterprise proof report"
  params: (none)

• get_compliance_status — CCVS compliance: mutation score, evidence chain
  ใช้เมื่อ: "compliance status", "CCVS status"
  params: run_id (optional)

## 🔄 RUNTIME CHECKPOINTS
• checkpoint — สร้าง checkpoint hash จาก truth + ledger
  ใช้เมื่อ: "checkpoint for agent X"
  params: agent_id (required)

• recovery_validate — validate lineage integrity
  ใช้เมื่อ: "validate recovery for agent X"
  params: agent_id (required)

• reconcile_effect — mark effect succeeded/failed
  ใช้เมื่อ: "reconcile effect ID"
  params: effect_id (required), status ("succeeded" | "failed")

## 💻 CODE EXECUTION (Hermes Brain)
• write_code_file — เขียนไฟล์ลง sandbox /tmp/dsg-code/
  ใช้เมื่อ: "write file script.py with content...", "เขียน code ไฟล์"
  params: filename (required), content (required), language (optional: node|python3|bash)

• run_code — รัน code ผ่าน Hermes Brain governance gate
  ใช้เมื่อ: "run this python code: ...", "รัน bash script นี้"
  params: runtime (required: node|python3|bash), code (inline) หรือ file (filename)
  ตัวอย่าง: { "runtime": "python3", "code": "print('hello')" }

## 🌐 WEB & RESEARCH
• fetch_url — fetch HTTPS URL คืน text (ไม่ render JS)
  ใช้เมื่อ: "fetch https://...", "ดึงข้อมูลจาก URL"
  params: url (required, must start with https://), selector (optional keyword)

• browser_navigate — เปิด URL ใน Browserbase cloud browser (JS rendering)
  ใช้เมื่อ: "browse https://...", "เปิด browser ที่ URL"
  params: url (required), extract (optional, what to look for)

• realtime_web_search — ค้นหา live online information
  ใช้เมื่อ: "search for X", "ค้นหา X online"
  params: query (required)

## 📱 MESSAGING
• telegram_send — ส่งข้อความผ่าน Telegram ผ่าน DSG spine
  ใช้เมื่อ: "send telegram to chat X: message"
  params: agent_id (required), chat_id (required), text (required)

## 📈 USAGE & BILLING
• get_usage — current plan usage + projected overage
  ใช้เมื่อ: "usage", "billing posture", "ใช้ไปเท่าไหร่"
  params: (none)

## 🏗️ SETUP
• auto_setup — auto-configure policy, agent, billing, onboarding, runtime roles
  ใช้เมื่อ: "setup this org", "auto setup", "ตั้งค่า org อัตโนมัติ"
  params: (none) ⚠️ critical — requires org_admin

## 🚪 GOVERNANCE GATE
• execute_action — สร้าง intent + execute ผ่าน DSG gate พร้อม audit trail
  ใช้เมื่อ: "execute action X for agent Y", "gate action นี้ผ่าน DSG"
  params: agent_id (required), action (required), payload (optional)

════════════════════════════════════════════════════════
 RESPONSE FORMAT
════════════════════════════════════════════════════════
ตอบเป็น JSON เสมอ:
{
  "reply": "คำตอบภาษาไทยหรืออังกฤษ ตาม user (อธิบาย tool ที่ใช้ด้วย)",
  "plan": {
    "steps": [
      { "id": "s1", "toolId": "tool_id", "params": { "key": "value" } }
    ]
  }
}

กฎสำคัญ:
- ถ้าไม่ต้องใช้ tool → steps: []
- ถ้าต้องการ agent_id แต่ผู้ใช้ไม่ได้ให้มา → ถาม หรือ list_agents ก่อน
- ถ้า user ให้ไฟล์มา (file attachment) → อ่าน content แล้วช่วยตาม content
- ไม่ claim เกินหลักฐาน: ถ้าไม่มี tool result → อย่าบอกว่าทำสำเร็จ
- ทุก reply ต้องบอกว่า tool ที่ใช้คืออะไรและทำอะไร`;
}

function buildMessages(
  sessionKey: string,
  message: string,
  pageContext?: string,
): Array<{ role: string; content: string }> {
  const memory = getMemory(sessionKey);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: buildSystemPrompt(pageContext) },
  ];

  const recentMemory = memory.slice(-20);
  for (const entry of recentMemory) {
    messages.push({
      role: entry.role === 'tool_result' ? 'assistant' : entry.role,
      content: entry.content,
    });
  }

  messages.push({ role: 'user', content: message });
  return messages;
}

function toPlanSteps(value: unknown): AgentPlanStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((step, index) => {
    const item = step && typeof step === 'object' ? (step as Record<string, unknown>) : {};
    const params = item.params && typeof item.params === 'object' ? (item.params as Record<string, unknown>) : {};

    return {
      id: typeof item.id === 'string' && item.id ? item.id : `s${index + 1}`,
      toolId: typeof item.toolId === 'string' ? item.toolId : '',
      params,
    };
  });
}

async function callChatEndpoint(
  endpoint: string,
  modelId: string,
  headers: Record<string, string>,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  label: string,
): Promise<{ reply: string; plan: AgentPlan }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`${label} timeout after 15000ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`${label} error: ${response.status} ${err}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(content) as {
      reply?: unknown;
      plan?: { steps?: unknown };
    };
    return {
      reply: String(parsed.reply || ''),
      plan: { steps: toPlanSteps(parsed.plan?.steps) },
    };
  } catch {
    return { reply: content, plan: { steps: [] } };
  }
}

async function callOpenRouter(
  model: ModelSpec,
  messages: Array<{ role: string; content: string }>,
): Promise<{ reply: string; plan: AgentPlan }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;

  if (openRouterKey) {
    return callChatEndpoint(
      'https://openrouter.ai/api/v1/chat/completions',
      model.openRouterId,
      {
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG Control Plane',
      },
      messages,
      model.maxTokens,
      `OpenRouter ${model.id}`,
    );
  }

  if (togetherKey) {
    return callChatEndpoint(
      'https://api.together.xyz/v1/chat/completions',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      { Authorization: `Bearer ${togetherKey}` },
      messages,
      model.maxTokens,
      `Together AI ${model.id}`,
    );
  }

  throw new Error('No LLM provider key set (OPENROUTER_API_KEY or TOGETHER_API_KEY)');
}

export async function routeToModel(
  sessionKey: string,
  message: string,
  pageContext?: string,
): Promise<{
  reply: string;
  plan: AgentPlan;
  modelUsed: string;
  intent: Intent;
}> {
  const intent = classifyIntent(message);
  const model = selectModel(intent);
  const messages = buildMessages(sessionKey, message, pageContext);

  addMemory(sessionKey, {
    role: 'user',
    content: message,
    page_context: pageContext,
    timestamp: Date.now(),
  });

  const result = await callOpenRouter(model, messages);

  addMemory(sessionKey, {
    role: 'assistant',
    content: result.reply,
    model_id: model.id,
    timestamp: Date.now(),
  });

  return {
    ...result,
    modelUsed: model.id,
    intent,
  };
}

export function addToolResultToMemory(
  sessionKey: string,
  toolId: string,
  result: unknown,
) {
  addMemory(sessionKey, {
    role: 'tool_result',
    content: `[Tool: ${toolId}] ${JSON.stringify(result).slice(0, 500)}`,
    timestamp: Date.now(),
  });
}
