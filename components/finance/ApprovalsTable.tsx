'use client';

import { useState, useMemo } from 'react';

export type ApprovalItem = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

type RowState =
  | { kind: 'idle' }
  | { kind: 'busy'; action: string }
  | { kind: 'done'; status: string }
  | { kind: 'error'; message: string };

const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Approved', 'Rejected', 'Escalated'] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

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

function isActionableStatus(status: string) {
  return !['approved', 'rejected'].includes(status.toLowerCase());
}

// ---------------------------------------------------------------------------
// ApprovalRow
// ---------------------------------------------------------------------------

type ApprovalRowProps = {
  item: ApprovalItem;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  bulkProcessing: boolean;
};

function ApprovalRow({ item, selected, onSelectChange, onStatusChange, bulkProcessing }: ApprovalRowProps) {
  const [state, setState] = useState<RowState>({ kind: 'idle' });
  const [currentStatus, setCurrentStatus] = useState(item.status);

  const actionable = isActionableStatus(currentStatus);

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
      onStatusChange(item.id, next);
      setState({ kind: 'done', status: next });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  const displayStatus = state.kind === 'done' ? state.status : currentStatus;

  return (
    <tr className="border-t border-white/10 align-middle transition-colors hover:bg-white/[0.02]">
      {/* Checkbox */}
      <td className="px-4 py-4">
        {actionable && state.kind !== 'done' ? (
          <input
            type="checkbox"
            checked={selected}
            disabled={bulkProcessing}
            onChange={(e) => onSelectChange(item.id, e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500 cursor-pointer disabled:opacity-40"
          />
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
      </td>
      <td className="px-5 py-4 font-mono text-sm font-semibold text-white">{item.id}</td>
      <td className="px-5 py-4 text-slate-200">{item.vendor}</td>
      <td className="px-5 py-4 font-medium text-slate-100">{item.amount}</td>
      <td className="px-5 py-4">
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle(displayStatus)}`}>
          {displayStatus}
        </span>
      </td>
      <td className={`px-5 py-4 text-sm ${riskStyle(item.risk)}`}>{item.risk || '—'}</td>
      <td className="px-5 py-4">
        {state.kind === 'error' && (
          <p className="mb-2 text-xs text-rose-300">{state.message}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {actionable && state.kind !== 'done' ? (
            <>
              <button
                disabled={state.kind === 'busy' || bulkProcessing}
                onClick={() => void handleAction('approve')}
                className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {state.kind === 'busy' && state.action === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button
                disabled={state.kind === 'busy' || bulkProcessing}
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

// ---------------------------------------------------------------------------
// BulkActionBar
// ---------------------------------------------------------------------------

type BulkActionBarProps = {
  selectedCount: number;
  processing: boolean;
  progress: { done: number; total: number } | null;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
};

function BulkActionBar({ selectedCount, processing, progress, onApproveAll, onRejectAll, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-indigo-400/20 bg-indigo-400/5 px-4 py-3">
      <span className="text-sm font-medium text-slate-300">
        {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
      </span>
      {progress && (
        <span className="text-sm font-semibold text-indigo-300">
          {progress.done}/{progress.total} done
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          disabled={processing}
          onClick={onApproveAll}
          className="rounded-lg bg-emerald-400/10 px-4 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing…' : 'Approve All'}
        </button>
        <button
          disabled={processing}
          onClick={onRejectAll}
          className="rounded-lg bg-rose-400/10 px-4 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-400/20 transition hover:bg-rose-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing…' : 'Reject All'}
        </button>
        {!processing && (
          <button
            onClick={onClear}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApprovalsTable (default export)
// ---------------------------------------------------------------------------

export default function ApprovalsTable({ approvals }: { approvals: ApprovalItem[] }) {
  // ── filter state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // ── live statuses (updated by rows on single-row actions) ─────────────────
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});

  function handleStatusChange(id: string, newStatus: string) {
    setLiveStatuses((prev) => ({ ...prev, [id]: newStatus }));
    // deselect if no longer actionable
    if (!isActionableStatus(newStatus)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── filtered rows ─────────────────────────────────────────────────────────
  const filteredApprovals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return approvals.filter((item) => {
      const effectiveStatus = liveStatuses[item.id] ?? item.status;

      if (statusFilter !== 'All') {
        const f = statusFilter.toLowerCase();
        const s = effectiveStatus.toLowerCase();
        if (f === 'escalated') {
          if (!s.includes('escalat')) return false;
        } else {
          if (s !== f) return false;
        }
      }

      if (q) {
        const matchesVendor = item.vendor.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        if (!matchesVendor && !matchesId) return false;
      }

      return true;
    });
  }, [approvals, searchQuery, statusFilter, liveStatuses]);

  // ── bulk select state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Only rows that are currently visible AND actionable can be selected
  const actionableVisibleIds = useMemo(
    () =>
      new Set(
        filteredApprovals
          .filter((item) => isActionableStatus(liveStatuses[item.id] ?? item.status))
          .map((item) => item.id),
      ),
    [filteredApprovals, liveStatuses],
  );

  // Keep selectedIds in sync if rows scroll out of the filtered view or become non-actionable
  const effectiveSelectedIds = useMemo(
    () => new Set([...selectedIds].filter((id) => actionableVisibleIds.has(id))),
    [selectedIds, actionableVisibleIds],
  );

  const allActionableSelected =
    actionableVisibleIds.size > 0 &&
    [...actionableVisibleIds].every((id) => effectiveSelectedIds.has(id));

  function handleSelectRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => new Set([...prev, ...actionableVisibleIds]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        actionableVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  // ── bulk actions ──────────────────────────────────────────────────────────
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function runBulkAction(action: 'approve' | 'reject') {
    const ids = [...effectiveSelectedIds];
    if (ids.length === 0) return;

    setBulkProcessing(true);
    setBulkProgress({ done: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const res = await fetch('/api/finance-governance/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId: id, action }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const next = (data as any).next_status ?? (action === 'approve' ? 'approved' : 'rejected');
          handleStatusChange(id, next);
        }
      } catch {
        // individual row errors are swallowed; row-level UI handles its own state
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }

    // Clear selection and finish
    setSelectedIds(new Set());
    setBulkProcessing(false);
    // keep progress visible briefly then clear
    setTimeout(() => setBulkProgress(null), 1500);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ── empty state ───────────────────────────────────────────────────────────
  if (approvals.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
        <p className="text-2xl font-bold text-white">Queue is clear</p>
        <p className="mt-2 text-sm text-slate-400">
          No approvals waiting. New items appear here when a governed action requires review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-slate-500"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by vendor or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30"
          />
        </div>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-white/10 bg-slate-900 py-2 pl-3 pr-8 text-sm text-slate-200 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 cursor-pointer"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-slate-500">
        Showing {filteredApprovals.length} of {approvals.length} item{approvals.length !== 1 ? 's' : ''}
      </p>

      {/* ── Bulk action bar ── */}
      <BulkActionBar
        selectedCount={effectiveSelectedIds.size}
        processing={bulkProcessing}
        progress={bulkProgress}
        onApproveAll={() => void runBulkAction('approve')}
        onRejectAll={() => void runBulkAction('reject')}
        onClear={clearSelection}
      />

      {/* ── Table ── */}
      {filteredApprovals.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-400">No items match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[1.75rem] border border-white/10 bg-white/5">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                {/* Select-all header checkbox */}
                <th className="px-4 py-4 w-10">
                  {actionableVisibleIds.size > 0 ? (
                    <input
                      type="checkbox"
                      checked={allActionableSelected}
                      disabled={bulkProcessing}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500 cursor-pointer disabled:opacity-40"
                      title="Select all actionable rows"
                    />
                  ) : (
                    <span className="inline-block h-4 w-4" />
                  )}
                </th>
                <th className="px-5 py-4 font-medium">ID</th>
                <th className="px-5 py-4 font-medium">Vendor</th>
                <th className="px-5 py-4 font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Risk</th>
                <th className="px-5 py-4 font-medium">Action / Export</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((item) => (
                <ApprovalRow
                  key={item.id}
                  item={{ ...item, status: liveStatuses[item.id] ?? item.status }}
                  selected={effectiveSelectedIds.has(item.id)}
                  onSelectChange={handleSelectRow}
                  onStatusChange={handleStatusChange}
                  bulkProcessing={bulkProcessing}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
