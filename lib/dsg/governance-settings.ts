import { getSupabaseAdmin } from '@/lib/supabase-server';

export type GovernanceMode = 'observe' | 'enforce';

export async function getGovernanceMode(orgId: string): Promise<GovernanceMode> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('dsg_governance_settings')
    .select('mode')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw new Error('GOVERNANCE_MODE_UNAVAILABLE');
  if (!data) return 'observe';
  return data.mode === 'enforce' ? 'enforce' : 'observe';
}

export async function setGovernanceMode(
  orgId: string,
  actorId: string,
  mode: GovernanceMode,
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from('dsg_governance_settings').upsert(
    {
      org_id: orgId,
      mode,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' },
  );

  if (error) throw new Error('GOVERNANCE_MODE_UPDATE_FAILED');
}
