import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { middleware } from '../../middleware';
import { NextRequest } from 'next/server';

function makeRequest(pathname: string, options: { method?: string; nextParam?: string } = {}) {
  const { method = 'GET', nextParam } = options;
  const search = nextParam ? `?next=${encodeURIComponent(nextParam)}` : '';
  const url = `http://localhost${pathname}${search}`;
  return new NextRequest(url, { method });
}

const SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_KEY = 'anon-key-123';

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_KEY;
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  vi.clearAllMocks();
});

describe('middleware — protected path detection', () => {
  it('passes through unauthenticated request on public path (/about)', async () => {
    const res = await middleware(makeRequest('/about'));
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated user from /dashboard to /login?next=', async () => {
    const res = await middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=');
    expect(location).toContain(encodeURIComponent('/dashboard'));
  });

  it('redirects unauthenticated user from /approvals/123 to /login?next=', async () => {
    const res = await middleware(makeRequest('/approvals/123'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('next=');
  });

  it('redirects unauthenticated user from /gateway/monitor to /login?next=', async () => {
    const res = await middleware(makeRequest('/gateway/monitor'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('next=');
  });

  it('passes through authenticated user on /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = await middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(200);
  });
});

describe('middleware — OPTIONS passthrough', () => {
  it('passes through OPTIONS request to /api/* without calling Supabase', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    const mockCreate = vi.mocked(createServerClient);
    mockCreate.mockClear();

    const res = await middleware(makeRequest('/api/billing/checkout', { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('middleware — missing Supabase config', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it('returns 503 for protected path /dashboard when config is missing', async () => {
    const res = await middleware(makeRequest('/dashboard'));
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).toContain('unavailable');
  });

  it('redirects /app-shell to /login?next=/app-shell when config is missing', async () => {
    const res = await middleware(makeRequest('/app-shell'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login');
    expect(location).toContain('next=');
    expect(location).toContain(encodeURIComponent('/app-shell'));
  });

  it('passes through public path /blog when config is missing', async () => {
    const res = await middleware(makeRequest('/blog'));
    expect(res.status).toBe(200);
  });
});

describe('middleware — /login redirect for authenticated users', () => {
  it('redirects authenticated user from /login to /dashboard/executions (default)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = await middleware(makeRequest('/login'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/dashboard/executions');
  });

  it('redirects authenticated user from /login?next=/approvals to /approvals', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = await middleware(makeRequest('/login', { nextParam: '/approvals' }));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/approvals');
  });

  it('does not redirect unauthenticated user from /login', async () => {
    const res = await middleware(makeRequest('/login'));
    expect(res.status).toBe(200);
  });
});
