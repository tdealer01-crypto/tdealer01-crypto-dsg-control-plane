import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../../../lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('../../../lib/auth/require-org-permission', () => ({ requireOrgPermission: vi.fn() }));

import { GET, POST } from '../../../app/api/team/route';
import { createClient } from '../../../lib/supabase/server';
import { requireOrgPermission } from '../../../lib/auth/require-org-permission';

const mockCreateClient = vi.mocked(createClient);
const mockRequireOrgPermission = vi.mocked(requireOrgPermission);

const ORG_ID = 'org-test-123';
const AUTH_USER = { id: 'auth-user-1' };
const NEW_USER = {
  id: 'user-new-1',
  email: 'new.member@example.com',
  created_at: '2026-06-20T00:00:00.000Z',
};

type TeamClientOptions = {
  user?: unknown;
  orgId?: string | null;
  membersError?: { message: string } | null;
  existingUser?: { id: string } | null;
  userInsertError?: { message: string } | null;
  roleInsertError?: { message: string } | null;
};

function makeTeamClient(options: TeamClientOptions = {}) {
  const {
    user = AUTH_USER,
    orgId = ORG_ID,
    membersError = null,
    existingUser = null,
    userInsertError = null,
    roleInsertError = null,
  } = options;

  const members = [
    {
      id: 'user-1',
      email: 'admin.user@example.com',
      role: 'VIEWER',
      is_active: true,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
      user_org_roles: [{ role: 'ADMIN' }],
    },
  ];

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn((columns?: string) => {
            if (columns === 'org_id') {
              return {
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: orgId ? { org_id: orgId } : null, error: null }),
              };
            }

            return {
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: members, error: membersError }),
              ilike: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: existingUser, error: null }),
            };
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: userInsertError ? null : NEW_USER,
              error: userInsertError,
            }),
          }),
        };
      }

      if (table === 'user_org_roles') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: roleInsertError }),
        };
      }

      return {};
    }),
  };
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/team', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
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

describe('GET /api/team', () => {
  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient({ user: null }) as any);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' });
  });

  it('returns shaped members for the authenticated org', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient() as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.members[0]).toMatchObject({
      id: 'user-1',
      name: 'admin user',
      email: 'admin.user@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
  });
});

describe('POST /api/team', () => {
  it('returns 403 when user lacks invite permission', async () => {
    mockRequireOrgPermission.mockResolvedValueOnce({ ok: false, status: 403, error: 'Insufficient permission' });
    mockCreateClient.mockResolvedValue(makeTeamClient() as any);

    const res = await POST(makePostRequest({ email: 'new.member@example.com', role: 'VIEWER' }));

    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid email', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient() as any);

    const res = await POST(makePostRequest({ email: 'not-an-email', role: 'VIEWER' }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.field).toBe('email');
  });

  it('returns 422 when inviting an OWNER role', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient() as any);

    const res = await POST(makePostRequest({ email: 'new.member@example.com', role: 'OWNER' }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.field).toBe('role');
  });

  it('returns 409 for duplicate team member email', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient({ existingUser: { id: 'existing-user' } }) as any);

    const res = await POST(makePostRequest({ email: 'new.member@example.com', role: 'VIEWER' }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.field).toBe('email');
  });

  it('returns 500 when org role assignment fails after user insert', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient({ roleInsertError: { message: 'role insert failed' } }) as any);

    const res = await POST(makePostRequest({ email: 'new.member@example.com', role: 'VIEWER' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to assign organization role');
  });

  it('returns 201 for a valid invite and assigns a non-owner org role', async () => {
    mockCreateClient.mockResolvedValue(makeTeamClient() as any);

    const res = await POST(makePostRequest({ email: 'new.member@example.com', role: 'VIEWER' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      id: NEW_USER.id,
      name: 'new member',
      email: NEW_USER.email,
      role: 'VIEWER',
      status: 'PENDING',
    });
  });
});
