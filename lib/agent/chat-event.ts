import { humanizeAgentEvent } from '../hermes/human-event';

export type AgentChatEvent = {
  type?: string;
  step?: string;
  tool?: string;
  error?: string;
  reply?: string;
  model?: string;
  steps?: Array<{ id?: string; toolId?: string; toolName?: string; goal?: string }>;
  result?: unknown;
  decision?: string;
  reason?: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  affected_count?: number;
  rollback_available?: boolean;
  decision_id?: string;
  locale?: 'en' | 'th';
  renderMode?: 'legacy' | 'human';
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
    return `Result ${step}: ${toPlain(result)}`;
  }

  const data = result as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : null;
  const pagination = data.pagination as Record<string, unknown> | undefined;

  if (typeof data.status === 'string') {
    return `Readiness ${step}: ${data.status}`;
  }

  if (items && pagination && typeof pagination.total === 'number') {
    return `Done ${step}: found ${pagination.total} items`;
  }

  if (typeof data.ok === 'boolean') {
    return `Done ${step}: ${data.ok ? 'ready' : 'issue detected'}`;
  }

  return `Result ${step}:\n${toPlain(result)}`;
}

function wantsHumanRender(event: AgentChatEvent): boolean {
  return event.renderMode === 'human' || event.locale === 'th';
}

export function formatHumanAgentEventMessage(event: AgentChatEvent): string | null {
  return humanizeAgentEvent(event);
}

export function formatAgentEventMessage(event: AgentChatEvent): string | null {
  if (wantsHumanRender(event)) {
    const human = humanizeAgentEvent(event);
    if (human) return human;
  }

  const type = String(event?.type || '');

  if (type === 'assistant_reply') {
    if (!event.reply) return null;
    return event.model ? `${event.reply}\n\n(model: ${event.model})` : event.reply;
  }

  if (type === 'plan') {
    const steps = Array.isArray(event.steps) ? event.steps : [];
    if (steps.length === 0) return 'Processing command...';
    const list = steps.map((s) => `${s.id || '-'}:${s.toolId || '-'}`).join(', ');
    return `Action plan: ${list}`;
  }

  if (type === 'step_start') {
    return `Running ${event.step || '-'} • ${event.tool || 'tool'}`;
  }

  if (type === 'step_error') {
    return `Failed ${event.step || '-'}: ${event.error || 'an error occurred'}`;
  }

  if (type === 'step_result') {
    return formatStepResult(event.step || '-', event.result);
  }

  if (type === 'done') {
    return 'Done';
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
