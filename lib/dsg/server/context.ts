import { getBearerToken, getDsgSupabaseRpcConfig } from './supabase-rpc';

export type DsgServerActor = {
  actorId: string;
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'AUDITOR' | 'VIEWER';
};

export type DsgPermission =
  | 'job:read'
  | 'job:create'
  | 'job:plan'
  | 'job:control'
  | 'approval:write'
  | 'evidence:write'
  | 'audit:export'
  | 'replay:verify'
  | 'deployment:write'
  | 'production:write'
  | 'skill:read'
  | 'skill:execute'
  | 'read:generated-apps'
  | 'write:generated-apps';

const permissionsByRole: Record<DsgServerActor['role'], DsgPermission[]> = {
  OWNER: ['job:read', 'job:create', 'job:plan', 'job:control', 'approval:write', 'evidence:write', 'audit:export', 'replay:verify', 'deployment:write', 'production:write', 'skill:read', 'skill:execute', 'read:generated-apps', 'write:generated-apps'],
  ADMIN: ['job:read', 'job:create', 'job:plan', 'job:control', 'approval:write', 'evidence:write', 'audit:export', 'replay:verify', 'deployment:write', 'skill:read', 'skill:execute', 'read:generated-apps', 'write:generated-apps'],
  OPERATOR: ['job:read', 'job:create', 'job:plan', 'job:control', 'approval:write', 'evidence:write', 'replay:verify', 'skill:read', 'skill:execute', 'read:generated-apps', 'write:generated-apps'],
  AUDITOR: ['job:read', 'audit:export', 'replay:verify', 'skill:read', 'read:generated-apps'],
  VIEWER: ['job:read', 'skill:read', 'read:generated-apps'],
};

export function assertDsgPermission(actor: DsgServerActor | null, permission: DsgPermission): DsgServerActor {
  if (!actor) throw new Error('DSG_AUTH_REQUIRED');
  if (!actor.actorId || !actor.workspaceId) throw new Error('DSG_CONTEXT_REQUIRED');
  if (!permissionsByRole[actor.role]?.includes(permission)) throw new Error('DSG_PERMISSION_DENIED');
  return actor;
}

type SupabaseUserResponse = { id?: string; sub?: string };
type WorkspaceMemberRow = { role: DsgServerActor['role'] };

export async function resolveVerifiedDsgActor(headers: Headers): Promise<DsgServerActor | null> {
  const userAccessToken = getBearerToken(headers);
  const workspaceId = headers.get('x-dsg-workspace-id');
  if (!userAccessToken || !workspaceId) return null;

  const config = getDsgSupabaseRpcConfig(userAccessToken);
  const userResponse = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${userAccessToken}`,
    },
    cache: 'no-store',
  });

  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as SupabaseUserResponse;
  const actorId = user.id ?? user.sub;
  if (!actorId) return null;

  const memberUrl = new URL(`${config.url}/rest/v1/dsg_workspace_members`);
  memberUrl.searchParams.set('workspace_id', `eq.${workspaceId}`);
  memberUrl.searchParams.set('actor_id', `eq.${actorId}`);
  memberUrl.searchParams.set('select', 'role');
  memberUrl.searchParams.set('limit', '1');

  const memberResponse = await fetch(memberUrl, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!memberResponse.ok) return null;
  const rows = (await memberResponse.json()) as WorkspaceMemberRow[];
  const role = rows[0]?.role;
  if (!role || !Object.prototype.hasOwnProperty.call(permissionsByRole, role)) return null;

  return { actorId, workspaceId, role };
}

export async function requireVerifiedDsgActor(headers: Headers, permission: DsgPermission): Promise<DsgServerActor> {
  return assertDsgPermission(await resolveVerifiedDsgActor(headers), permission);
}

export function devHeaderActor(headers: Headers): DsgServerActor | null {
  if (process.env.DSG_ALLOW_DEV_HEADER_ACTOR !== 'true') return null;
  const actorId = headers.get('x-dsg-actor-id');
  const workspaceId = headers.get('x-dsg-workspace-id');
  const role = headers.get('x-dsg-actor-role') as DsgServerActor['role'] | null;
  if (!actorId || !workspaceId || !role) return null;
  if (!Object.prototype.hasOwnProperty.call(permissionsByRole, role)) return null;
  return { actorId, workspaceId, role };
}
