import { getSupabaseAdmin } from '../supabase-server';
import type { Json } from '../database.types';

export async function getDirectorySyncConfig(orgId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('directory_sync_configs').select('org_id, provider, is_enabled, group_sync_enabled, metadata').eq('org_id', orgId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function logDirectorySyncEvent(input: {
  orgId: string;
  eventType: 'jit_provision' | 'jit_update' | 'group_mapping_applied' | 'sync_error';
  email?: string | null;
  externalUserId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  await admin.from('directory_sync_events').insert({
    org_id: input.orgId,
    event_type: input.eventType,
    email: input.email ?? null,
    external_user_id: input.externalUserId ?? null,
    payload: (input.payload ?? {}) as Json,
  });
}
