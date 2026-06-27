import { createClient } from '@supabase/supabase-js';

export function getAppBuilderDb() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVER_ENV_REQUIRED');
  }

  return createClient(url, key);
}

export function getDevSmokeAppBuilderContext(req: Request) {
  const workspaceId = req.headers.get('x-dsg-workspace-id');
  const actorId = req.headers.get('x-dsg-actor-id');

  if (!workspaceId) throw new Error('WORKSPACE_ID_REQUIRED');
  if (!actorId) throw new Error('ACTOR_ID_REQUIRED');

  return { workspaceId, actorId };
}
