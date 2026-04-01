import { describe, it, expect, vi } from 'vitest';

describe('audit export route', () => {
  it('returns org-scoped json and csv', async () => {
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: true, orgId: 'org1' })) }));
    vi.doMock('../../../lib/security/audit-export', () => ({
      exportAuditEventsAsJson: vi.fn(async () => ([{ event_type: 'sign_in_event', created_at: '2026-04-01', email: 'a@b.com' }])),
      exportAuditEventsAsCsv: vi.fn(async () => 'event_type,created_at\n"sign_in_event","2026-04-01"'),
    }));
    const { GET } = await import('../../../app/api/settings/security/audit-export/route');
    const jsonRes = await GET(new Request('http://localhost/api/settings/security/audit-export?format=json') as any);
    expect(jsonRes.status).toBe(200);
    const json = await jsonRes.json();
    expect(json.items[0].event_type).toBe('sign_in_event');
    const csvRes = await GET(new Request('http://localhost/api/settings/security/audit-export?format=csv') as any);
    expect(csvRes.status).toBe(200);
    expect(await csvRes.text()).toContain('event_type');
  });
});
