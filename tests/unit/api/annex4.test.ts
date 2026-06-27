import { describe, it, expect } from 'vitest';
import { GET } from '../../../app/api/compliance-evidence-pack/annex4/route';

describe('GET /api/compliance-evidence-pack/annex4', () => {
  it('returns ok:true with 9 Annex IV items', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.schema_version).toBe('1.0.0');
    expect(body.annex).toBe('IV');
    expect(body.items).toHaveLength(9);
  });

  it('certificationClaim is false', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    expect(body.certificationClaim).toBe(false);
    expect(body.independentAuditClaim).toBe(false);
  });

  it('all items have required fields', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    for (const item of body.items) {
      expect(item).toHaveProperty('item_number');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('dsg_control_id');
      expect(item).toHaveProperty('status');
      expect(['covered', 'partial', 'pending']).toContain(item.status);
    }
  });

  it('items are numbered 1-9 in order', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    const numbers = body.items.map((i: { item_number: number }) => i.item_number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('summary counts match items', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    const { summary, items } = body;
    expect(summary.total).toBe(9);
    expect(summary.covered + summary.partial + summary.pending).toBe(9);
    const covered = items.filter((i: { status: string }) => i.status === 'covered').length;
    const partial = items.filter((i: { status: string }) => i.status === 'partial').length;
    expect(summary.covered).toBe(covered);
    expect(summary.partial).toBe(partial);
  });

  it('enforcement_deadline is 2026-08-01', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    expect(body.enforcement_deadline).toBe('2026-08-01');
  });

  it('returns HTML when format=html', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4?format=html');
    const res = await GET(req);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('EU AI Act Annex IV');
    expect(html).toContain('certificationClaim=false');
    expect(html).toContain('CTRL-HUMAN-GATE');
  });

  it('items that have ccvs_requirement_id include requirement_detail', async () => {
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    const body = await res.json();
    const withReq = body.items.filter((i: { ccvs_requirement_id: string | null }) => i.ccvs_requirement_id !== null);
    for (const item of withReq) {
      expect(item.requirement_detail).not.toBeNull();
      expect(item.requirement_detail).toHaveProperty('control_id');
    }
  });
});
