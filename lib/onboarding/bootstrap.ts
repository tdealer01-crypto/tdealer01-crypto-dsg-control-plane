import { getSupabaseAdmin } from '../supabase-server';

const STARTER_STEPS = [
  'Create or inspect your first agent',
  'Review a starter policy',
  'Run your first controlled execution',
  'Inspect evidence or audit output',
  'Review quota/billing basics',
];

export async function bootstrapOrgStarterState(orgId: string, opts?: { initiatedByUserId?: string | null }) {
  const admin = getSupabaseAdmin();
  const existing = await admin.from('org_onboarding_states').select('id, bootstrap_status').eq('org_id', orgId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id && existing.data.bootstrap_status === 'completed') {
    return { status: 'completed' as const, created: false };
  }

  const agents = await admin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  if (agents.error) throw agents.error;

  const executions = await admin.from('executions').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  if (executions.error) throw executions.error;

  const hasAgent = (agents.count ?? 0) > 0;
  const hasFirstExecution = (executions.count ?? 0) > 0;
  const now = new Date().toISOString();
  const checklist = {
    steps: STARTER_STEPS,
    next_action: hasFirstExecution
      ? 'Open executions dashboard to inspect your first controlled execution'
      : hasAgent
        ? 'Complete Auto-Setup in Skills to create your first execution'
        : 'Complete Auto-Setup in Skills to create your first agent and first execution',
    initiated_by_user_id: opts?.initiatedByUserId ?? null,
  };

  const bootstrapStatus = hasFirstExecution ? 'completed' : 'pending';
  const bootstrappedAt = hasFirstExecution ? now : null;

  if (existing.data?.id) {
    await admin
      .from('org_onboarding_states')
      .update({
        checklist,
        bootstrap_status: bootstrapStatus,
        bootstrapped_at: bootstrappedAt,
        updated_at: now,
      })
      .eq('id', existing.data.id);
  } else {
    await admin.from('org_onboarding_states').insert({
      org_id: orgId,
      checklist,
      bootstrap_status: bootstrapStatus,
      bootstrapped_at: bootstrappedAt,
      created_at: now,
      updated_at: now,
    });
  }

  return { status: bootstrapStatus as 'completed' | 'pending', created: !existing.data?.id };
}
