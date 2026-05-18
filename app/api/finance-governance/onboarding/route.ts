import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { getOrg } from '../../../../lib/server/getOrg';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type ChecklistPayload = {
  steps?: Array<string | { id?: string; label?: string; status?: 'todo' | 'in_progress' | 'done' }>;
  next_action?: string;
} | null;

function mapChecklistToSteps(checklist: ChecklistPayload, bootstrapStatus: string | null | undefined) {
  const rawSteps = Array.isArray(checklist?.steps) ? checklist.steps : [];

  return rawSteps.map((step, index) => {
    if (typeof step === 'string') {
      return {
        id: `step-${index + 1}`,
        label: step,
        status: bootstrapStatus === 'completed' ? 'done' : index === 0 ? 'in_progress' : 'todo',
      };
    }

    return {
      id: step.id || `step-${index + 1}`,
      label: step.label || `Step ${index + 1}`,
      status:
        step.status ||
        (bootstrapStatus === 'completed' ? 'done' : index === 0 ? 'in_progress' : 'todo'),
    };
  });
}

export async function GET(_request: Request) {
  try {
    const orgId = await getOrg();
    const admin = getSupabaseAdmin() as any;
    const { data, error } = await admin
      .from('org_onboarding_states')
      .select('bootstrap_status, checklist, bootstrapped_at')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const steps = mapChecklistToSteps(data?.checklist ?? null, data?.bootstrap_status);
    const completedCount = steps.filter((step) => step.status === 'done').length;
    const progress = steps.length === 0 ? 0 : completedCount / steps.length;

    return NextResponse.json({
      steps,
      progress,
      nextAction: data?.checklist?.next_action ?? null,
      onboarding: data ?? null,
    });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
