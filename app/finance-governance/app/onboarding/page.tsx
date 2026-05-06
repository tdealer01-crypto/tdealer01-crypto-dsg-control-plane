type Status = 'todo' | 'in_progress' | 'done';

type Step = {
  id: string;
  label: string;
  status: Status;
};

const setupSteps: Step[] = [
  { id: 'env', label: 'Confirm Supabase environment variables are configured in the deployment runtime', status: 'in_progress' },
  { id: 'auth', label: 'Sign in with an operator account mapped to an active organization', status: 'todo' },
  { id: 'workflow', label: 'Connect one finance workflow and run the first governed proof', status: 'todo' },
  { id: 'evidence', label: 'Export onboarding evidence before production rollout', status: 'todo' },
];

export default function FinanceGovernanceOnboardingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Onboarding</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance workflow onboarding template</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Setup-safe onboarding view for local builds and operator review. Live onboarding state should be loaded from authenticated dashboard APIs after the operator signs in.
        </p>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
        This page no longer opens Supabase during static build. It preserves local verification and prevents a missing auth/session context from blocking the whole app build.
      </div>

      <div className="mt-10 grid gap-4">
        {setupSteps.map((step, index) => (
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
