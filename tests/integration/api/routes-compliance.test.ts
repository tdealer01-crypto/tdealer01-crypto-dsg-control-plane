import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration tests for compliance-related routes.
 *
 * Route reality:
 *  - POST /api/compliance/export       — no auth, generates report JSON
 *  - GET  /api/compliance-evidence-pack/annex4 — no auth, returns JSON or HTML
 *  - GET  /api/compliance-evidence-pack        — no auth, returns HTML
 *  - GET  /api/ccvs/evidence-chain             — no auth, returns JSON
 *  - GET  /api/ccvs/compliance-status          — no auth, reads Supabase (tested separately)
 */

describe('POST /api/compliance/export', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 400 when framework is invalid', async () => {
    const { POST } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export', {
      method: 'POST',
      body: JSON.stringify({ framework: 'invalid_framework' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid framework');
  });

  it('returns 200 with reportId when framework is eu_ai_act', async () => {
    const { POST } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export', {
      method: 'POST',
      body: JSON.stringify({ framework: 'eu_ai_act' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reportId).toBeTruthy();
    expect(body.status).toBe('ready');
    expect(body.framework).toContain('eu_ai_act');
  });

  it('returns 200 when framework is all', async () => {
    const { POST } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export', {
      method: 'POST',
      body: JSON.stringify({ framework: 'all' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.frameworks.eu_ai_act).toBeTruthy();
    expect(body.data.frameworks.iso_42001).toBeTruthy();
    expect(body.data.frameworks.nist_rmf).toBeTruthy();
  });

  it('includes claimBoundary with certificationClaim:false', async () => {
    const { POST } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export', {
      method: 'POST',
      body: JSON.stringify({ framework: 'eu_ai_act' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.data.claimBoundary.certificationClaim).toBe(false);
    expect(body.data.claimBoundary.independentAuditClaim).toBe(false);
  });

  it('returns 500 when body is not JSON', async () => {
    const { POST } = await import('../../../app/api/compliance/export/route');
    const req = new Request('http://localhost/api/compliance/export', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe('GET /api/compliance-evidence-pack/annex4', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with JSON annex4 data by default', async () => {
    const { GET } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('returns HTML when format=html', async () => {
    const { GET } = await import('../../../app/api/compliance-evidence-pack/annex4/route');
    const req = new Request('http://localhost/api/compliance-evidence-pack/annex4?format=html');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<!DOCTYPE html');
  });
});

describe('GET /api/ccvs/evidence-chain', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with ok:true and requirements array', async () => {
    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.schema_version).toBe('1.0.0');
    expect(Array.isArray(body.requirements)).toBe(true);
    expect(body.requirements.length).toBeGreaterThan(0);
  });

  it('includes deployment and drift fields', async () => {
    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();
    const body = await res.json();
    expect(body.deployment).toHaveProperty('commit');
    expect(body.deployment).toHaveProperty('env');
    expect(body.drift).toHaveProperty('changed');
  });

  it('includes severity_table entries for all evidence levels', async () => {
    const { GET } = await import('../../../app/api/ccvs/evidence-chain/route');
    const res = await GET();
    const body = await res.json();
    expect(Array.isArray(body.severity_table)).toBe(true);
    const levels = body.severity_table.map((e: { severity_level: number }) => e.severity_level);
    expect(levels).toContain(1);
    expect(levels).toContain(2);
  });
});
