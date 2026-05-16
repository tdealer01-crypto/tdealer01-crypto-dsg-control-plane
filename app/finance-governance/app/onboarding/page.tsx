'use client';

import { useEffect, useState } from 'react';

type Status = 'todo' | 'in_progress' | 'done';

type Step = {
  id: string;
  label: string;
  status: Status;
};

type OnboardingData = {
  steps: Step[];
  progress: number;
  nextAction: string | null;
};

const fallbackSteps: Step[] = [
  { id: 'env', label: 'Confirm Supabase environment variables are configured in the deployment runtime', status: 'in_progress' },
  { id: 'auth', label: 'Sign in with an operator account mapped to an active organization', status: 'todo' },
  { id: 'workflow', label: 'Connect one finance workflow and run the first governed proof', status: 'todo' },
  { id: 'evidence', label: 'Export onboarding evidence before production rollout', status: 'todo' },
];

function statusBadgeClass(status: Status): string {
  switch (status) {
    case 'done':
      return 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200';
    case 'in_progress':
      return 'border-amber-400/30 bg-amber-400/15 text-amber-200';
    default:
      return 'border-white/10 bg-white/5 text-slate-300';
  }
}

function SkeletonRows() {
  return (
    <div className="mt-10 grid gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 animate-pulse"
        >
          <div className="h-10 w-10 rounded-2xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
          </div>
          <div className="h-6 w-20 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export default function FinanceGovernanceOnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/finance-governance/onboarding');
        if (res.status === 401) {
          window.location.href = '/login?next=/finance-governance/app/onboarding';
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            steps: Array.isArray(json.steps) ? json.steps : [],
            progress: typeof json.progress === 'number' ? json.progress : 0,
            nextAction: json.nextAction ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const steps = error ? fallbackSteps : (data?.steps ?? []);
  const progress = data?.progress ?? 0;
  const progressPct = Math.round(progress * 100);

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

      {error && (
        <div className="mt-6 rounded-[1.5rem] border border-slate-400/20 bg-slate-400/10 p-5 text-sm leading-7 text-slate-300">
          Could not load onboarding status — using setup template
        </div>
      )}

      {!error && !loading && data && (
        <>
          <div className="mt-6">
            <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
              <span>{progressPct}% complete</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {data.nextAction && (
            <div className="mt-4 rounded-[1.5rem] border border-blue-400/25 bg-blue-400/10 p-4 text-sm leading-7 text-blue-100">
              Next: {data.nextAction}
            </div>
          )}
        </>
      )}

      {loading ? (
        <SkeletonRows />
      ) : (
        <div className="mt-10 grid gap-4">
          {steps.map((step, index) => (
            <section key={step.id} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/20 font-semibold text-emerald-100">
                {index + 1}
              </div>
              <p className="text-base text-slate-100">{step.label}</p>
              <span className={`ml-auto shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${statusBadgeClass(step.status)}`}>
                {step.status}
              </span>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
