'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileWarning,
  Key,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { catalog } from '@/lib/ccvs/catalog';

const STATUS_BADGE = {
  'pending-implementation': { label: 'Pending', color: 'text-amber-300', Icon: Clock },
  'in-progress': { label: 'In Progress', color: 'text-blue-300', Icon: Zap },
  complete: { label: 'Complete', color: 'text-emerald-300', Icon: CheckCircle2 },
} as const;

const policyFields = [
  { id: 'policy_registry', name: 'Policy registry', state: 'ต้องผูก evidence source', proof: 'Supabase/API row source สำหรับ policy, rule และ version history', next: 'ใช้หน้า สร้างแอป เพื่อสร้าง proof ก่อน' },
  { id: 'policy_infractions', name: 'Policy infractions', state: 'ยังไม่เคลมตัวเลข', proof: 'ต้องมี audit rows พร้อม timestamp, actor, rule id, decision และ evidence hash', next: 'ดูหลักฐานที่ต้องเก็บ' },
  { id: 'rule_sync', name: 'Rule sync status', state: 'รอ sync proof', proof: 'ต้องมี sync job id, status, source hash และ updated_at', next: 'ดาวน์โหลด governance checklist' },
];

const requiredEvidence = [
  { label: 'Policy source', detail: 'Supabase/API row source for policies, rules, and version history.' },
  { label: 'Infraction ledger', detail: 'Real audit rows with timestamp, actor, rule id, decision, and evidence hash.' },
  { label: 'Sync proof', detail: 'Last sync job id, status, source hash, and updated_at proof.' },
];

function goTo(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function GovernanceView() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return policyFields;
    return policyFields.filter((field) =>
      `${field.name} ${field.state} ${field.proof} ${field.next}`.toLowerCase().includes(q),
    );
  }, [query]);

  const checklist = useMemo(
    () =>
      [
        'DSG Governance proof checklist',
        ...requiredEvidence.map((item) => `- ${item.label}: ${item.detail}`),
        '',
        'Rule: do not show policy counts, infraction counts, or green sync state until real evidence exists.',
      ].join('\n'),
    [],
  );

  async function copyChecklist() {
    await navigator.clipboard.writeText(checklist);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadChecklist() {
    const blob = new Blob([checklist], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dsg-governance-checklist.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">กำกับดูแล</h1>
          <p className="mt-1 text-slate-500">
            ผู้ใช้เห็นชัดว่าต้องมีหลักฐานอะไร ก่อนระบบจะแสดงตัวเลข policy หรือ claim สีเขียว
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => goTo('executions')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
          >
            ดูหลักฐาน
          </button>
          <button
            onClick={() => void copyChecklist()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            <Clipboard className="h-4 w-4" /> {copied ? 'คัดลอกแล้ว' : 'Copy checklist'}
          </button>
          <button
            onClick={downloadChecklist}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>

      {/* ── truth boundary ── */}
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
          <AlertTriangle className="h-4 w-4" /> Truth boundary
        </div>
        <p className="mt-3">
          ไม่แสดง active policy count, 30-day infractions หรือ synced status ถ้ายังไม่มี
          row/source จริง. ผู้ใช้กด copy/download checklist ไปใช้เก็บหลักฐานได้ทันที.
        </p>
      </div>

      {/* ── stat cards ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Active Policies', val: 'รอ evidence source', icon: Lock },
          { label: 'Policy Infractions', val: 'ยังไม่เคลม', icon: FileWarning, color: 'text-rose-400' },
          { label: 'Rule Sync Status', val: 'รอ sync proof', icon: RefreshCcw, color: 'text-amber-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => goTo('executions')}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-indigo-500/40 hover:bg-slate-800/60"
            >
              <div className="mb-2 flex items-start justify-between text-slate-400">
                <span className="text-sm font-medium">{item.label}</span>
                <Icon className={`h-4 w-4 ${item.color ?? 'text-slate-500'}`} />
              </div>
              <div className="text-xl font-black text-slate-200">{item.val}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                กดเพื่อดู evidence map ที่ต้องเก็บก่อนแสดงตัวเลข
              </p>
            </button>
          );
        })}
      </div>

      {/* ── search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหา governance proof เช่น policy, sync, audit..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40"
        />
      </div>

      {/* ── evidence fields table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="font-semibold text-slate-200">Governance evidence fields</h3>
          <button
            onClick={() => goTo('chat')}
            className="text-sm font-bold text-indigo-300 hover:text-indigo-200"
          >
            สร้าง proof จากงานจริง
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {rows.map((field) => (
            <div
              key={field.id}
              className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                  <Key className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">{field.name}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{field.proof}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  goTo(field.id === 'policy_registry' ? 'chat' : 'executions')
                }
                className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-500/20"
              >
                {field.state}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── required evidence ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
          <Database className="h-4 w-4" /> Required before showing numbers
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {requiredEvidence.map((item) => (
            <button
              key={item.label}
              onClick={() => goTo('executions')}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-indigo-500/30"
            >
              <p className="font-semibold text-slate-200">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── CCVS Control Catalog summary ── */}
      <div className="rounded-xl border border-indigo-500/20 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
            <ShieldCheck className="h-4 w-4" /> CCVS Control Catalog
          </div>
          <Link
            href="/dsg/governance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-indigo-200"
          >
            ดู catalog ทั้งหมด <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mb-4 text-xs leading-5 text-slate-500">
          {catalog.controls.length} controls จาก 5 families — v{catalog.schema_version}
           · updated {catalog.last_updated}
        </p>
        <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
          {catalog.controls.map((ctrl) => {
            const st = STATUS_BADGE[ctrl.corrective_action_status];
            const StatusIcon = st.Icon;
            return (
              <div
                key={ctrl.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-600">{ctrl.id}</span>
                  <span className="text-sm font-medium text-slate-300">{ctrl.name}</span>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold ${st.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
        <Link
          href="/dsg/governance"
          className="mt-4 flex w-full items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 py-2 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/20"
        >
          เปิด Control Catalog Dashboard
        </Link>
      </div>
    </div>
  );
}
