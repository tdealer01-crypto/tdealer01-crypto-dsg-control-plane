'use client';

import { useEffect, useState } from 'react';
import { financeGovernanceFetch } from '../../request';

type CaseDetailResponse = {
  case: {
    id: string;
    status: string;
    exportStatus: string;
    transaction: {
      vendor: string;
      amount: string;
      currency: string;
      workflow: string;
    };
    timeline: string[];
  };
};

type PageProps = {
  params: {
    id: string;
  };
};

export default function FinanceGovernanceLiveCaseDetailPage({ params }: PageProps) {
  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await financeGovernanceFetch(`/api/finance-governance/cases/${params.id}`, {
          cache: 'no-store',
        });
        const json = (await response.json()) as CaseDetailResponse;

        if (!response.ok) {
          throw new Error('Failed to load case detail');
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load case detail');
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
  }, [params.id]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-violet-200">Live case detail</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Case {params.id}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page loads case detail from the finance-governance case API and renders loading, error, and data states for one governed case.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading case detail...</div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[1.75rem] border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</div>
      ) : null}

      {!loading && !error && data ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-semibold">Transaction summary</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm text-slate-400">Vendor</p>
                <p className="mt-2 text-xl font-semibold text-white">{data.case.transaction.vendor}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm text-slate-400">Amount</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {data.case.transaction.currency} {data.case.transaction.amount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm text-slate-400">Status</p>
                <p className="mt-2 text-xl font-semibold text-emerald-100">{data.case.status}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
                <p className="text-sm text-slate-400">Evidence export</p>
                <p className="mt-2 text-xl font-semibold text-emerald-100">{data.case.exportStatus}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm text-slate-400">Workflow</p>
              <p className="mt-2 text-base text-slate-100">{data.case.transaction.workflow}</p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
            <h2 className="text-2xl font-semibold">Case timeline</h2>
            <div className="mt-6 grid gap-4">
              {data.case.timeline.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">No timeline events yet.</div>
              ) : (
                data.case.timeline.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/20 font-semibold text-cyan-100">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-100">{item}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
