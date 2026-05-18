'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeGovernanceFetch } from '../request';

type WorkspaceSummaryResponse = {
  workspace: {
    workspace: string;
    counts: {
      pendingApprovals: number;
      openExceptions: number;
      readyExports: number;
    };
  };
};

type ApprovalItem = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

type ApprovalsResponse = {
  approvals: ApprovalItem[];
};

type ActionResponse = {
  ok: true;
  action: 'submit' | 'approve' | 'reject' | 'escalate';
  message: string;
  nextStatus: string;
  caseId?: string;
  approvalId?: string;
};

type ActionBanner = {
  kind: 'success' | 'error';
  text: string;
};

type PersistedWorkflowState = {
  approvals: ApprovalItem[];
  submittedCount: number;
  lastAction: ActionResponse | null;
};

const STORAGE_KEY = 'finance-governance-live-workflow-persistent-v1';

function deriveCounts(approvals: ApprovalItem[], submittedCount: number) {
  const pendingApprovals = approvals.filter((item) => !['approved', 'rejected'].includes(item.status.toLowerCase())).length;
  const openExceptions = approvals.filter((item) => item.status.toLowerCase().includes('exception')).length;
  const readyExports = submittedCount;

  return {
    pendingApprovals,
    openExceptions,
    readyExports,
  };
}

export default function FinanceGovernanceLiveWorkflowPersistentPage() {
  const [workspaceName, setWorkspaceName] = useState('Finance Governance Workspace');
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<ActionBanner | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const counts = useMemo(() => deriveCounts(approvals, submittedCount), [approvals, submittedCount]);

  const persistState = useCallback((nextState: PersistedWorkflowState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore localStorage failures in local runtime mode
    }
  }, []);

  const refreshData = useCallback(async (showRefreshing = false, reset = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [workspaceResponse, approvalsResponse] = await Promise.all([
        financeGovernanceFetch('/api/finance-governance/workspace/summary', { cache: 'no-store' }),
        financeGovernanceFetch('/api/finance-governance/approvals', { cache: 'no-store' }),
      ]);

      const workspaceJson = (await workspaceResponse.json()) as WorkspaceSummaryResponse;
      const approvalsJson = (await approvalsResponse.json()) as ApprovalsResponse;

      if (!workspaceResponse.ok || !approvalsResponse.ok) {
        throw new Error('Failed to refresh workflow data');
      }

      setWorkspaceName(workspaceJson.workspace.workspace);

      const baseState: PersistedWorkflowState = {
        approvals: approvalsJson.approvals,
        submittedCount: 0,
        lastAction: null,
      };

      if (reset) {
        setApprovals(baseState.approvals);
        setSubmittedCount(baseState.submittedCount);
        persistState(baseState);
        return;
      }

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as PersistedWorkflowState;
          if (Array.isArray(saved.approvals)) {
            setApprovals(saved.approvals);
            setSubmittedCount(typeof saved.submittedCount === 'number' ? saved.submittedCount : 0);
            return;
          }
        }
      } catch {
        // fall back to fresh API data
      }

      setApprovals(baseState.approvals);
      setSubmittedCount(baseState.submittedCount);
      persistState(baseState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh workflow data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [persistState]);

  useEffect(() => {
    void refreshData(false);
  }, [refreshData]);

  async function runSubmit() {
    try {
      setBusyKey('submit');
      setBanner(null);

      const response = await financeGovernanceFetch('/api/finance-governance/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: `case-${submittedCount + 1}` }),
      });
      const json = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error('Failed to submit workflow item');
      }

      const nextSubmittedCount = submittedCount + 1;
      const nextState: PersistedWorkflowState = {
        approvals,
        submittedCount: nextSubmittedCount,
        lastAction: json,
      };

      setSubmittedCount(nextSubmittedCount);
      persistState(nextState);
      setBanner({ kind: 'success', text: `${json.message}. Next status: ${json.nextStatus}.` });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit workflow item',
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function runApprovalAction(approvalId: string, action: 'approve' | 'reject' | 'escalate') {
    try {
      setBusyKey(`${approvalId}:${action}`);
      setBanner(null);

      const response = await financeGovernanceFetch(`/api/finance-governance/approvals/${approvalId}/${action}`, {
        method: 'POST',
      });
      const json = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error(`Failed to ${action} approval`);
      }

      const nextApprovals = approvals.map((item) =>
        item.id === approvalId
          ? {
              ...item,
              status: json.nextStatus,
            }
          : item
      );

      const nextState: PersistedWorkflowState = {
        approvals: nextApprovals,
        submittedCount,
        lastAction: json,
      };

      setApprovals(nextApprovals);
      persistState(nextState);
      setBanner({ kind: 'success', text: `${json.message}. Next status: ${json.nextStatus}.` });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : `Failed to ${action} approval`,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function resetDemo() {
    setBanner(null);
    await refreshData(true, true);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Persistent workflow state</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Workflow state that persists in the browser</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page starts from the finance-governance API, then keeps action results in local storage so approval statuses and summary counts stay changed across refreshes until you reset the local state.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <button type="button" onClick={() => void runSubmit()} disabled={busyKey !== null} className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-70">
          {busyKey === 'submit' ? 'Submitting...' : 'Submit sample workflow item'}
        </button>
        <button type="button" onClick={() => void refreshData(true)} disabled={busyKey !== null || refreshing} className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white disabled:opacity-70">
          {refreshing ? 'Refreshing...' : 'Refresh from storage'}
        </button>
        <button type="button" onClick={() => void resetDemo()} disabled={busyKey !== null || refreshing} className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-3 font-semibold text-red-100 disabled:opacity-70">
          Reset local state
        </button>
      </div>

      {banner ? (
        <div className={[
          'mt-6 rounded-2xl p-4',
          banner.kind === 'success' ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border border-red-500/30 bg-red-500/10 text-red-200',
        ].join(' ')}>
          {banner.text}
        </div>
      ) : null}

      {loading ? <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading workflow data...</div> : null}
      {error ? <div className="mt-10 rounded-[1.75rem] border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Workspace</p>
            <p className="mt-2 text-2xl font-semibold text-white">{workspaceName}</p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Pending approvals</p>
              <p className="mt-3 text-4xl font-bold text-white">{counts.pendingApprovals}</p>
            </section>
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Open exceptions</p>
              <p className="mt-3 text-4xl font-bold text-white">{counts.openExceptions}</p>
            </section>
            <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-sm text-slate-400">Ready exports</p>
              <p className="mt-3 text-4xl font-bold text-white">{counts.readyExports}</p>
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
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-slate-200">No approvals waiting right now.</td>
                  </tr>
                ) : (
                  approvals.map((item) => (
                    <tr key={item.id} className="border-t border-white/10 align-top">
                      <td className="px-5 py-4 font-semibold text-white">{item.id}</td>
                      <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
                      <td className="px-5 py-4 text-slate-200">{item.amount}</td>
                      <td className="px-5 py-4 text-emerald-100">{item.status}</td>
                      <td className="px-5 py-4 text-slate-300">{item.risk}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void runApprovalAction(item.id, 'approve')} disabled={busyKey !== null} className="rounded-xl bg-emerald-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-70">
                            {busyKey === `${item.id}:approve` ? 'Approving...' : 'Approve'}
                          </button>
                          <button type="button" onClick={() => void runApprovalAction(item.id, 'reject')} disabled={busyKey !== null} className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-semibold text-red-100 disabled:opacity-70">
                            {busyKey === `${item.id}:reject` ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button type="button" onClick={() => void runApprovalAction(item.id, 'escalate')} disabled={busyKey !== null} className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-semibold text-cyan-100 disabled:opacity-70">
                            {busyKey === `${item.id}:escalate` ? 'Escalating...' : 'Escalate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
