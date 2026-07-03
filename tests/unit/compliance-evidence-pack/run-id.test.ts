import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();
const requireActiveProfileMock = vi.fn();
const checkEntitlementMock = vi.fn();

vi.mock('../../../lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('../../../lib/auth/require-active-profile', () => ({
  requireActiveProfile: requireActiveProfileMock,
}));

vi.mock('../../../lib/delivery-proof/entitlement', () => ({
  checkDeliveryProofEntitlement: checkEntitlementMock,
}));

function mockReport(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  createClientMock.mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  });
}

async function getPack(query = ''): Promise<{ status: number; body: string }> {
  const { GET } = await import('../../../app/api/compliance-evidence-pack/route');
  const res = await GET(new Request(`http://localhost/api/compliance-evidence-pack${query}`));
  return { status: res.status, body: await res.text() };
}

const SAMPLE_REPORT = {
  run_id: 'dp-test-1',
  claim_pass_eligible: true,
  requirements_pass: 4,
  requirements_total: 4,
  last_ci_run: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  matrix_json: {
    production_url: 'https://customer.example.com',
    checks: [
      { name: 'Homepage', status: 'pass', detail: 'HTTP 200 — ok' },
      { name: 'Readiness endpoint', status: 'pass', detail: 'HTTP 200 — ok' },
    ],
  },
};

describe('compliance evidence pack — per-customer run_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('without run_id renders the static pack unchanged (no customer section)', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: false });
    const pack = await getPack();

    expect(pack.status).toBe(200);
    expect(pack.body).toContain('AI Governance Compliance Evidence Pack');
    expect(pack.body).toContain('certificationClaim = false');
    expect(pack.body).not.toContain('Customer Deployment Evidence');
  });

  it('with run_id and paid entitlement embeds the customer evidence section', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: true, orgId: 'org-1' });
    checkEntitlementMock.mockResolvedValue({ allowed: true, tier: 'business', scansRemaining: null });
    mockReport(SAMPLE_REPORT);

    const pack = await getPack('?run_id=dp-test-1');

    expect(pack.body).toContain('Customer Deployment Evidence');
    expect(pack.body).toContain('dp-test-1');
    expect(pack.body).toContain('https://customer.example.com');
    expect(pack.body).toContain('EVIDENCE COMPLETE');
    expect(pack.body).toContain('Homepage');
  });

  it('with run_id but free tier shows the upgrade banner, not the evidence', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: true, orgId: 'org-2' });
    checkEntitlementMock.mockResolvedValue({ allowed: true, tier: 'free', scansRemaining: 1 });

    const pack = await getPack('?run_id=dp-test-2');

    expect(pack.body).toContain('Upgrade Required');
    expect(pack.body).not.toContain('section-title">Customer Deployment Evidence');
    expect(pack.body).toContain('/delivery-proof');
  });

  it('with run_id, unauthenticated → upgrade banner and static pack intact', async () => {
    requireActiveProfileMock.mockRejectedValue(new Error('no session'));

    const pack = await getPack('?run_id=dp-test-3');

    expect(pack.status).toBe(200);
    expect(pack.body).toContain('Upgrade Required');
    expect(pack.body).toContain('certificationClaim = false');
  });

  it('escapes HTML in run_id to prevent injection', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: false });

    const pack = await getPack('?run_id=%3Cscript%3Ealert(1)%3C/script%3E');

    expect(pack.body).not.toContain('<script>alert(1)</script>');
  });

  it('paid tier with unknown run_id shows run-not-found note, never 500', async () => {
    requireActiveProfileMock.mockResolvedValue({ ok: true, orgId: 'org-3' });
    checkEntitlementMock.mockResolvedValue({ allowed: true, tier: 'pro', scansRemaining: 5 });
    mockReport(null);

    const pack = await getPack('?run_id=dp-missing');

    expect(pack.status).toBe(200);
    expect(pack.body).toContain('Run Not Found');
  });
});
