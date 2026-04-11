'use client';

import { useEffect, useState } from 'react';
import { financeGovernanceFetch } from '../request';

type ApprovalsResponse = {
  approvals: Array<{
    id: string;
    vendor: string;
    amount: string;
    status: string;
    risk: string;
  }>;
};

export default function FinanceGovernanceLiveApprovalsPage() {
  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const response = await financeGovernanceFetch('/api/finance-governance/approvals', {
          cache: 'no-store',
        });
        const json = (await response.json()) as ApprovalsResponse;

        if (!response.ok) {
          throw new Error('Failed to load approvals');
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load approvals');
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
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live approval queue</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Pending finance approvals</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page loads approval items from the finance-governance approvals API and renders basic loading, error, and empty states.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading approvals...</div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[1.75rem] border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</div>
      ) : null}

      {!loading && !error && data?.approvals.length === 0 ? (
        <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">No approvals waiting right now.</div>
      ) : null}

      {!loading && !error && data && data.approvals.length > 0 ? (
        <div className="mt-10 overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/5">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-4 font-semibold">Approval ID</th>
                <th className="px-5 py-4 font-semibold">Vendor</th>
                <th className="px-5 py-4 font-semibold">Amount</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Risk / note</th>
              </tr>
            </thead>
            <tbody>
              {data.approvals.map((item) => (
                <tr key={item.id} className="border-t border-white/10 align-top">
                  <td className="px-5 py-4 font-semibold text-white">{item.id}</td>
                  <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
                  <td className="px-5 py-4 text-slate-200">{item.amount}</td>
                  <td className="px-5 py-4 text-emerald-100">{item.status}</td>
                  <td className="px-5 py-4 text-slate-300">{item.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
