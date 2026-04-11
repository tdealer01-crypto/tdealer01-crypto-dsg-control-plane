import { describe, expect, it } from 'vitest';

const EXPECTED_ERROR = 'finance_governance_server_store_removed_use_scoped_endpoints';

describe('finance governance server store routes', () => {
  it('blocks server store snapshot endpoint with deprecation metadata', async () => {
    const { GET } = await import('../../../app/api/finance-governance/server-store/state/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBe(EXPECTED_ERROR);
    expect(body.deprecated).toBe(true);
    expect(response.headers.get('x-deprecated')).toBe('true');
  });

  it('blocks submit endpoint', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/submit/route');
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBe(EXPECTED_ERROR);
  });

  it('blocks approve/reject/escalate/reset endpoints', async () => {
    const { POST: approve } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/approve/route');
    const { POST: reject } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/reject/route');
    const { POST: escalate } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/escalate/route');
    const { POST: reset } = await import('../../../app/api/finance-governance/server-store/reset/route');

    for (const call of [approve, reject, escalate, reset]) {
      const response = await call();
      const body = await response.json();
      expect(response.status).toBe(410);
      expect(body.error).toBe(EXPECTED_ERROR);
    }
  });
});
