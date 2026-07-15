import { requireOrgRole } from './authz';
import { requireInternalService } from './auth/internal-service';
import { RuntimeRouteRoles } from './runtime/permissions';

export type RuntimeAccessResult =
  | {
      ok: true;
      orgId: string;
      userId?: string;
      grantedRoles: string[];
      actorType: 'user' | 'internal_service';
      agentId?: string;
      workspaceId?: string;
      executionId?: string;
      status?: number;
      error?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function requireRuntimeAccess(
  req: Request,
  routeKey: keyof typeof RuntimeRouteRoles,
): Promise<RuntimeAccessResult> {
  const internal = requireInternalService(req);

  if (internal.ok) {
    return {
      ok: true,
      orgId: internal.orgId,
      grantedRoles: RuntimeRouteRoles[routeKey],
      actorType: 'internal_service',
      agentId: internal.agentId,
      workspaceId: internal.workspaceId,
      executionId: internal.executionId,
    };
  }

  const session = await requireOrgRole(RuntimeRouteRoles[routeKey]);
  if (!session.ok) {
    return { ok: false, status: session.status, error: session.error };
  }

  return {
    ok: true,
    orgId: session.orgId,
    userId: session.userId,
    grantedRoles: session.grantedRoles,
    actorType: 'user',
  };
}
