import { describe, expect, it } from 'vitest';

import {
  getGovernedMemoryRequestContext,
  parseMemoryPermissions,
  requireMemoryPermission,
} from '../../lib/dsg/memory/request-context';

function request(headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/dsg/memory/search', {
    headers,
  });
}

describe('governed memory request context', () => {
  it('parses comma-separated permissions', () => {
    expect(parseMemoryPermissions('memory:read, memory:write,,memory:gate')).toEqual([
      'memory:read',
      'memory:write',
      'memory:gate',
    ]);
  });

  it('blocks dev auth headers unless explicitly enabled', () => {
    const previous = process.env.DSG_ALLOW_DEV_AUTH_HEADERS;
    process.env.DSG_ALLOW_DEV_AUTH_HEADERS = 'false';

    expect(() =>
      getGovernedMemoryRequestContext(
        request({
          'x-dsg-workspace-id': 'workspace-1',
          'x-dsg-actor-id': 'actor-1',
          'x-dsg-permissions': 'memory:read',
        }),
      ),
    ).toThrow('DSG_DEV_AUTH_HEADERS_DISABLED');

    process.env.DSG_ALLOW_DEV_AUTH_HEADERS = previous;
  });

  it('requires workspace, actor, and permissions', () => {
    const previous = process.env.DSG_ALLOW_DEV_AUTH_HEADERS;
    process.env.DSG_ALLOW_DEV_AUTH_HEADERS = 'true';

    expect(() => getGovernedMemoryRequestContext(request())).toThrow('WORKSPACE_ID_REQUIRED');
    expect(() =>
      getGovernedMemoryRequestContext(
        request({
          'x-dsg-workspace-id': 'workspace-1',
        }),
      ),
    ).toThrow('ACTOR_ID_REQUIRED');
    expect(() =>
      getGovernedMemoryRequestContext(
        request({
          'x-dsg-workspace-id': 'workspace-1',
          'x-dsg-actor-id': 'actor-1',
        }),
      ),
    ).toThrow('MEMORY_PERMISSIONS_REQUIRED');

    process.env.DSG_ALLOW_DEV_AUTH_HEADERS = previous;
  });

  it('enforces required memory permission', () => {
    const context = {
      workspaceId: 'workspace-1',
      actorId: 'actor-1',
      actorRole: 'operator',
      actorPermissions: ['memory:read'],
    };

    expect(() => requireMemoryPermission(context, 'memory:read')).not.toThrow();
    expect(() => requireMemoryPermission(context, 'memory:write')).toThrow(
      'MEMORY_PERMISSION_REQUIRED:memory:write',
    );
  });
});
