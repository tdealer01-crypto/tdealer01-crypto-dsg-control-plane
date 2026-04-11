'use client';

import { useCallback, useEffect, useState } from 'react';
import { financeGovernanceFetch } from '../request';

type ApprovalItem = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

type SnapshotResponse = {
  workspace: {
    workspace: string;
    counts: {
      pendingApprovals: number;
      openExceptions: number;
      readyExports: number;
    };
  };
  approvals: ApprovalItem[];
  lastAction: {
    action: string;
    message: string;
    nextStatus: string;
    caseId?: string;
    approvalId?: string;
  } | null;
};

export default function FinanceGovernanceServerStorePage() {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const refresh = useCallback(async (soft = false) => {
    try {
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const [workspaceResponse, approvalsResponse] = await Promise.all([
        financeGovernanceFetch('/api/finance-governance/workspace/summary', { cache: 'no-store' }),
        financeGovernanceFetch('/api/finance-governance/approvals', { cache: 'no-store' }),
      ]);

      const workspaceJson = (await workspaceResponse.json()) as { workspace: SnapshotResponse['workspace'] };
      const approvalsJson = (await approvalsResponse.json()) as { approvals: SnapshotResponse['approvals'] };

      if (!workspaceResponse.ok || !approvalsResponse.ok) {
        throw new Error('Failed to load workflow snapshot');
      }

      setData({
        workspace: workspaceJson.workspace,
        approvals: approvalsJson.approvals,
        lastAction: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow snapshot');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  async function runSubmit() {
    try {
      setBusyKey('submit');
      setError('');
      const response = await financeGovernanceFetch('/api/finance-governance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'server-case-001' }),
      });
      await response.json();

      if (!response.ok) {
        throw new Error('Failed to submit workflow item');
      }
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit workflow item');
    } finally {
      setBusyKey(null);
    }
  }

  async function runAction(approvalId: string, action: 'approve' | 'reject' | 'escalate') {
    try {
      setBusyKey(`${approvalId}:${action}`);
      setError('');
      const response = await financeGovernanceFetch(`/api/finance-governance/approvals/${approvalId}/${action}`, {
        method: 'POST',
      });
      await response.json();

      if (!response.ok) {
        throw new Error(`Failed to ${action} approval`);
      }
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} approval`);
    } finally {
      setBusyKey(null);
    }
  }

  async function reset() {
    try {
      setBusyKey('reset');
      setError('');
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload workflow data');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Scoped endpoint workflow demo</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance governance workflow loop</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page reads and mutates workflow state through scoped <code>/api/finance-governance/*</code> endpoints backed by persistence.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <button type="button" onClick={() => void runSubmit()} disabled={busyKey !== null} className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-70">
          {busyKey === 'submit' ? 'Submitting...' : 'Submit workflow item'}
        </button>
        <button type="button" onClick={() => void refresh(true)} disabled={busyKey !== null || refreshing} className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white disabled:opacity-70">
          {refreshing ? 'Refreshing...' : 'Refresh snapshot'}
        </button>
        <button type="button" onClick={() => void reset()} disabled={busyKey !== null} className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-3 font-semibold text-red-100 disabled:opacity-70">
          {busyKey === 'reset' ? 'Refreshing...' : 'Refresh workflow data'}
        </button>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

      {loading ? <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading workflow snapshot...</div> : null}

      {!loading && data ? (
        <>
          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Workspace</p>
            <p className="mt-2 text-2xl font-semibold text-white">{data.workspace.workspace}</p>
            {data.lastAction ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
                Last action: {data.lastAction.action} — {data.lastAction.message}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
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

          <div className="mt-10 overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/5">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Approval ID</th>
                  <th className="px-5 py-4 font-semibold">Vendor</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Risk / note</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
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
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void runAction(item.id, 'approve')} disabled={busyKey !== null} className="rounded-xl bg-emerald-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-70">
                          {busyKey === `${item.id}:approve` ? 'Approving...' : 'Approve'}
                        </button>
                        <button type="button" onClick={() => void runAction(item.id, 'reject')} disabled={busyKey !== null} className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-semibold text-red-100 disabled:opacity-70">
                          {busyKey === `${item.id}:reject` ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button type="button" onClick={() => void runAction(item.id, 'escalate')} disabled={busyKey !== null} className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-semibold text-cyan-100 disabled:opacity-70">
                          {busyKey === `${item.id}:escalate` ? 'Escalating...' : 'Escalate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
