export type AgentChatEvent = {
  type?: string;
  step?: string;
  tool?: string;
  error?: string;
  reply?: string;
  model?: string;
  steps?: Array<{ id?: string; toolId?: string }>;
  result?: unknown;
};

function toPlain(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '-';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatStepResult(step: string, result: unknown): string {
  if (!result || typeof result !== 'object') {
    return `ผลลัพธ์ ${step}: ${toPlain(result)}`;
  }

  const data = result as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : null;
  const pagination = data.pagination as Record<string, unknown> | undefined;

  if (typeof data.status === 'string') {
    return `Readiness ${step}: ${data.status}`;
  }

  if (items && pagination && typeof pagination.total === 'number') {
    return `สำเร็จ ${step}: พบ ${pagination.total} รายการ`;
  }

  if (typeof data.ok === 'boolean') {
    return `สำเร็จ ${step}: ${data.ok ? 'พร้อมใช้งาน' : 'พบปัญหา'}`;
  }

  return `ผลลัพธ์ ${step}:\n${toPlain(result)}`;
}

export function formatAgentEventMessage(event: AgentChatEvent): string | null {
  const type = String(event?.type || '');

  if (type === 'assistant_reply') {
    if (!event.reply) return null;
    return event.model ? `${event.reply}\n\n(model: ${event.model})` : event.reply;
  }

  if (type === 'plan') {
    const steps = Array.isArray(event.steps) ? event.steps : [];
    if (steps.length === 0) return 'กำลังประมวลผลคำสั่ง...';
    const list = steps.map((s) => `${s.id || '-'}:${s.toolId || '-'}`).join(', ');
    return `แผนการทำงาน: ${list}`;
  }

  if (type === 'step_start') {
    return `กำลังรัน ${event.step || '-'} • ${event.tool || 'tool'}`;
  }

  if (type === 'step_error') {
    return `ไม่สำเร็จ ${event.step || '-'}: ${event.error || 'เกิดข้อผิดพลาด'}`;
  }

  if (type === 'step_result') {
    return formatStepResult(event.step || '-', event.result);
  }

  if (type === 'done') {
    return 'ทำงานเสร็จแล้ว';
  }

  return null;
}

export function parseSseData(raw: string): AgentChatEvent | null {
  if (!raw.startsWith('data: ')) return null;
  try {
    return JSON.parse(raw.slice(6)) as AgentChatEvent;
  } catch {
    return null;
  }
}
