import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalServiceIdentity, InternalServiceFailure } from '../../lib/auth/internal-service';

const requireInternalServiceMock = vi.fn<[Request], InternalServiceIdentity | InternalServiceFailure>();
const requireOrgRoleMock = vi.fn();

vi.mock('../../lib/auth/internal-service', () => ({
  requireInternalService: requireInternalServiceMock,
}));

vi.mock('../../lib/authz', () => ({
  requireOrgRole: requireOrgRoleMock,
}));

vi.mock('../../lib/runtime/permissions', () => ({
  RuntimeRouteRoles: {
    execute: ['operator', 'org_admin'],
    checkpoint: ['runtime_auditor', 'org_admin'],
  },
}));

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/execute', { headers });
}

describe('requireRuntimeAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants access as internal_service when token is valid', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: true,
      orgId: 'org-1',
      service: 'agent-governance-v3',
      actorType: 'internal_service',
      agentId: 'agent-1',
      workspaceId: 'ws-1',
      executionId: 'exec-1',
    });

    const { requireRuntimeAccess } = await import('../../lib/authz-runtime');
    const result = await requireRuntimeAccess(makeRequest(), 'execute');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorType).toBe('internal_service');
      expect(result.orgId).toBe('org-1');
      expect(result.agentId).toBe('agent-1');
      expect(result.workspaceId).toBe('ws-1');
      expect(result.executionId).toBe('exec-1');
      expect(result.grantedRoles).toEqual(['operator', 'org_admin']);
    }
  });

  it('does not call requireOrgRole when internal service auth succeeds', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: true,
      orgId: 'org-1',
      service: 'svc',
      actorType: 'internal_service',
    });

    const { requireRuntimeAccess } = await import('../../lib/authz-runtime');
    await requireRuntimeAccess(makeRequest(), 'execute');

    expect(requireOrgRoleMock).not.toHaveBeenCalled();
  });

  it('falls back to user session when internal service auth fails', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });
    requireOrgRoleMock.mockResolvedValue({
      ok: true,
      orgId: 'org-2',
      userId: 'user-1',
      grantedRoles: ['operator', 'org_admin'],
    });

    const { requireRuntimeAccess } = await import('../../lib/authz-runtime');
    const result = await requireRuntimeAccess(makeRequest(), 'execute');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorType).toBe('user');
      expect(result.orgId).toBe('org-2');
      expect(result.userId).toBe('user-1');
      expect(result.grantedRoles).toEqual(['operator', 'org_admin']);
    }
  });

  it('returns forbidden when user session check also fails', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });
    requireOrgRoleMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Forbidden',
    });

    const { requireRuntimeAccess } = await import('../../lib/authz-runtime');
    const result = await requireRuntimeAccess(makeRequest(), 'execute');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toBe('Forbidden');
    }
  });

  it('passes the required roles for the given routeKey to requireOrgRole', async () => {
    requireInternalServiceMock.mockReturnValue({
      ok: false,
      status: 401,
      error: 'unauthorized_internal_service',
    });
    requireOrgRoleMock.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });

    const { requireRuntimeAccess } = await import('../../lib/authz-runtime');
    const req = makeRequest();
    await requireRuntimeAccess(req, 'checkpoint');

    expect(requireOrgRoleMock).toHaveBeenCalledWith(['runtime_auditor', 'org_admin'], req);
  });
});
