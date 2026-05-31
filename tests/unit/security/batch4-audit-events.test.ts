import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { exportAuditEventsAsJson, exportAuditEventsAsCsv, buildAuditExportQuery } from '../../../lib/security/batch4-audit-events';

// Chain that resolves to `result` when awaited (thenable) and is also chainable.
function makeChain(result: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

function wireTables(signInRows: unknown[], auditRows: unknown[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'sign_in_events') return makeChain({ data: signInRows });
    if (table === 'audit_logs') return makeChain({ data: auditRows });
    return makeChain({ data: [] });
  });
}

beforeEach(() => {
  mockFrom.mockReset();
});

describe('batch4 audit events helper', () => {
  it('buildAuditExportQuery merges org + filters', () => {
    expect(buildAuditExportQuery('org-1', { event_type: 'sign_in_event' })).toEqual({ orgId: 'org-1', event_type: 'sign_in_event' });
  });

  it('merges sign_in_events and audit_logs sorted by created_at desc', async () => {
    wireTables(
      [{ id: 's1', email: 'a@x.com', created_at: '2026-01-01T00:00:00Z' }],
      [{ id: 'l1', created_at: '2026-02-01T00:00:00Z', decision: 'allow', reason: 'ok' }],
    );
    const events = await exportAuditEventsAsJson('org-1', {});
    expect(events.map((e) => e.event_type)).toEqual(['audit_log', 'sign_in_event']);
    expect(events[1].email).toBe('a@x.com');
  });

  it('filters by event_type', async () => {
    wireTables(
      [{ id: 's1', email: 'a@x.com', created_at: '2026-01-01T00:00:00Z' }],
      [{ id: 'l1', created_at: '2026-02-01T00:00:00Z', decision: 'allow', reason: 'ok' }],
    );
    const events = await exportAuditEventsAsJson('org-1', { event_type: 'sign_in_event' });
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('sign_in_event');
  });

  it('degrades gracefully when relations return no data', async () => {
    wireTables([], []);
    const events = await exportAuditEventsAsJson('org-1', {});
    expect(events).toEqual([]);
  });

  it('produces CSV with header and escaped payload', async () => {
    wireTables([{ id: 's1', email: 'a@x.com', created_at: '2026-01-01T00:00:00Z' }], []);
    const csv = await exportAuditEventsAsCsv('org-1', {});
    const lines = csv.split('\n');
    expect(lines[0]).toBe('event_type,created_at,email,payload');
    expect(lines[1]).toContain('sign_in_event');
    expect(lines[1]).toContain('a@x.com');
  });
});
