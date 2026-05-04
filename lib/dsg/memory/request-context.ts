import type { MemoryPermission } from './types';

export type MemoryRequestContext = {
  workspaceId: string;
  actorId: string;
  actorRole: string;
  actorPermissions: MemoryPermission[] | string[];
};

function headerText(request: Request, name: string): string {
  return request.headers.get(name)?.trim() ?? '';
}

export function parseMemoryPermissions(raw: string): string[] {
  return raw
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);
}

export function getGovernedMemoryRequestContext(request: Request): MemoryRequestContext {
  if (process.env.DSG_ALLOW_DEV_AUTH_HEADERS !== 'true') {
    throw new Error('DSG_DEV_AUTH_HEADERS_DISABLED');
  }

  const workspaceId = headerText(request, 'x-dsg-workspace-id');
  const actorId = headerText(request, 'x-dsg-actor-id');
  const actorRole = headerText(request, 'x-dsg-actor-role') || 'operator';
  const actorPermissions = parseMemoryPermissions(headerText(request, 'x-dsg-permissions'));

  if (!workspaceId) {
    throw new Error('WORKSPACE_ID_REQUIRED');
  }

  if (!actorId) {
    throw new Error('ACTOR_ID_REQUIRED');
  }

  if (actorPermissions.length === 0) {
    throw new Error('MEMORY_PERMISSIONS_REQUIRED');
  }

  return {
    workspaceId,
    actorId,
    actorRole,
    actorPermissions,
  };
}

export function requireMemoryPermission(
  context: MemoryRequestContext,
  permission: MemoryPermission,
): void {
  if (!context.actorPermissions.includes(permission)) {
    throw new Error(`MEMORY_PERMISSION_REQUIRED:${permission}`);
  }
}

export function memoryContextBoundary() {
  return {
    trustBoundary: 'development-header-context',
    productionReadyClaim: false,
    statement:
      'x-dsg-* headers are accepted only when DSG_ALLOW_DEV_AUTH_HEADERS=true. Production auth/RBAC wiring must replace this boundary before production claim.',
  };
}
