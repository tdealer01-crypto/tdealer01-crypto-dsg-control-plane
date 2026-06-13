import { humanizeAgentEvent, summarizeHumanResult } from '../hermes/human-event';

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
  const human = summarizeHumanResult(step, result);
  const raw = toPlain(result);

  if (raw === '-' || raw.length > 1200) {
    return human;
  }

  return `${human}\n\nหลักฐานเทคนิค:\n${raw}`;
}

export function formatAgentEventMessage(event: AgentChatEvent): string | null {
  const human = humanizeAgentEvent(event);
  if (human) return human;

  const type = String(event?.type || '');

  if (type === 'step_result') {
    return formatStepResult(event.step || '-', event.result);
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
