import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('../../../lib/supabase/server', () => ({
  createClient: createClientMock,
}));

function mockReportRow(row: { claim_pass_eligible: boolean } | null, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  createClientMock.mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle })),
      })),
    })),
  });
}

async function getBadge(runId: string): Promise<{ status: number; contentType: string | null; cacheControl: string | null; body: string }> {
  const { GET } = await import('../../../app/api/delivery-proof/badge/[run_id]/route');
  const res = await GET(new Request(`http://localhost/api/delivery-proof/badge/${runId}`), {
    params: Promise.resolve({ run_id: runId }),
  });
  return {
    status: res.status,
    contentType: res.headers.get('Content-Type'),
    cacheControl: res.headers.get('Cache-Control'),
    body: await res.text(),
  };
}

describe('delivery proof badge route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders a green "evidence complete" badge for a passing report', async () => {
    mockReportRow({ claim_pass_eligible: true });
    const badge = await getBadge('dp-abc-123');

    expect(badge.status).toBe(200);
    expect(badge.contentType).toContain('image/svg+xml');
    expect(badge.body).toContain('<svg');
    expect(badge.body).toContain('evidence complete');
    expect(badge.body).toContain('#2ea44f');
  });

  it('renders a red "production blocked" badge for a failing report', async () => {
    mockReportRow({ claim_pass_eligible: false });
    const badge = await getBadge('dp-abc-456');

    expect(badge.status).toBe(200);
    expect(badge.body).toContain('production blocked');
    expect(badge.body).toContain('#d73a49');
  });

  it('renders a grey "unknown" badge when the run_id is not found', async () => {
    mockReportRow(null);
    const badge = await getBadge('dp-missing');

    expect(badge.status).toBe(200);
    expect(badge.body).toContain('unknown');
    expect(badge.body).toContain('#9f9f9f');
  });

  it('never 500s when Supabase is unavailable — falls back to unknown', async () => {
    createClientMock.mockRejectedValue(new Error('supabase down'));
    const badge = await getBadge('dp-any');

    expect(badge.status).toBe(200);
    expect(badge.body).toContain('unknown');
  });

  it('sets a public cache header', async () => {
    mockReportRow({ claim_pass_eligible: true });
    const badge = await getBadge('dp-abc-789');

    expect(badge.cacheControl).toContain('public');
    expect(badge.cacheControl).toContain('max-age=3600');
  });
});
