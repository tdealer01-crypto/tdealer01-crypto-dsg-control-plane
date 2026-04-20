import { describe, expect, it } from 'vitest';
import { formatAgentEventMessage, parseSseData } from '../../../lib/agent/chat-event';

describe('parseSseData', () => {
  it('parses a valid SSE data line', () => {
    const event = parseSseData('data: {"type":"done"}');
    expect(event).toEqual({ type: 'done' });
  });

  it('returns null when payload is not data line', () => {
    expect(parseSseData('event: message')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseSseData('data: not-json')).toBeNull();
  });
});

describe('formatAgentEventMessage', () => {
  it('formats step error as human-readable text', () => {
    const text = formatAgentEventMessage({ type: 'step_error', step: 's1', error: 'Internal server error' });
    expect(text).toBe('ไม่สำเร็จ s1: Internal server error');
  });

  it('formats paginated list results as summary count', () => {
    const text = formatAgentEventMessage({
      type: 'step_result',
      step: 's2',
      result: {
        items: [{ id: 1 }],
        pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
      },
    });
    expect(text).toBe('สำเร็จ s2: พบ 1 รายการ');
  });

  it('formats plan steps list', () => {
    const text = formatAgentEventMessage({
      type: 'plan',
      steps: [{ id: 's1', toolId: 'readiness' }, { id: 's2', toolId: 'list_agents' }],
    });

    expect(text).toBe('แผนการทำงาน: s1:readiness, s2:list_agents');
  });
});
