'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { financeGovernanceFetch } from './request';

type WorkspaceSummaryResponse = {
  workspace: {
    workspace: string;
    counts: {
      pendingApprovals: number;
      openExceptions: number;
      readyExports: number;
    };
    quickLinks: Array<{
      href: string;
      label: string;
    }>;
  };
};

export default function FinanceGovernanceLiveWorkspacePage() {
  const [data, setData] = useState<WorkspaceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await financeGovernanceFetch('/api/finance-governance/workspace/summary', {
          cache: 'no-store',
        });
        const json = (await response.json()) as WorkspaceSummaryResponse;

        if (!response.ok) {
          throw new Error('Failed to load workspace summary');
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load workspace summary');
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
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live workspace</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance governance live workspace</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page loads workspace data from the finance-governance API skeleton instead of relying on hardcoded UI state.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading workspace data...</div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[1.75rem] border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Pending approvals</p>
              <p className="mt-3 text-4xl font-bold text-white">{data.workspace.counts.pendingApprovals}</p>
            </section>
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Open exceptions</p>
              <p className="mt-3 text-4xl font-bold text-white">{data.workspace.counts.openExceptions}</p>
            </section>
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Ready exports</p>
              <p className="mt-3 text-4xl font-bold text-white">{data.workspace.counts.readyExports}</p>
            </section>
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
            <h2 className="text-2xl font-semibold">Quick links</h2>
            <div className="mt-5 flex flex-wrap gap-4">
              <Link href="/finance-governance/live/onboarding" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
                Live onboarding
              </Link>
              <Link href="/finance-governance/live/approvals" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
                Live approvals
              </Link>
              <Link href="/finance-governance/live/cases/sample-case" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
                Live case detail
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-300">
              {data.workspace.quickLinks.map((link) => (
                <span key={link.href} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2">
                  API contract source: {link.label}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
