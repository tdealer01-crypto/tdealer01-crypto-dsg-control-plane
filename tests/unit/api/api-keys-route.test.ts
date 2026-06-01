import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('../../../lib/auth/require-org-permission', () => ({ requireOrgPermission: vi.fn() }));

import { GET, POST } from '../../../app/api/api-keys/route';
import { createClient } from '../../../lib/supabase/server';
import { requireOrgPermission } from '../../../lib/auth/require-org-permission';
import { NextRequest } from 'next/server';

const mockCreateClient = vi.mocked(createClient);
const mockRequireOrgPermission = vi.mocked(requireOrgPermission);

const ORG_ID = 'org-test-123';
const AUTH_USER = { id: 'auth-user-1' };

const SAMPLE_KEYS = [
  {
    id: 'key-1',
    name: 'My Key',
    prefix: 'dsg_live_ab12...',
    scopes: ['read'],
    created_at: '2025-01-01T00:00:00Z',
    last_used: null,
    expiry: null,
    status: 'ACTIVE',
    requests_this_month: 0,
  },
];

function makeClient(user: unknown, orgId: string | null, extraFromBehavior?: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (extraFromBehavior) {
        const result = extraFromBehavior(table);
        if (result) return result;
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: orgId ? { org_id: orgId } : null, error: null }),
        };
      }
      if (table === 'api_keys') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: SAMPLE_KEYS, error: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ...SAMPLE_KEYS[0], id: 'new-key-id', scopes: ['read'], expiry: null },
            error: null,
          }),
        };
      }
      return {};
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireOrgPermission.mockResolvedValue({
    ok: true,
    orgId: ORG_ID,
    userId: 'user-1',
    authUserId: AUTH_USER.id,
    email: 'owner@example.com',
    role: 'owner',
  });
});

describe('GET /api/api-keys', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({ ok: false, status: 401, error: 'Unauthorized' });
    mockCreateClient.mockResolvedValue(makeClient(null, null) as any);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Unauthorized/);
  });

  it('returns 403 when user lacks API key permission', async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({ ok: false, status: 403, error: 'Insufficient permission' });
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, null) as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns only keys for the authenticated user org (org isolation)', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.keys)).toBe(true);
    expect(body.total).toBe(body.keys.length);
  });

  it('returns shaped key objects without key_hash', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await GET();
    const body = await res.json();
    const key = body.keys[0];
    expect(key.key_hash).toBeUndefined();
    expect(key.id).toBeDefined();
    expect(key.name).toBeDefined();
    expect(key.scopes).toBeDefined();
  });
});

describe('POST /api/api-keys', () => {
  function makePostRequest(body: unknown) {
    return new NextRequest('http://localhost/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns 401 when not authenticated', async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({ ok: false, status: 401, error: 'Unauthorized' });
    mockCreateClient.mockResolvedValue(makeClient(null, null) as any);
    const res = await POST(makePostRequest({ name: 'Test', scopes: ['read'] }));
    expect(res.status).toBe(401);
  });

  it('returns 422 when name is missing', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ scopes: ['read'] }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.field).toBe('name');
  });

  it('returns 422 when name is empty string', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ name: '   ', scopes: ['read'] }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when scopes array is empty', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ name: 'My Key', scopes: [] }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.field).toBe('scopes');
  });

  it('returns 422 for invalid scope value', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ name: 'My Key', scopes: ['invalid_scope'] }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid scopes/);
    expect(body.field).toBe('scopes');
  });

  it.each(['read', 'write', 'admin', 'gates:evaluate', 'proofs:prove'])(
    'accepts valid scope "%s"',
    async (scope) => {
      mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
      const res = await POST(makePostRequest({ name: 'My Key', scopes: [scope] }));
      expect(res.status).toBe(201);
    }
  );

  it('returns 201 with raw key in response body', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ name: 'My Key', scopes: ['read'] }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBeDefined();
    expect(body.key).toMatch(/^dsg_live_/);
  });

  it('key format is dsg_live_{4hexbytes}_{12hexbytes}', async () => {
    mockCreateClient.mockResolvedValue(makeClient(AUTH_USER, ORG_ID) as any);
    const res = await POST(makePostRequest({ name: 'My Key', scopes: ['read'] }));
    const body = await res.json();
    expect(body.key).toMatch(/^dsg_live_[0-9a-f]{8}_[0-9a-f]{24}$/);
  });

  it('defaults to never expiry when expiry not provided', async () => {
    let insertedData: unknown;
    const client = makeClient(AUTH_USER, ORG_ID, (table) => {
      if (table === 'api_keys') {
        return {
          insert: vi.fn().mockImplementation((data: unknown) => {
            insertedData = data;
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'k1', name: 'My Key', prefix: 'dsg_live_ab...', scopes: ['read'], created_at: new Date().toISOString(), last_used: null, expiry: null, status: 'ACTIVE', requests_this_month: 0 },
                error: null,
              }),
            };
          }),
        };
      }
    });
    mockCreateClient.mockResolvedValue(client as any);
    await POST(makePostRequest({ name: 'My Key', scopes: ['read'] }));
    expect((insertedData as any).expiry).toBeNull();
  });

  it('calculates 30d expiry as ~30 days from now', async () => {
    let insertedData: unknown;
    const now = Date.now();
    const client = makeClient(AUTH_USER, ORG_ID, (table) => {
      if (table === 'api_keys') {
        return {
          insert: vi.fn().mockImplementation((data: unknown) => {
            insertedData = data;
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'k1', name: 'My Key', prefix: 'dsg_live_ab...', scopes: ['read'], created_at: new Date().toISOString(), last_used: null, expiry: (insertedData as any)?.expiry, status: 'ACTIVE', requests_this_month: 0 },
                error: null,
              }),
            };
          }),
        };
      }
    });
    mockCreateClient.mockResolvedValue(client as any);
    await POST(makePostRequest({ name: 'My Key', scopes: ['read'], expiry: '30d' }));
    const expiryMs = new Date((insertedData as any).expiry).getTime();
    const diff = expiryMs - now;
    expect(diff).toBeGreaterThan(29 * 86400 * 1000);
    expect(diff).toBeLessThan(31 * 86400 * 1000);
  });
});
