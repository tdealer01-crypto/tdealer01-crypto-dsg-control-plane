import { getSupabaseAdmin } from '../supabase-server';

export type Milestone =
  | 'agent_connected'
  | 'first_execution'
  | 'first_block'
  | 'team_invited'
  | 'integration_connected';

export async function recordMilestone(
  orgId: string,
  milestone: Milestone,
  opts: { email?: string; metadata?: Record<string, unknown> } = {},
): Promise<{ isNew: boolean }> {
  const admin = getSupabaseAdmin();
  const { data: existing } = await (admin as any)
    .from('user_milestones')
    .select('id')
    .eq('org_id', orgId)
    .eq('milestone', milestone)
    .maybeSingle();

  if (existing) return { isNew: false };

  await (admin as any).from('user_milestones').insert({
    org_id: orgId,
    email: opts.email ?? null,
    milestone,
    metadata: opts.metadata ?? {},
  }).catch(() => null);

  return { isNew: true };
}

export async function getMilestones(orgId: string): Promise<Set<Milestone>> {
  const admin = getSupabaseAdmin();
  const { data } = await (admin as any)
    .from('user_milestones')
    .select('milestone')
    .eq('org_id', orgId);

  return new Set<Milestone>((data ?? []).map((r: { milestone: string }) => r.milestone as Milestone));
}

export async function hasSent(orgId: string, sendKey: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data } = await (admin as any)
    .from('marketing_sends')
    .select('id')
    .eq('org_id', orgId)
    .eq('send_key', sendKey)
    .maybeSingle();
  return Boolean(data);
}

export async function recordSend(orgId: string, email: string, sendKey: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await (admin as any).from('marketing_sends').upsert(
    { org_id: orgId, email, send_key: sendKey },
    { onConflict: 'org_id,send_key', ignoreDuplicates: true },
  ).catch(() => null);
}
