import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getOrg } from '../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

type Status = 'todo' | 'in_progress' | 'done';

type Step = {
  id: string;
  label: string;
  status: Status;
};

type ChecklistPayload = {
  steps?: Array<string | { id?: string; label?: string; status?: Status }>;
} | null;

const setupSteps: Step[] = [
  { id: 'env', label: 'Confirm Supabase environment variables are available to this runtime', status: 'in_progress' },
  { id: 'auth', label: 'Sign in with an operator account mapped to an active organization', status: 'todo' },
  { id: 'workflow', label: 'Connect one finance workflow and run the first governed proof', status: 'todo' },
  { id: 'evidence', label: 'Export onboarding evidence before production rollout', status: 'todo' },
];

function toChecklistPayload(value: unknown): ChecklistPayload {
  if (!value || typeof value !== 'object') return null;
  return value as ChecklistPayload;
}

function mapChecklistToSteps(checklist: ChecklistPayload, bootstrapStatus: string | null | undefined): Step[] {
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
      status: step.status || (bootstrapStatus === 'completed' ? 'done' : index === 0 ? 'in_progress' : 'todo'),
    };
  });
}

async function loadSteps(): Promise<{ steps: Step[]; note: string }> {
  try {
    const orgId = await getOrg();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('org_onboarding_states')
      .select('bootstrap_status, checklist')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) {
      return { steps: setupSteps, note: `Setup checklist shown because onboarding state could not be loaded: ${error.message}` };
    }

    const liveSteps = mapChecklistToSteps(toChecklistPayload(data?.checklist), data?.bootstrap_status);
    return {
      steps: liveSteps.length > 0 ? liveSteps : setupSteps,
      note: liveSteps.length > 0 ? 'Live onboarding state loaded.' : 'No live checklist found yet. Showing setup checklist.',
    };
  } catch {
    return {
      steps: setupSteps,
      note: 'Setup checklist shown because auth or environment is not available to this build runtime.',
    };
  }
}

export default async function FinanceGovernanceOnboardingPage() {
  const { steps, note } = await loadSteps();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Onboarding</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance workflow onboarding template</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Automated onboarding flow synced from backend checklist state when runtime configuration is available.
        </p>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
        {note}
      </div>

      <div className="mt-10 grid gap-4">
        {steps.map((step, index) => (
          <section key={step.id} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/20 font-semibold text-emerald-100">
              {index + 1}
            </div>
            <p className="text-base text-slate-100">{step.label}</p>
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {step.status}
            </span>
          </section>
        ))}
      </div>
    </main>
  );
}
