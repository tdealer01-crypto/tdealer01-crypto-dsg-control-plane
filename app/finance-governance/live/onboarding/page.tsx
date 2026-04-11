'use client';

import { useEffect, useState } from 'react';

type OnboardingResponse = {
  steps: Array<{
    id: string;
    label: string;
    status: 'todo' | 'in_progress' | 'done';
  }>;
};

export default function FinanceGovernanceLiveOnboardingPage() {
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/finance-governance/onboarding', {
          cache: 'no-store',
        });
        const json = (await response.json()) as OnboardingResponse;

        if (!response.ok) {
          throw new Error('Failed to load onboarding steps');
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load onboarding steps');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Live onboarding</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance workflow onboarding</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page loads onboarding steps from the finance-governance onboarding API and shows basic loading, error, and empty states.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-slate-200">Loading onboarding steps...</div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error}</div>
      ) : null}

      {!loading && !error && data?.steps.length === 0 ? (
        <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-slate-200">No onboarding steps found.</div>
      ) : null}

      {!loading && !error && data && data.steps.length > 0 ? (
        <div className="mt-10 grid gap-4">
          {data.steps.map((step, index) => (
            <section key={step.id} className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/20 font-semibold text-emerald-100">
                {index + 1}
              </div>
              <div>
                <p className="text-base text-slate-100">{step.label}</p>
                <p className="mt-1 text-sm text-slate-400">Status: {step.status}</p>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}
