import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getOrg } from '../../../../lib/server/getOrg';

type ChecklistPayload = {
  steps?: Array<string | { id?: string; label?: string; status?: 'todo' | 'in_progress' | 'done' }>;
} | null;

function toChecklistPayload(value: unknown): ChecklistPayload {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as ChecklistPayload;
}

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
      status: step.status || (bootstrapStatus === 'completed' ? 'done' : index === 0 ? 'in_progress' : 'todo'),
    };
  });
}

export default async function FinanceGovernanceOnboardingPage() {
  const orgId = await getOrg();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('org_onboarding_states')
    .select('bootstrap_status, checklist')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load onboarding state: ${error.message}`);
  }
  const steps = mapChecklistToSteps(toChecklistPayload(data?.checklist), data?.bootstrap_status);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Onboarding</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance workflow onboarding template</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Automated onboarding flow synced from backend checklist state so compliance setup progress is always live.
        </p>
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
