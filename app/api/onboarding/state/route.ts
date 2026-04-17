import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/security/api-error';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const profile = await admin
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profile.error || !profile.data?.org_id || !profile.data.is_active) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = String(profile.data.org_id);
    const state = await admin
      .from('org_onboarding_states')
      .select('bootstrap_status, checklist, bootstrapped_at')
      .eq('org_id', orgId)
      .maybeSingle();

    const agents = await admin.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const executions = await admin.from('executions').select('id', { count: 'exact', head: true }).eq('org_id', orgId);

    const hasAgent = (agents.count ?? 0) > 0;
    const hasFirstExecution = (executions.count ?? 0) > 0;
    const bootstrapStatus = state.data?.bootstrap_status ?? 'pending';
    const firstRunComplete = bootstrapStatus === 'completed' && hasFirstExecution;

    const nextAction = firstRunComplete
      ? 'Open executions dashboard'
      : hasAgent
        ? 'Complete Auto-Setup in Skills to create your first execution'
        : 'Complete Auto-Setup in Skills to create your first agent and first execution';

    return NextResponse.json({
      org_id: orgId,
      onboarding: state.data ?? null,
      is_empty: !hasAgent,
      has_agent: hasAgent,
      has_first_execution: hasFirstExecution,
      first_run_complete: firstRunComplete,
      progress: {
        workspace_ready: true,
        agent_ready: hasAgent,
        first_execution_ready: hasFirstExecution,
      },
      next_action: nextAction,
    });
  } catch (error) {
    return handleApiError('api/onboarding/state', error);
  }
}
