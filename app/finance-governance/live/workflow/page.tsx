'use client';

import { useCallback, useEffect, useState } from 'react';
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

type ApprovalsResponse = {
  approvals: Array<{
    id: string;
    vendor: string;
    amount: string;
    status: string;
    risk: string;
  }>;
};

type CaseItem = {
  id: string;
  vendor?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  workflow?: string;
};

type CasesResponse = {
  cases: CaseItem[];
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

export default function FinanceGovernanceLiveWorkflowPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSummaryResponse['workspace'] | null>(null);
  const [approvals, setApprovals] = useState<ApprovalsResponse['approvals']>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<ActionBanner | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const refreshData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [workspaceResponse, approvalsResponse, casesResponse] = await Promise.all([
        financeGovernanceFetch('/api/finance-governance/workspace/summary', { cache: 'no-store' }),
        financeGovernanceFetch('/api/finance-governance/approvals', { cache: 'no-store' }),
        financeGovernanceFetch('/api/cases', { cache: 'no-store' }),
      ]);

      const workspaceJson = (await workspaceResponse.json()) as WorkspaceSummaryResponse;
      const approvalsJson = (await approvalsResponse.json()) as ApprovalsResponse;
      const casesJson = (await casesResponse.json()) as CasesResponse;

      if (!workspaceResponse.ok || !approvalsResponse.ok || !casesResponse.ok) {
        throw new Error('Failed to refresh workflow data');
      }

      const nextCases = casesJson.cases ?? [];
      setWorkspace(workspaceJson.workspace);
      setApprovals(approvalsJson.approvals);
      setCases(nextCases);
      setSelectedCaseId((current) => current || nextCases[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh workflow data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshData(false);
  }, [refreshData]);

  async function runSubmit() {
    try {
      setBusyKey('submit');
      setBanner(null);

      if (!selectedCaseId) {
        throw new Error('No workflow case is available to submit. Create or import a case first.');
      }

      const response = await financeGovernanceFetch('/api/finance-governance/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const json = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error('Failed to submit workflow item');
      }

      setBanner({
        kind: 'success',
        text: `${json.message}. Next status: ${json.nextStatus}.`,
      });
      await refreshData(true);
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

      setBanner({
        kind: 'success',
        text: `${json.message}. Next status: ${json.nextStatus}.`,
      });
      await refreshData(true);
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : `Failed to ${action} approval`,
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live workflow</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Read, act, and refresh in one workflow surface</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page combines live reads from the finance-governance API with workflow actions and then refreshes the summary and queue so the state transition loop is visible in one place.
        </p>
      </div>

      <div className="mt-8 grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="block">
          <span className="text-sm font-semibold text-slate-200">Workflow case</span>
          <select
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value)}
            disabled={busyKey !== null || cases.length === 0}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white disabled:opacity-70"
          >
            {cases.length === 0 ? (
              <option value="">No workflow cases available</option>
            ) : (
              cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.vendor ? `${item.vendor} - ` : ''}{item.id} {item.status ? `(${item.status})` : ''}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            void runSubmit();
          }}
          disabled={busyKey !== null || !selectedCaseId}
          className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-70"
        >
          {busyKey === 'submit' ? 'Submitting...' : 'Submit selected workflow item'}
        </button>
        <button
          type="button"
          onClick={() => {
            void refreshData(true);
          }}
          disabled={busyKey !== null || refreshing}
          className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white disabled:opacity-70"
        >
          {refreshing ? 'Refreshing...' : 'Refresh workflow data'}
        </button>
      </div>

      {banner ? (
        <div
          className={[
            'mt-6 rounded-2xl p-4',
            banner.kind === 'success'
              ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
              : 'border border-red-500/30 bg-red-500/10 text-red-200',
          ].join(' ')}
        >
          {banner.text}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7 text-slate-200">Loading workflow data...</div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[1.75rem] border border-red-500/30 bg-red-500/10 p-7 text-red-200">{error}</div>
      ) : null}

      {!loading && !error && workspace ? (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <p className="text-sm text-slate-400">Pending approvals</p>
            <p className="mt-3 text-4xl font-bold text-white">{workspace.counts.pendingApprovals}</p>
          </section>
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <p className="text-sm text-slate-400">Open exceptions</p>
            <p className="mt-3 text-4xl font-bold text-white">{workspace.counts.openExceptions}</p>
          </section>
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <p className="text-sm text-slate-400">Ready exports</p>
            <p className="mt-3 text-4xl font-bold text-white">{workspace.counts.readyExports}</p>
          </section>
        </div>
      ) : null}

      {!loading && !error ? (
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
                  <td colSpan={6} className="px-5 py-8 text-slate-200">
                    No approvals waiting right now.
                  </td>
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
                        <button
                          type="button"
                          onClick={() => {
                            void runApprovalAction(item.id, 'approve');
                          }}
                          disabled={busyKey !== null}
                          className="rounded-xl bg-emerald-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-70"
                        >
                          {busyKey === `${item.id}:approve` ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void runApprovalAction(item.id, 'reject');
                          }}
                          disabled={busyKey !== null}
                          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-semibold text-red-100 disabled:opacity-70"
                        >
                          {busyKey === `${item.id}:reject` ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void runApprovalAction(item.id, 'escalate');
                          }}
                          disabled={busyKey !== null}
                          className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-semibold text-cyan-100 disabled:opacity-70"
                        >
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
      ) : null}
    </main>
  );
}
