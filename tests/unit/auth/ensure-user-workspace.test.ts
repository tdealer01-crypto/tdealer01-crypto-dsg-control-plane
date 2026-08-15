import { describe, expect, it, vi } from 'vitest';
import { ensureUserWorkspace } from '../../../lib/auth/ensure-user-workspace';

function singleResult(data: unknown, error: unknown = null) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

describe('ensureUserWorkspace', () => {
  it('fails closed for an existing inactive identity without calling bootstrap RPC', async () => {
    const rpc = vi.fn();
    const users = singleResult({
      id: 'user-row-1',
      auth_user_id: 'auth-user-1',
      email: 'inactive@example.com',
      org_id: null,
      is_active: false,
    });
    const admin = {
      rpc,
      from: vi.fn((table: string) => {
        expect(table).toBe('users');
        return users;
      }),
    };

    const result = await ensureUserWorkspace(admin, {
      authUserId: 'auth-user-1',
      email: 'inactive@example.com',
    });

    expect(result).toEqual({ ok: false, status: 403, error: 'ACCOUNT_INACTIVE' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns an existing active workspace without invoking bootstrap RPC', async () => {
    const rpc = vi.fn();
    const users = singleResult({
      id: 'user-row-1',
      auth_user_id: 'auth-user-1',
      email: 'active@example.com',
      org_id: 'org-1',
      is_active: true,
    });
    const admin = {
      rpc,
      from: vi.fn(() => users),
    };

    const result = await ensureUserWorkspace(admin, {
      authUserId: 'auth-user-1',
      email: 'active@example.com',
    });

    expect(result).toMatchObject({
      ok: true,
      bootstrapped: false,
      profile: { org_id: 'org-1', is_active: true },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts a new bootstrap only when the canonical parent organization exists', async () => {
    let userReads = 0;
    const rpc = vi.fn().mockResolvedValue({ data: '11111111-1111-4111-8111-111111111111', error: null });
    const firstUsers = singleResult(null);
    const secondUsers = singleResult({
      id: 'user-row-1',
      auth_user_id: 'auth-user-1',
      email: 'new@example.com',
      org_id: '11111111-1111-4111-8111-111111111111',
      is_active: true,
    });
    const organization = singleResult({ id: '11111111-1111-4111-8111-111111111111' });
    const admin = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') return userReads++ === 0 ? firstUsers : secondUsers;
        if (table === 'organizations') return organization;
        throw new Error(`unexpected table: ${table}`);
      }),
    };

    const result = await ensureUserWorkspace(admin, {
      authUserId: 'auth-user-1',
      email: 'new@example.com',
    });

    expect(result).toMatchObject({
      ok: true,
      bootstrapped: true,
      profile: {
        org_id: '11111111-1111-4111-8111-111111111111',
        is_active: true,
      },
    });
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('rejects bootstrap success claims when the parent organization is missing', async () => {
    let userReads = 0;
    const rpc = vi.fn().mockResolvedValue({ data: '11111111-1111-4111-8111-111111111111', error: null });
    const firstUsers = singleResult(null);
    const secondUsers = singleResult({
      id: 'user-row-1',
      auth_user_id: 'auth-user-1',
      email: 'new@example.com',
      org_id: '11111111-1111-4111-8111-111111111111',
      is_active: true,
    });
    const organization = singleResult(null);
    const admin = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === 'users') return userReads++ === 0 ? firstUsers : secondUsers;
        if (table === 'organizations') return organization;
        throw new Error(`unexpected table: ${table}`);
      }),
    };

    const result = await ensureUserWorkspace(admin, {
      authUserId: 'auth-user-1',
      email: 'new@example.com',
    });

    expect(result).toMatchObject({
      ok: false,
      status: 500,
    });
    if (result.ok === false) {
      expect(result.error).toContain('workspace_bootstrap_missing_organization');
    }
  });

  it('maps database ACCOUNT_INACTIVE protection to a 403 response', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'ACCOUNT_INACTIVE' },
    });
    const users = singleResult(null);
    const admin = {
      rpc,
      from: vi.fn(() => users),
    };

    const result = await ensureUserWorkspace(admin, {
      authUserId: 'auth-user-1',
      email: 'race@example.com',
    });

    expect(result).toEqual({ ok: false, status: 403, error: 'ACCOUNT_INACTIVE' });
  });
});
