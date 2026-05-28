'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Layers,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import {
  catalog,
  type ControlEntry,
  type ControlFamily,
  type CorrectiveActionStatus,
} from '@/lib/ccvs/catalog';

// ── display config ──────────────────────────────────────────────────────────

type FamilyStyle = { label: string; color: string; bg: string; border: string };
const FAMILY_STYLE: Record<ControlFamily, FamilyStyle> = {
  'software-supply-chain': {
    label: 'Supply Chain',
    color: 'text-indigo-300',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/30',
  },
  testing: {
    label: 'Testing',
    color: 'text-violet-300',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
  },
  'human-oversight': {
    label: 'Human Oversight',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  sbom: {
    label: 'SBOM',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
  },
  'immutable-retention': {
    label: 'Retention',
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
  },
};

type StatusStyle = {
  label: string;
  color: string;
  bg: string;
  border: string;
  Icon: React.ElementType;
};
const STATUS_STYLE: Record<CorrectiveActionStatus, StatusStyle> = {
  'pending-implementation': {
    label: 'Pending',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    Icon: Clock,
  },
  'in-progress': {
    label: 'In Progress',
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    Icon: Zap,
  },
  complete: {
    label: 'Complete',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    Icon: CheckCircle2,
  },
};

const ALL_FAMILIES = Object.keys(FAMILY_STYLE) as ControlFamily[];
const ALL_STATUSES = Object.keys(STATUS_STYLE) as CorrectiveActionStatus[];

// ── ControlCard ─────────────────────────────────────────────────────────────

function ControlCard({
  control,
  expanded,
  onToggle,
}: {
  control: ControlEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const fam = FAMILY_STYLE[control.family];
  const st = STATUS_STYLE[control.corrective_action_status];
  const StatusIcon = st.Icon;

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 transition hover:border-slate-700">
      {/* top row */}
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-slate-400">
            {control.id}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              fam.color
            } ${fam.bg} ${fam.border}`}
          >
            {fam.label}
          </span>
          <span className="rounded border border-slate-800 bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-slate-500">
            {control.evidence_type}
          </span>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            st.color
          } ${st.bg} ${st.border}`}
        >
          <StatusIcon className="h-3 w-3" />
          {st.label}
        </span>
      </div>

      {/* body */}
      <div className="px-5 pb-4">
        <h3 className="font-semibold text-slate-100">{control.name}</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-400">{control.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {control.owner}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {control.frequency}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {control.requirements.map((req) => (
            <span
              key={req}
              className="rounded border border-slate-700/60 bg-slate-800/50 px-2 py-0.5 font-mono text-xs text-slate-400"
            >
              {req}
            </span>
          ))}
        </div>
      </div>

      {/* expand toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between rounded-b-xl border-t border-slate-800 px-5 py-3 text-xs font-medium text-slate-500 transition hover:bg-slate-800/40 hover:text-slate-300"
      >
        <span>Acceptance criteria</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="rounded-b-xl border-t border-slate-800 bg-slate-950/60 px-5 py-4">
          <p className="text-sm leading-6 text-slate-400">{control.acceptance_criteria}</p>
        </div>
      )}
    </div>
  );
}

// ── CcvsControlCatalogView ──────────────────────────────────────────────────

export function CcvsControlCatalogView() {
  const [query, setQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState<ControlFamily | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CorrectiveActionStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const controls = catalog.controls;

  const stats = useMemo(
    () => ({
      total: controls.length,
      pending: controls.filter((c) => c.corrective_action_status === 'pending-implementation').length,
      inProgress: controls.filter((c) => c.corrective_action_status === 'in-progress').length,
      complete: controls.filter((c) => c.corrective_action_status === 'complete').length,
    }),
    [controls],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return controls.filter((c) => {
      if (familyFilter !== 'all' && c.family !== familyFilter) return false;
      if (statusFilter !== 'all' && c.corrective_action_status !== statusFilter) return false;
      if (q) {
        const hay =
          `${c.id} ${c.name} ${c.description} ${c.requirements.join(' ')} ${c.owner}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [controls, familyFilter, statusFilter, query]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      {/* header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          CCVS Control Catalog
        </h1>
        <p className="mt-1 text-slate-500">{catalog.description}</p>
        <p className="mt-1 text-xs text-slate-600">
          v{catalog.schema_version} · updated {catalog.last_updated}
        </p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          { label: 'Total Controls', value: stats.total, Icon: Layers, color: 'text-slate-300' },
          { label: 'Pending', value: stats.pending, Icon: Clock, color: 'text-amber-300' },
          { label: 'In Progress', value: stats.inProgress, Icon: Zap, color: 'text-blue-300' },
          { label: 'Complete', value: stats.complete, Icon: CheckCircle2, color: 'text-emerald-300' },
        ] as const).map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className={`mt-2 text-3xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* claim gate notice */}
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
          <AlertTriangle className="h-4 w-4" /> Claim Gate Boundary
        </div>
        <p className="mt-2 leading-6 text-slate-300">
          ควบคุมที่มีสถานะ <span className="font-bold text-amber-300">Pending</span>{' '}
          ยังไม่มี signed evidence ครบ — ห้ามนำไป assert{' '}
          <span className="font-bold text-slate-200">&ldquo;Claim Passed&rdquo;</span>{' '}
          ต่อ auditor จนกว่าจะผ่าน acceptance criteria ทุกข้อ
        </p>
      </div>

      {/* filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา control เช่น CTRL-002, testing, ISO42001…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Family:</span>
          {(['all', ...ALL_FAMILIES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFamilyFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                familyFilter === f
                  ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'ทั้งหมด' : FAMILY_STYLE[f].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          {(['all', ...ALL_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {s === 'all' ? 'ทั้งหมด' : STATUS_STYLE[s].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-600">
          แสดง {filtered.length} จาก {controls.length} controls
        </p>
      </div>

      {/* control grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-12 text-center text-slate-500">
          ไม่พบ control ที่ตรงกับเงื่อนไขที่เลือก
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((ctrl) => (
            <ControlCard
              key={ctrl.id}
              control={ctrl}
              expanded={expanded.has(ctrl.id)}
              onToggle={() => toggleExpand(ctrl.id)}
            />
          ))}
        </div>
      )}

      {/* requirement registry */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <Database className="h-4 w-4" /> Requirement Registry
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(catalog.requirement_registry).map(([key, val]) => (
            <div
              key={key}
              className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-4 py-3"
            >
              <span className="font-mono text-xs font-bold text-indigo-300">{key}</span>
              <p className="mt-1 text-xs leading-5 text-slate-500">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
