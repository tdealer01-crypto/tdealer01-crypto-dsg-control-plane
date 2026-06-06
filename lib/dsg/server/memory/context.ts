export type DsgMemoryRequestContext = {
  workspaceId: string;
  actorId: string;
  actorRole: string;
  permissions: string[];
};

function isDevHeaderGateEnabled(): boolean {
  return process.env.DSG_ALLOW_DEV_AUTH_HEADERS?.trim().toLowerCase() === 'true';
}

export function memoryBoundary() {
  return {
    productionReadyClaim: false,
    claimStatus: 'DEV_ROUTE_SMOKE_ONLY',
    memoryMayOverrideEvidence: false,
    trustBoundary: 'development-header-context',
    note: 'Governed memory is a context candidate only. It cannot override current evidence, audit, database state, or runtime observations.',
  } as const;
}

export function getDevMemoryContext(req: Request, requiredPermissions: string[]): DsgMemoryRequestContext {
  if (!isDevHeaderGateEnabled()) {
    throw new Error('DSG_DEV_AUTH_HEADERS_DISABLED');
  }

  const workspaceId = req.headers.get('x-dsg-workspace-id')?.trim();
  const actorId = req.headers.get('x-dsg-actor-id')?.trim();
  const actorRole = req.headers.get('x-dsg-actor-role')?.trim() || 'operator';
  const permissions = (req.headers.get('x-dsg-permissions') || '')
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);

  if (!workspaceId) throw new Error('WORKSPACE_ID_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');

  for (const permission of requiredPermissions) {
    if (!permissions.includes(permission)) throw new Error(`MEMORY_PERMISSION_REQUIRED:${permission}`);
  }

  return { workspaceId, actorId, actorRole, permissions };
}
