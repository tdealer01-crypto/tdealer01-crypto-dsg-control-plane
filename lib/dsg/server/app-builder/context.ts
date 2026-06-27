import { requireVerifiedDsgActor, type DsgPermission, type DsgServerActor } from '@/lib/dsg/server/context';

export type AppBuilderRequestContext = {
  workspaceId: string;
  actorId: string;
  actorRole: DsgServerActor['role'];
  permission: DsgPermission;
};

export async function getAppBuilderRequestContext(
  req: Request,
  permission: DsgPermission,
): Promise<AppBuilderRequestContext> {
  const actor = await requireVerifiedDsgActor(req.headers, permission);
  return {
    workspaceId: actor.workspaceId,
    actorId: actor.actorId,
    actorRole: actor.role,
    permission,
  };
}

export function getDevAppBuilderContext(): never {
  throw new Error('APP_BUILDER_DEV_HEADER_CONTEXT_REMOVED');
}
