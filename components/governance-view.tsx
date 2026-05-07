'use client';

import React from 'react';
import { AlertTriangle, Database, FileWarning, Key, Lock, RefreshCcw } from 'lucide-react';

const policyFields = [
  { id: 'policy_registry', name: 'Policy registry', state: 'Evidence missing', proof: 'No verified policy rows are connected to this UI yet.' },
  { id: 'policy_infractions', name: 'Policy infractions', state: 'Not claimed', proof: 'No real 30-day violation ledger has been wired into this screen.' },
  { id: 'rule_sync', name: 'Rule sync status', state: 'Not connected', proof: 'No sync job evidence or timestamp is available in this view.' },
];

const requiredEvidence = [
  { label: 'Policy source', detail: 'Supabase/API row source for policies, rules, and version history.' },
  { label: 'Infraction ledger', detail: 'Real audit rows with timestamp, actor, rule id, decision, and evidence hash.' },
  { label: 'Sync proof', detail: 'Last sync job id, status, source hash, and updated_at proof.' },
];

export function GovernanceView() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">Governance Policies</h1>
          <p className="mt-1 text-slate-500">Shows only verified governance evidence. Missing data stays missing; no demo counts are displayed.</p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-100">No mock metrics</span>
      </div>

      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
          <AlertTriangle className="h-4 w-4" /> Truth boundary
        </div>
        <p className="mt-3">The previous numbers such as active policy count, 30-day infractions, and synced status were unverified UI seed data. They are removed until real policy/audit/sync evidence exists.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Active Policies', val: 'Evidence missing', icon: Lock },
          { label: 'Policy Infractions (30d)', val: 'Not claimed', icon: FileWarning, color: 'text-rose-400' },
          { label: 'Rule Sync Status', val: 'Not connected', icon: RefreshCcw, color: 'text-amber-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-2 flex items-start justify-between text-slate-400">
                <span className="text-sm font-medium">{item.label}</span>
                <Icon className={`h-4 w-4 ${item.color || 'text-slate-500'}`} />
              </div>
              <div className="text-xl font-black text-slate-200">{item.val}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Connect real governance rows before showing counts or green status.</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="font-semibold text-slate-200">Governance evidence fields</h3>
          <button disabled className="text-sm font-medium text-slate-600">Create Rule disabled</button>
        </div>
        <div className="divide-y divide-slate-800">
          {policyFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                  <Key className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-200">{field.name}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{field.proof}</p>
                </div>
              </div>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100">{field.state}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
          <Database className="h-4 w-4" /> Required before showing numbers
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {requiredEvidence.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="font-semibold text-slate-200">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
