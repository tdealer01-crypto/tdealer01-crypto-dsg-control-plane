'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { financeGovernanceFetch } from '../request';

type Approval = { id: string; vendor: string; amount: string; status: string; risk: string; };
type ApprovalsResponse = { approvals: Approval[] };

function SkeletonRow() {
  return (
    <tr className="border-t border-white/10">
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        </td>
      ))}
    </tr>
  );
}

const RISK_CLS: Record<string, string> = {
  high: 'border-red-400/30 bg-red-400/10 text-red-300',
  medium: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
};

export default function FinanceGovernanceLiveApprovalsPage() {
  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await financeGovernanceFetch('/api/finance-governance/approvals', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as ApprovalsResponse);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approvals = data?.approvals ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live approval queue</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Pending finance approvals</h1>
          <p className="mt-3 text-base leading-7 text-slate-400">
            รายการ payment ที่รอการอนุมัติ — ตรวจสอบ risk level และกดอนุมัติหรือปฏิเสธ
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastRefresh && !loading && (
            <span className="text-[11px] text-slate-600">
              updated {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            {loading ? '…' : 'Refresh ↻'}
          </button>
          <Link
            href="/finance-governance/live/actions"
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            + Submit action
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
          <button onClick={() => void load()} className="ml-3 underline hover:no-underline">ลองใหม่</button>
        </div>
      )}

      {/* Table */}
      <div className="mt-8 overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/[0.03]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-slate-400">
            <tr>
              <th className="px-5 py-4 font-semibold">Approval ID</th>
              <th className="px-5 py-4 font-semibold">Vendor</th>
              <th className="px-5 py-4 font-semibold">Amount</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>{[1,2,3].map(i => <SkeletonRow key={i} />)}</>
            ) : approvals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <p className="text-base font-semibold text-slate-300">ไม่มีรายการรออนุมัติ</p>
                  <p className="mt-1 text-sm text-slate-500">เมื่อ AI agent ส่ง action ที่ต้องการอนุมัติ จะปรากฏที่นี่</p>
                  <Link
                    href="/finance-governance/live/actions"
                    className="mt-4 inline-flex rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                  >
                    ส่ง action ทดสอบ →
                  </Link>
                </td>
              </tr>
            ) : (
              approvals.map((item) => (
                <tr key={item.id} className="border-t border-white/8 align-top hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-white">{item.id}</td>
                  <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
                  <td className="px-5 py-4 font-semibold text-slate-100">{item.amount}</td>
                  <td className="px-5 py-4 text-emerald-100">{item.status}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RISK_CLS[item.risk.toLowerCase()] ?? 'border-slate-600 text-slate-400'}`}>
                      {item.risk}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      {!loading && approvals.length > 0 && (
        <p className="mt-3 text-xs text-slate-600">{approvals.length} รายการ · กด Refresh เพื่ออัปเดต</p>
      )}
    </main>
  );
}
