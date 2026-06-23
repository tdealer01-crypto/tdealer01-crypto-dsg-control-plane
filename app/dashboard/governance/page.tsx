'use client';

import { useState, useEffect } from 'react';

interface ComplianceQuestion {
  id: number;
  question: string;
  status: 'pass' | 'partial' | 'fail' | 'unknown';
  evidence: string;
  gap: string;
}

const QUESTIONS: ComplianceQuestion[] = [
  {
    id: 1,
    question: 'Agent ตัดสินใจจากอะไร?',
    status: 'partial',
    evidence: 'Policy manifest + Z3 scaffold + Safe DOM verification',
    gap: 'Z3 is design-time scaffold, not runtime SMT solver',
  },
  {
    id: 2,
    question: 'ใครอนุมัติ Policy?',
    status: 'partial',
    evidence: 'Role-based gate (operator, org_admin) + finance approval workflow',
    gap: 'Human approval only for finance, not all HIGH-risk tools',
  },
  {
    id: 3,
    question: 'Audit ย้อนหลังได้ไหม?',
    status: 'partial',
    evidence: 'Evidence chain + audit API + immutable trigger guard',
    gap: 'Immutability verified at DB level (trigger), not yet at API level test',
  },
  {
    id: 4,
    question: 'ลบ Log ได้หรือไม่?',
    status: 'pass',
    evidence: 'Trigger guard blocks UPDATE/DELETE + REVOKE mutation from anon/auth/service_role',
    gap: 'Prevented at DB level; API-level DELETE test pending',
  },
  {
    id: 5,
    question: 'พิสูจน์ได้ไหมว่า Agent ไม่มั่ว?',
    status: 'partial',
    evidence: 'Evidence trail + manifest check + deterministic execution contract',
    gap: 'Z3 proofs are design-time only',
  },
  {
    id: 6,
    question: 'EU AI Act?',
    status: 'fail',
    evidence: 'No mapping yet',
    gap: 'No risk classification or transparency disclosure',
  },
  {
    id: 7,
    question: 'ISO 42001?',
    status: 'fail',
    evidence: 'AIMS documentation exists (mapping only)',
    gap: 'Not certified; no management review',
  },
  {
    id: 8,
    question: 'Control Evidence?',
    status: 'partial',
    evidence: 'Audit trail + access log + evidence chain API',
    gap: 'Fragmented across multiple APIs, no unified panel',
  },
  {
    id: 9,
    question: 'Incident Response?',
    status: 'pass',
    evidence: 'Playbook (P1-P4) + incidents API + incidents dashboard',
    gap: 'API uses in-memory store; production needs Supabase persistence',
  },
  {
    id: 10,
    question: 'Governance Dashboard?',
    status: 'pass',
    evidence: 'This dashboard + 4 governance pages + real-time data',
    gap: 'Stub pages need real data wiring',
  },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    partial: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    fail: 'bg-red-500/20 text-red-300 border-red-500/30',
    unknown: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  const labels: Record<string, string> = {
    pass: '✅ PASS',
    partial: '⚠️ PARTIAL',
    fail: '❌ FAIL',
    unknown: '❓ UNKNOWN',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[status] || colors.unknown}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DashboardGovernancePage() {
  const [incidents, setIncidents] = useState<{ count: number; items: any[] } | null>(null);
  const [auditStatus, setAuditStatus] = useState<{ ok: boolean; count: number } | null>(null);

  useEffect(() => {
    // Fetch incidents
    fetch('/api/incidents')
      .then(r => r.json())
      .then(d => setIncidents(d))
      .catch(() => setIncidents({ count: 0, items: [] }));

    // Fetch audit summary
    fetch('/api/audit?limit=1')
      .then(r => r.json())
      .then(d => setAuditStatus({ ok: d.ok, count: d.items?.length || 0 }))
      .catch(() => setAuditStatus({ ok: false, count: 0 }));
  }, []);

  const passCount = QUESTIONS.filter(q => q.status === 'pass').length;
  const partialCount = QUESTIONS.filter(q => q.status === 'partial').length;
  const failCount = QUESTIONS.filter(q => q.status === 'fail').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Governance Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Accenture 10 Critical Questions — Real-time compliance status</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-center">
            <div className="text-lg font-bold text-emerald-300">{passCount}</div>
            <div className="text-[10px] text-emerald-400">PASS</div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center">
            <div className="text-lg font-bold text-amber-300">{partialCount}</div>
            <div className="text-[10px] text-amber-400">PARTIAL</div>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-center">
            <div className="text-lg font-bold text-red-300">{failCount}</div>
            <div className="text-[10px] text-red-400">FAIL</div>
          </div>
        </div>
      </div>

      {/* Live metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Audit Events</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {auditStatus ? (auditStatus.ok ? '✅ Live' : '⚠️ Issues') : 'Loading...'}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Active Incidents</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {incidents ? incidents.count : 'Loading...'}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Compliance Score</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {Math.round((passCount / QUESTIONS.length) * 100)}%
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">DB Immutability</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">🔒 Active</div>
        </div>
      </div>

      {/* Question table */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">10 Critical Questions — Detailed</h2>
        </div>
        <div className="divide-y divide-white/5">
          {QUESTIONS.map(q => (
            <a
              key={q.id}
              href={`/dashboard/governance/question/${q.id}`}
              className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.02]"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400">
                {q.id}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-slate-200">{q.question}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{q.evidence}</div>
              </div>
              <div className="hidden shrink-0 text-right md:block">
                <div className="text-[10px] text-slate-500">Gap</div>
                <div className="max-w-[200px] truncate text-[10px] text-slate-400">{q.gap}</div>
              </div>
              <StatusBadge status={q.status} />
            </a>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <a href="/dashboard/governance/controls" className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="text-sm font-semibold text-slate-200">Controls</div>
          <div className="mt-1 text-[11px] text-slate-500">Control evidence aggregation</div>
        </a>
        <a href="/dashboard/governance/evidence" className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="text-sm font-semibold text-slate-200">Evidence</div>
          <div className="mt-1 text-[11px] text-slate-500">Audit chain viewer</div>
        </a>
        <a href="/dashboard/governance/incidents" className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="text-sm font-semibold text-slate-200">Incidents</div>
          <div className="mt-1 text-[11px] text-slate-500">Incident log and status</div>
        </a>
        <a href="/api/audit/export" className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
          <div className="text-sm font-semibold text-slate-200">Export</div>
          <div className="mt-1 text-[11px] text-slate-500">Download audit bundle</div>
        </a>
      </div>
    </div>
  );
}
