'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  GitCompare,
  CreditCard,
  LayoutDashboard,
  Shield,
  Package,
  BarChart2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Plus,
  Minus,
} from 'lucide-react';

type BuildStatus = 'DEPLOYED' | 'BUILDING' | 'FAILED' | 'DRAFT';

type BuildEntry = {
  id: string;
  version: string;
  appName: string;
  appIcon: string;
  status: BuildStatus;
  timestamp: string;
  relativeTime: string;
  summary: string;
  addedLines: number;
  removedLines: number;
};

const MOCK_BUILDS: BuildEntry[] = [
  { id: 'b15', version: 'v1.4.2', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-15T10:00:00Z', relativeTime: '2 hours ago', summary: 'Added Stripe payments integration', addedLines: 142, removedLines: 12 },
  { id: 'b14', version: 'v1.4.1', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-14T16:30:00Z', relativeTime: 'yesterday', summary: 'Fixed webhook signature validation', addedLines: 28, removedLines: 6 },
  { id: 'b13', version: 'v1.4.0', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DEPLOYED', timestamp: '2026-05-14T09:00:00Z', relativeTime: 'yesterday', summary: 'Updated dashboard UI with new chart components', addedLines: 310, removedLines: 88 },
  { id: 'b12', version: 'v1.3.9', appName: 'Auth Service', appIcon: 'Shield', status: 'FAILED', timestamp: '2026-05-13T22:00:00Z', relativeTime: '2 days ago', summary: 'Attempted OAuth2 PKCE flow — build failed on env vars', addedLines: 54, removedLines: 3 },
  { id: 'b11', version: 'v1.3.8', appName: 'Auth Service', appIcon: 'Shield', status: 'DEPLOYED', timestamp: '2026-05-13T14:00:00Z', relativeTime: '2 days ago', summary: 'Fixed auth flow redirect bug', addedLines: 18, removedLines: 22 },
  { id: 'b10', version: 'v1.3.7', appName: 'Inventory Manager', appIcon: 'Package', status: 'DEPLOYED', timestamp: '2026-05-12T11:00:00Z', relativeTime: '3 days ago', summary: 'Added bulk import CSV support', addedLines: 209, removedLines: 14 },
  { id: 'b09', version: 'v1.3.6', appName: 'Inventory Manager', appIcon: 'Package', status: 'BUILDING', timestamp: '2026-05-12T10:45:00Z', relativeTime: '3 days ago', summary: 'Refactoring stock level alerts', addedLines: 77, removedLines: 40 },
  { id: 'b08', version: 'v1.3.5', appName: 'Analytics Hub', appIcon: 'BarChart2', status: 'DEPLOYED', timestamp: '2026-05-11T08:00:00Z', relativeTime: '4 days ago', summary: 'Added cohort retention chart', addedLines: 185, removedLines: 29 },
  { id: 'b07', version: 'v1.3.4', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DRAFT', timestamp: '2026-05-10T17:00:00Z', relativeTime: '5 days ago', summary: 'Draft: experimental AI lead scoring widget', addedLines: 62, removedLines: 0 },
  { id: 'b06', version: 'v1.3.3', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-09T12:00:00Z', relativeTime: '6 days ago', summary: 'Multi-currency support for EUR and GBP', addedLines: 93, removedLines: 17 },
  { id: 'b05', version: 'v1.3.2', appName: 'Analytics Hub', appIcon: 'BarChart2', status: 'FAILED', timestamp: '2026-05-08T20:00:00Z', relativeTime: '7 days ago', summary: 'D3 upgrade caused chart rendering error', addedLines: 12, removedLines: 55 },
  { id: 'b04', version: 'v1.3.1', appName: 'Support Inbox', appIcon: 'MessageSquare', status: 'DEPLOYED', timestamp: '2026-05-07T09:30:00Z', relativeTime: '8 days ago', summary: 'Added Slack thread sync for tickets', addedLines: 171, removedLines: 8 },
  { id: 'b03', version: 'v1.2.0', appName: 'Support Inbox', appIcon: 'MessageSquare', status: 'DEPLOYED', timestamp: '2026-05-05T15:00:00Z', relativeTime: '10 days ago', summary: 'Initial email-to-ticket pipeline', addedLines: 442, removedLines: 0 },
  { id: 'b02', version: 'v1.1.0', appName: 'Auth Service', appIcon: 'Shield', status: 'DEPLOYED', timestamp: '2026-05-02T11:00:00Z', relativeTime: '13 days ago', summary: 'Role-based access control (RBAC) layer', addedLines: 288, removedLines: 34 },
  { id: 'b01', version: 'v1.0.0', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DEPLOYED', timestamp: '2026-04-28T09:00:00Z', relativeTime: '17 days ago', summary: 'Initial project scaffold and dashboard shell', addedLines: 620, removedLines: 0 },
];

const STATUS_FILTERS = ['ALL', 'DEPLOYED', 'BUILDING', 'FAILED', 'DRAFT'] as const;
const PAGE_SIZE = 10;

function AppIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'CreditCard': return <CreditCard className={cls} />;
    case 'LayoutDashboard': return <LayoutDashboard className={cls} />;
    case 'Shield': return <Shield className={cls} />;
    case 'Package': return <Package className={cls} />;
    case 'BarChart2': return <BarChart2 className={cls} />;
    case 'MessageSquare': return <MessageSquare className={cls} />;
    default: return <FileText className={cls} />;
  }
}

function StatusBadge({ status }: { status: BuildStatus }) {
  const config: Record<BuildStatus, { label: string; className: string }> = {
    DEPLOYED: { label: 'Deployed', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
    BUILDING: { label: 'Building', className: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400 animate-pulse' },
    FAILED: { label: 'Failed', className: 'border-red-500/40 bg-red-500/10 text-red-400' },
    DRAFT: { label: 'Draft', className: 'border-slate-600/40 bg-slate-700/30 text-slate-400' },
  };
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${className}`}>
      {status === 'DEPLOYED' && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === 'BUILDING' && <Clock className="mr-1 h-3 w-3" />}
      {status === 'FAILED' && <XCircle className="mr-1 h-3 w-3" />}
      {label}
    </span>
  );
}

type CompareState = { a: BuildEntry; b: BuildEntry | null };

export default function BuildHistoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BuildStatus>('ALL');
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const filtered = MOCK_BUILDS.filter((b) => {
    const matchSearch = search === '' || b.appName.toLowerCase().includes(search.toLowerCase()) || b.summary.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as 'ALL' | BuildStatus);
    setPage(1);
  }, []);

  const handleCompare = useCallback((entry: BuildEntry) => {
    setCompare((prev) => {
      if (!prev) return { a: entry, b: null };
      if (prev.a.id === entry.id) return null;
      return { a: prev.a, b: entry };
    });
  }, []);

  const dismissCompare = useCallback(() => setCompare(null), []);

  const isEmpty = filtered.length === 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Build History</h1>
              <p className="text-sm text-slate-400">All versions of your generated apps</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
            {filtered.length} {filtered.length === 1 ? 'build' : 'builds'}
          </span>
        </header>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by app name or change summary..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        {/* Compare banner */}
        {compare && (
          <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-200">
                <GitCompare className="h-4 w-4" />
                Compare mode
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-xl border border-indigo-400/30 bg-slate-900 px-3 py-1 font-mono text-indigo-300">{compare.a.version} — {compare.a.appName}</span>
                <span className="text-slate-500">vs</span>
                {compare.b ? (
                  <span className="rounded-xl border border-emerald-400/30 bg-slate-900 px-3 py-1 font-mono text-emerald-300">{compare.b.version} — {compare.b.appName}</span>
                ) : (
                  <span className="rounded-xl border border-dashed border-slate-600 px-3 py-1 text-slate-500">Select a second version below</span>
                )}
              </div>
              {compare.b && (
                <div className="flex items-start gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-300">{compare.a.version}</p>
                    <p className="mt-1 text-slate-500">{compare.a.summary}</p>
                    <p className="mt-1 font-mono"><span className="text-emerald-400">+{compare.a.addedLines}</span> <span className="text-red-400">-{compare.a.removedLines}</span></p>
                  </div>
                  <div className="border-l border-slate-700 pl-4">
                    <p className="font-bold text-slate-300">{compare.b.version}</p>
                    <p className="mt-1 text-slate-500">{compare.b.summary}</p>
                    <p className="mt-1 font-mono"><span className="text-emerald-400">+{compare.b.addedLines}</span> <span className="text-red-400">-{compare.b.removedLines}</span></p>
                  </div>
                </div>
              )}
              <button onClick={dismissCompare} className="ml-auto rounded-2xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Build list */}
        {isEmpty ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            <History className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-4 text-lg font-bold text-slate-400">No builds yet</p>
            <p className="mt-2 text-sm text-slate-500">Start building your first app in the App Builder to see version history here.</p>
            <Link href="/dsg/app-builder" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500">
              Open App Builder
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 h-full w-px bg-slate-800 sm:left-7" />
            <ol className="space-y-3">
              {paginated.map((entry) => {
                const isCompareA = compare?.a.id === entry.id;
                const isCompareB = compare?.b?.id === entry.id;
                const isSelected = isCompareA || isCompareB;
                return (
                  <li key={entry.id} className="relative pl-12 sm:pl-16">
                    {/* Timeline dot */}
                    <span className={`absolute left-3 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 sm:left-5 ${
                      entry.status === 'DEPLOYED' ? 'border-emerald-500 bg-emerald-500/20' :
                      entry.status === 'FAILED' ? 'border-red-500 bg-red-500/20' :
                      entry.status === 'BUILDING' ? 'border-indigo-500 bg-indigo-500/20' :
                      'border-slate-600 bg-slate-800'
                    }`} />

                    <article className={`rounded-3xl border bg-slate-900 p-5 transition ${
                      isSelected ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
                            <AppIcon name={entry.appIcon} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">{entry.version}</span>
                              <StatusBadge status={entry.status} />
                            </div>
                            <p className="mt-0.5 font-bold text-slate-100">{entry.appName}</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">{entry.relativeTime}</span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-300">{entry.summary}</p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        {/* Diff summary */}
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Plus className="h-3 w-3" />{entry.addedLines}
                          </span>
                          <span className="flex items-center gap-1 text-red-400">
                            <Minus className="h-3 w-3" />{entry.removedLines}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onMouseEnter={() => setTooltip(`view-${entry.id}`)}
                              onMouseLeave={() => setTooltip(null)}
                              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            {tooltip === `view-${entry.id}` && (
                              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-700 px-2 py-1 text-xs text-white">Preview this version</div>
                            )}
                          </div>
                          <div className="relative">
                            <button
                              onMouseEnter={() => setTooltip(`restore-${entry.id}`)}
                              onMouseLeave={() => setTooltip(null)}
                              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </button>
                            {tooltip === `restore-${entry.id}` && (
                              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-700 px-2 py-1 text-xs text-white">Restore to this version</div>
                            )}
                          </div>
                          <div className="relative">
                            <button
                              onMouseEnter={() => setTooltip(`compare-${entry.id}`)}
                              onMouseLeave={() => setTooltip(null)}
                              onClick={() => handleCompare(entry)}
                              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-bold transition ${
                                isSelected
                                  ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300'
                                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <GitCompare className="h-3.5 w-3.5" /> Compare
                            </button>
                            {tooltip === `compare-${entry.id}` && (
                              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-700 px-2 py-1 text-xs text-white">Select to compare versions</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Pagination */}
        {!isEmpty && totalPages > 1 && (
          <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900 px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
