import { createClient } from '@supabase/supabase-js';
import { requireInternalService } from '../../auth/internal-service';

export function getAppBuilderDb() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVER_ENV_REQUIRED');
  }

  return createClient(url, key);
}

/**
 * Resolves workspaceId/actorId from a verified internal-service Bearer
 * token, not from caller-supplied headers directly — getAppBuilderDb() uses
 * SUPABASE_SERVICE_ROLE_KEY (full RLS bypass), so trusting an unauthenticated
 * x-dsg-workspace-id header here would let any caller read/write any
 * workspace's app-builder jobs.
 */
export function getAuthorizedAppBuilderContext(req: Request) {
  const access = requireInternalService(req);
  if (!access.ok) {
    const failure = access as any;
    throw new Error(failure.error);
  }

  const workspaceId = access.workspaceId;
  const actorId = access.agentId ?? access.service;

  if (!workspaceId) throw new Error('WORKSPACE_ID_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');

  return { workspaceId, actorId };
}
