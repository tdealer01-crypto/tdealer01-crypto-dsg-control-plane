'use client';

import { useState } from 'react';

export type ApprovalItem = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

type RowState = { kind: 'idle' } | { kind: 'busy'; action: string } | { kind: 'done'; status: string } | { kind: 'error'; message: string };

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'approved') return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20';
  if (s === 'rejected') return 'bg-rose-400/10 text-rose-300 border-rose-400/20';
  if (s.includes('escalat')) return 'bg-amber-400/10 text-amber-300 border-amber-400/20';
  return 'bg-slate-800 text-slate-300 border-slate-700';
}

function riskStyle(risk: string) {
  const r = risk.toLowerCase();
  if (r.includes('high') || r.includes('exceed') || r.includes('critical')) return 'text-rose-300';
  if (r.includes('medium') || r.includes('threshold')) return 'text-amber-300';
  return 'text-slate-400';
}

function ApprovalRow({ item }: { item: ApprovalItem }) {
  const [state, setState] = useState<RowState>({ kind: 'idle' });
  const [currentStatus, setCurrentStatus] = useState(item.status);

  const isActionable = !['approved', 'rejected'].includes(currentStatus.toLowerCase());

  async function handleAction(action: 'approve' | 'reject') {
    setState({ kind: 'busy', action });
    try {
      const res = await fetch('/api/finance-governance/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: item.id, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const next = (data as any).next_status ?? (action === 'approve' ? 'approved' : 'rejected');
      setCurrentStatus(next);
      setState({ kind: 'done', status: next });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return (
    <tr className="border-t border-white/10 align-middle transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-4 font-mono text-sm font-semibold text-white">{item.id}</td>
      <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
      <td className="px-5 py-4 font-medium text-slate-100">{item.amount}</td>
      <td className="px-5 py-4">
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle(currentStatus)}`}>
          {state.kind === 'done' ? state.status : currentStatus}
        </span>
      </td>
      <td className={`px-5 py-4 text-sm ${riskStyle(item.risk)}`}>{item.risk || '—'}</td>
      <td className="px-5 py-4">
        {state.kind === 'error' && (
          <p className="mb-2 text-xs text-rose-300">{state.message}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {isActionable && state.kind !== 'done' ? (
            <>
              <button
                disabled={state.kind === 'busy'}
                onClick={() => void handleAction('approve')}
                className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {state.kind === 'busy' && state.action === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button
                disabled={state.kind === 'busy'}
                onClick={() => void handleAction('reject')}
                className="rounded-lg bg-rose-400/10 px-3 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-400/20 transition hover:bg-rose-400/20 disabled:opacity-50"
              >
                {state.kind === 'busy' && state.action === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
            </>
          ) : state.kind === 'done' ? (
            <span className="text-xs text-slate-500">Recorded ✓</span>
          ) : (
            <span className="text-xs text-slate-600">Closed</span>
          )}
          <a
            href={`/api/finance-governance/approvals/${item.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Export PDF
          </a>
        </div>
      </td>
    </tr>
  );
}

export default function ApprovalsTable({ approvals }: { approvals: ApprovalItem[] }) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
        <p className="text-2xl font-bold text-white">Queue is clear</p>
        <p className="mt-2 text-sm text-slate-400">No approvals waiting. New items appear here when a governed action requires review.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/5">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-slate-400">
          <tr>
            <th className="px-5 py-4 font-medium">ID</th>
            <th className="px-5 py-4 font-medium">Vendor</th>
            <th className="px-5 py-4 font-medium">Amount</th>
            <th className="px-5 py-4 font-medium">Status</th>
            <th className="px-5 py-4 font-medium">Risk</th>
            <th className="px-5 py-4 font-medium">Action / Export</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((item) => (
            <ApprovalRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
