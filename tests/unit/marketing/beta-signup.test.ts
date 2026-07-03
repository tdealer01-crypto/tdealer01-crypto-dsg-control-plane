import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdminMock = vi.fn();
const sendLeadWelcomeMock = vi.fn(async () => undefined);

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock('../../../lib/email/sales', () => ({
  sendLeadWelcome: sendLeadWelcomeMock,
}));

function mockInsert(result: { error: { code?: string; message?: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result);
  getSupabaseAdminMock.mockReturnValue({
    from: vi.fn(() => ({ insert })),
  });
  return insert;
}

async function post(body: unknown): Promise<{ status: number; json: any }> {
  const { POST } = await import('../../../app/api/beta-signup/route');
  const req = new Request('http://localhost/api/beta-signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const res = await POST(req as any);
  return { status: res.status, json: await res.json() };
}

describe('beta-signup route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('persists a valid signup to the leads table and sends welcome email', async () => {
    const insert = mockInsert({ error: null });

    const res = await post({ email: 'founder@example.com', companyName: 'Acme', source: 'producthunt' });

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.persisted).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row.email).toBe('founder@example.com');
    expect(row.source).toBe('beta-signup');
    expect(row.company).toBe('Acme');
    expect(sendLeadWelcomeMock).toHaveBeenCalledWith('founder@example.com');
  });

  it('treats duplicate email (23505) as success', async () => {
    mockInsert({ error: { code: '23505', message: 'duplicate key' } });

    const res = await post({ email: 'again@example.com' });

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.message).toContain('already on the list');
  });

  it('still returns success when Supabase is unavailable', async () => {
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error('supabase down');
    });

    const res = await post({ email: 'resilient@example.com' });

    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.persisted).toBe(false);
  });

  it('rejects invalid email with 400 and does not touch the DB', async () => {
    const insert = mockInsert({ error: null });

    const res = await post({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
    expect(sendLeadWelcomeMock).not.toHaveBeenCalled();
  });

  it('GET reports existing lead from the leads table', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'lead-1' }, error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    });

    const { GET } = await import('../../../app/api/beta-signup/route');
    const req = new Request('http://localhost/api/beta-signup?email=founder@example.com');
    Object.defineProperty(req, 'nextUrl', { value: new URL(req.url) });
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.exists).toBe(true);
  });
});
