'use client';

import { useState } from 'react';

type ActionResponse = {
  ok: true;
  action: 'submit' | 'approve' | 'reject' | 'escalate';
  message: string;
  nextStatus: string;
  caseId?: string;
  approvalId?: string;
};

type ActionState = {
  loading: boolean;
  error: string;
  result: ActionResponse | null;
};

const approvalItems = [
  { id: 'APR-1001', vendor: 'Northwind Supply' },
  { id: 'APR-1002', vendor: 'Contoso Services' },
  { id: 'APR-1003', vendor: 'Blue Ocean Partners' },
];

export default function FinanceGovernanceLiveActionsPage() {
  const [submitState, setSubmitState] = useState<ActionState>({
    loading: false,
    error: '',
    result: null,
  });
  const [approvalStates, setApprovalStates] = useState<Record<string, ActionState>>({});

  async function runSubmit() {
    try {
      setSubmitState({ loading: true, error: '', result: null });

      const response = await fetch('/api/finance-governance/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case-001' }),
      });
      const json = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error('Failed to submit workflow item');
      }

      setSubmitState({ loading: false, error: '', result: json });
    } catch (err) {
      setSubmitState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to submit workflow item',
        result: null,
      });
    }
  }

  async function runApprovalAction(approvalId: string, action: 'approve' | 'reject' | 'escalate') {
    try {
      setApprovalStates((prev) => ({
        ...prev,
        [approvalId]: { loading: true, error: '', result: null },
      }));

      const response = await fetch(`/api/finance-governance/approvals/${approvalId}/${action}`, {
        method: 'POST',
      });
      const json = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error(`Failed to ${action} approval`);
      }

      setApprovalStates((prev) => ({
        ...prev,
        [approvalId]: { loading: false, error: '', result: json },
      }));
    } catch (err) {
      setApprovalStates((prev) => ({
        ...prev,
        [approvalId]: {
          loading: false,
          error: err instanceof Error ? err.message : `Failed to ${action} approval`,
          result: null,
        },
      }));
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Live action demo</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Trigger finance-governance workflow actions</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This page calls the submit, approve, reject, and escalate endpoints directly so the repo now has a concrete action surface on top of the live UI and API skeleton.
        </p>
      </div>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Submit sample workflow item</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Calls <code>/api/finance-governance/submit</code> with a sample case payload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void runSubmit();
            }}
            disabled={submitState.loading}
            className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-70"
          >
            {submitState.loading ? 'Submitting...' : 'Submit sample item'}
          </button>
        </div>

        {submitState.error ? (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{submitState.error}</div>
        ) : null}

        {submitState.result ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
            <p className="font-semibold">{submitState.result.message}</p>
            <p className="mt-2 text-sm">Next status: {submitState.result.nextStatus}</p>
            <p className="mt-1 text-sm">Case ID: {submitState.result.caseId}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-10 grid gap-6">
        {approvalItems.map((item) => {
          const state = approvalStates[item.id] ?? { loading: false, error: '', result: null };

          return (
            <div key={item.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">{item.id}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{item.vendor}</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void runApprovalAction(item.id, 'approve');
                    }}
                    disabled={state.loading}
                    className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-70"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void runApprovalAction(item.id, 'reject');
                    }}
                    disabled={state.loading}
                    className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-semibold text-red-100 disabled:opacity-70"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void runApprovalAction(item.id, 'escalate');
                    }}
                    disabled={state.loading}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 font-semibold text-cyan-100 disabled:opacity-70"
                  >
                    Escalate
                  </button>
                </div>
              </div>

              {state.loading ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">Running action...</div>
              ) : null}

              {state.error ? (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{state.error}</div>
              ) : null}

              {state.result ? (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
                  <p className="font-semibold">{state.result.message}</p>
                  <p className="mt-2 text-sm">Action: {state.result.action}</p>
                  <p className="mt-1 text-sm">Next status: {state.result.nextStatus}</p>
                  <p className="mt-1 text-sm">Approval ID: {state.result.approvalId}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}
