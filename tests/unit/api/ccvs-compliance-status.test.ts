import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── In-memory mock store shared across all tests ──────────────────────────────
const db = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    reset() { rows.length = 0; },
    upsert(row: Record<string, unknown>) {
      const idx = rows.findIndex(r => r.run_id === (row as { run_id: string }).run_id);
      if (idx >= 0) rows[idx] = row; else rows.push(row);
    },
    latest(): Record<string, unknown> | null { return rows[rows.length - 1] ?? null; },
    byRunId(id: string): Record<string, unknown> | null {
      return rows.find(r => (r as { run_id: string }).run_id === id) ?? null;
    },
  };
});

vi.mock('../../../lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => ({
            single: async () => {
              const row = db.latest();
              if (!row) return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
              return { data: row, error: null };
            },
          }),
        }),
        eq: (_col: string, val: string) => ({
          single: async () => {
            const row = db.byRunId(val);
            if (!row) return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
            return { data: row, error: null };
          },
        }),
      }),
      upsert: async (row: Record<string, unknown>) => {
        db.upsert(row);
        return { error: null };
      },
    }),
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/ccvs/compliance-status', () => {
  beforeEach(() => {
    db.reset();
    vi.resetModules();
  });

  it('returns ok:true with null claim_pass_eligible on fresh cold start', async () => {
    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const res = await GET();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.schema_version).toBe('1.0.0');
    expect(body.claim_pass_eligible).toBeNull();
    expect(body.last_ci_run).toBeNull();
    expect(body.mutation_score).toBeNull();
    expect(body.shield.label).toBe('CCVS');
    expect(body.shield.message).toBe('pending');
    expect(body.shield.color).toBe('lightgrey');
    expect(body.requirements_total).toBeGreaterThan(0);
  });

  it('includes deployment fields', async () => {
    const { GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const res = await GET();
    const body = await res.json();
    expect(body.deployment).toHaveProperty('env');
    expect(body.deployment).toHaveProperty('policy_version');
    expect(body.deployment).toHaveProperty('commit');
  });
});

describe('POST /api/ccvs/compliance-status', () => {
  beforeEach(() => {
    db.reset();
    vi.resetModules();
  });

  function makeMatrix(eligible: boolean) {
    return {
      schema_version: '1.0.0' as const,
      generated_at: new Date().toISOString(),
      policy_version: 'v1',
      rows: [],
      summary: {
        total: 9,
        pass: eligible ? 9 : 8,
        fail: eligible ? 0 : 1,
        pending: 0,
        not_verified: 0,
        claim_pass_eligible: eligible,
      },
    };
  }

  it('returns 400 when body is not JSON', async () => {
    const { POST } = await import('../../../app/api/ccvs/compliance-status/route');
    const req = new Request('http://localhost/api/ccvs/compliance-status', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('returns 400 when matrix is missing', async () => {
    const { POST } = await import('../../../app/api/ccvs/compliance-status/route');
    const req = new Request('http://localhost/api/ccvs/compliance-status', {
      method: 'POST',
      body: JSON.stringify({ run_id: 'run-1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when run_id is missing', async () => {
    const { POST } = await import('../../../app/api/ccvs/compliance-status/route');
    const req = new Request('http://localhost/api/ccvs/compliance-status', {
      method: 'POST',
      body: JSON.stringify({ matrix: makeMatrix(true) }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('accepts valid matrix and updates claim_pass_eligible', async () => {
    const { POST, GET } = await import('../../../app/api/ccvs/compliance-status/route');
    const matrix = makeMatrix(true);

    const postReq = new Request('http://localhost/api/ccvs/compliance-status', {
      method: 'POST',
      body: JSON.stringify({ matrix, run_id: 'ci-run-123', mutation_score: 72.08 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.ok).toBe(true);
    expect(postBody.claim_pass_eligible).toBe(true);
    expect(postBody.shield.color).toBe('brightgreen');

    const getRes = await GET();
    const getBody = await getRes.json();
    expect(getBody.claim_pass_eligible).toBe(true);
    expect(getBody.mutation_score).toBe(72.08);
    expect(getBody.run_id).toBe('ci-run-123');
    expect(getBody.shield.message).toBe('eligible');
  });

  it('sets shield to red when claim_pass_eligible is false', async () => {
    const { POST } = await import('../../../app/api/ccvs/compliance-status/route');
    const matrix = makeMatrix(false);
    const req = new Request('http://localhost/api/ccvs/compliance-status', {
      method: 'POST',
      body: JSON.stringify({ matrix, run_id: 'ci-run-fail' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.claim_pass_eligible).toBe(false);
    expect(body.shield.color).toBe('red');
    expect(body.shield.message).toBe('not eligible');
  });
});
