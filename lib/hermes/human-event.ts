export type HumanEventStep = {
  id?: string;
  toolId?: string;
  toolName?: string;
  goal?: string;
};

export type HumanEvent = {
  type?: string;
  step?: string;
  tool?: string;
  error?: string;
  reply?: string;
  model?: string;
  steps?: HumanEventStep[];
  result?: unknown;
  decision?: string;
  reason?: string;
};

const TOOL_LABELS: Record<string, string> = {
  readiness_v2: 'ตรวจความพร้อมของระบบ',
  list_agents_v2: 'ดูรายชื่อเอเจ้น',
  list_policies_v2: 'ดูนโยบายที่ใช้งาน',
  list_executions_v2: 'ดูประวัติการทำงานล่าสุด',
  audit_events_v2: 'ดู audit log',
  runtime_summary_v2: 'สรุป runtime ของเอเจ้น',
  runtime_recovery_v2: 'ตรวจ runtime recovery',
  create_agent_v2: 'สร้างเอเจ้นใหม่',
  create_chatbot_agent_v2: 'สร้าง chatbot agent',
  chatbot_message_v2: 'ส่งข้อความหา chatbot agent',
  auto_setup_v2: 'ตั้งค่าองค์กรอัตโนมัติ',
  readiness: 'ตรวจความพร้อมของระบบ',
  list_agents: 'ดูรายชื่อเอเจ้น',
  capacity: 'ตรวจความจุตัวรันงาน',
  get_metrics: 'ดู metrics',
};

const READ_ONLY_TOOL_IDS = new Set([
  'readiness_v2',
  'list_agents_v2',
  'list_policies_v2',
  'list_executions_v2',
  'audit_events_v2',
  'runtime_summary_v2',
  'runtime_recovery_v2',
  'readiness',
  'list_agents',
  'capacity',
  'get_metrics',
]);

export function getHumanToolLabel(toolId?: string, fallback?: string): string {
  const key = String(toolId || '').trim();
  if (!key) return fallback || 'เครื่องมือ';
  return TOOL_LABELS[key] || fallback || key.replace(/_/g, ' ');
}

export function isReadOnlyHumanPlan(steps: HumanEventStep[]): boolean {
  return steps.length > 0 && steps.every((step) => READ_ONLY_TOOL_IDS.has(String(step.toolId || step.goal || '')));
}

export function summarizeHumanPlan(steps: HumanEventStep[]): string {
  if (!steps.length) return 'กำลังเตรียมแผนงาน...';

  const mode = isReadOnlyHumanPlan(steps)
    ? 'โหมดอ่านอย่างเดียว — ไม่แก้ไฟล์ ไม่แตะฐานข้อมูล ไม่ deploy'
    : 'ต้องตรวจผลกระทบก่อนรันจริง';

  const rows = steps
    .map((step, index) => `${index + 1}. ${getHumanToolLabel(step.toolId || step.goal, step.toolName)}`)
    .join('\n');

  return `แผนงานที่ Hermes จะทำ\n${rows}\n\n${mode}`;
}

function countItems(value: Record<string, unknown>): number | null {
  const pagination = value.pagination as Record<string, unknown> | undefined;
  if (pagination && typeof pagination.total === 'number') return pagination.total;
  const items = value.items;
  if (Array.isArray(items)) return items.length;
  return null;
}

export function summarizeHumanResult(step: string, result: unknown): string {
  if (!result || typeof result !== 'object') {
    return `ขั้นตอน ${step} เสร็จแล้ว: ${result == null ? 'ไม่มีรายละเอียดเพิ่มเติม' : String(result)}`;
  }

  const data = result as Record<string, unknown>;
  const total = countItems(data);

  if (typeof data.status === 'string') {
    return `ตรวจระบบเสร็จแล้ว: สถานะ ${data.status}`;
  }

  if (typeof data.ok === 'boolean') {
    return data.ok
      ? `ขั้นตอน ${step} ผ่านแล้ว — ระบบตอบกลับว่าสำเร็จ`
      : `ขั้นตอน ${step} พบปัญหา — ต้องดูรายละเอียดเพิ่มเติม`;
  }

  if (typeof total === 'number') {
    return `ขั้นตอน ${step} เสร็จแล้ว — พบ ${total} รายการ`;
  }

  if (typeof data.output === 'string') {
    const decision = typeof data.decision === 'string' ? ` (${data.decision})` : '';
    return `ขั้นตอน ${step} เสร็จแล้ว${decision}: ${data.output.slice(0, 240)}`;
  }

  return `ขั้นตอน ${step} เสร็จแล้ว — มีหลักฐานเทคนิคให้กดดูเพิ่ม`;
}

export function humanizeAgentEvent(event: HumanEvent): string | null {
  const type = String(event?.type || '');

  if (type === 'assistant_reply') {
    if (!event.reply) return null;
    return event.model ? `${event.reply}\n\nโมเดล: ${event.model}` : event.reply;
  }

  if (type === 'preflight') {
    const decision = event.decision || 'กำลังตรวจ';
    const reason = event.reason ? `\nเหตุผล: ${event.reason}` : '';
    return `กำลังตรวจสิทธิ์ แผน และความเสี่ยงก่อนเริ่มงาน\nผลเบื้องต้น: ${decision}${reason}`;
  }

  if (type === 'plan') {
    return summarizeHumanPlan(Array.isArray(event.steps) ? event.steps : []);
  }

  if (type === 'approval_required') {
    return 'แผนพร้อมแล้ว แต่ยังไม่รันจริง — ต้องอนุมัติก่อน ถ้าเป็นงานอ่านอย่างเดียวให้พิมพ์: อนุมัติ read-only แล้วรันเลย';
  }

  if (type === 'step_start') {
    return `กำลังรัน ${event.step || '-'}: ${getHumanToolLabel(event.tool, event.tool)}`;
  }

  if (type === 'step_result') {
    return summarizeHumanResult(event.step || '-', event.result);
  }

  if (type === 'step_error') {
    return `ขั้นตอน ${event.step || '-'} ล้มเหลว: ${event.error || 'ระบบไม่ส่งรายละเอียดกลับมา'}\nขั้นต่อไป: ดู route/log ของขั้นตอนนี้ก่อน retry`;
  }

  if (type === 'done') {
    return 'งานจบแล้ว — ตรวจผลลัพธ์ แผน และหลักฐานด้านบนก่อนสรุปว่าผ่าน';
  }

  return null;
}
