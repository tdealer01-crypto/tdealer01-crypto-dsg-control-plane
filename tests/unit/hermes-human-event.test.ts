import { describe, expect, it } from 'vitest';
import { humanizeAgentEvent, isReadOnlyHumanPlan, summarizeHumanResult } from '@/lib/hermes/human-event';

describe('Hermes human event translator', () => {
  it('renders a readable read-only plan', () => {
    const message = humanizeAgentEvent({
      type: 'plan',
      steps: [
        { id: 's1', toolId: 'readiness_v2', toolName: 'Check System Readiness' },
        { id: 's2', toolId: 'list_agents_v2', toolName: 'List Agents' },
      ],
    });

    expect(message).toContain('แผนงานที่ Hermes จะทำ');
    expect(message).toContain('ตรวจความพร้อมของระบบ');
    expect(message).toContain('ดูรายชื่อเอเจ้น');
    expect(message).toContain('โหมดอ่านอย่างเดียว');
  });

  it('keeps read-only classification strict', () => {
    expect(isReadOnlyHumanPlan([
      { toolId: 'readiness_v2' },
      { toolId: 'audit_events_v2' },
    ])).toBe(true);

    expect(isReadOnlyHumanPlan([
      { toolId: 'readiness_v2' },
      { toolId: 'create_agent_v2' },
    ])).toBe(false);
  });

  it('summarizes common tool result shapes', () => {
    expect(summarizeHumanResult('s1', { status: 'ok' })).toContain('สถานะ ok');
    expect(summarizeHumanResult('s2', { items: [{ id: 1 }], pagination: { total: 1 } })).toContain('พบ 1 รายการ');
    expect(summarizeHumanResult('s3', { ok: false })).toContain('พบปัญหา');
  });

  it('renders actionable step errors', () => {
    const message = humanizeAgentEvent({ type: 'step_error', step: 's1', error: 'Tool returned a server error' });

    expect(message).toContain('ล้มเหลว');
    expect(message).toContain('ดู route/log');
  });
});
