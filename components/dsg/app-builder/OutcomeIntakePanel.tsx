'use client';

import { useState } from 'react';
import type { DsgOutcomePlan } from '@/lib/dsg/app-builder/outcome-intake';

type OutcomeError = { ok: false; error: { code: string; message: string }; nextAction: string };

export function OutcomeIntakePanel() {
  const [goal, setGoal] = useState('');
  const [targetUsers, setTargetUsers] = useState('operators, reviewers');
  const [successOutcome, setSuccessOutcome] = useState('User can see a useful first workflow and the missing evidence before production.');
  const [availableData, setAvailableData] = useState('existing customer or workflow data');
  const [requiredIntegrations, setRequiredIntegrations] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'regulated'>('medium');
  const [productionIntent, setProductionIntent] = useState(false);
  const [result, setResult] = useState<DsgOutcomePlan | OutcomeError | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitOutcome() {
    setLoading(true);
    try {
      const response = await fetch('/api/dsg/app-builder/outcome', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal, targetUsers, successOutcome, availableData, requiredIntegrations, riskLevel, productionIntent }),
      });
      const json = (await response.json()) as DsgOutcomePlan | OutcomeError;
      setResult(json);
    } catch (error) {
      setResult({
        ok: false,
        error: {
          code: 'OUTCOME_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unable to reach outcome intake API.',
        },
        nextAction: 'Check the network/API route and retry; do not proceed as production-ready without a validated outcome plan.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[#f2ca50]/20 bg-[#0f151f]/90 p-5 shadow-[0_0_42px_rgba(242,202,80,0.10)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#f2ca50]">Outcome intake</p>
          <h2 className="mt-2 text-2xl font-black text-white">อยากสร้างแอปอะไร?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">เริ่มจากผลลัพธ์ผู้ใช้ก่อน แล้วระบบจะแนะนำ template, PRD draft, readiness impact และ next action โดยไม่อ้างว่า production-ready</p>
        </div>
        <button onClick={submitOutcome} disabled={loading} className="rounded-full border border-[#f2ca50]/40 bg-[#f2ca50]/15 px-5 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-[#ffe8a3] disabled:opacity-60">
          {loading ? 'Checking…' : 'Create outcome plan'}
        </button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-bold text-slate-200 lg:col-span-2">อยากสร้างแอปอะไร
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="เช่น สร้าง CRM ทีมเล็กที่บันทึกลูกค้า งาน และสถานะดีล" className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#f2ca50]/60" />
        </label>
        <label className="block text-sm font-bold text-slate-200">ใครใช้
          <input value={targetUsers} onChange={(event) => setTargetUsers(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#f2ca50]/60" />
        </label>
        <label className="block text-sm font-bold text-slate-200">ผลลัพธ์ที่ต้องเห็น
          <input value={successOutcome} onChange={(event) => setSuccessOutcome(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#f2ca50]/60" />
        </label>
        <label className="block text-sm font-bold text-slate-200">ข้อมูลที่มี
          <input value={availableData} onChange={(event) => setAvailableData(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#f2ca50]/60" />
        </label>
        <label className="block text-sm font-bold text-slate-200">ข้อจำกัดด้านความเสี่ยง / integrations
          <input value={requiredIntegrations} onChange={(event) => setRequiredIntegrations(event.target.value)} placeholder="Stripe, SSO, email, marketplace entitlement" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#f2ca50]/60" />
        </label>
        <div className="flex flex-wrap gap-3 lg:col-span-2">
          <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as typeof riskLevel)} className="rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-white">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="regulated">regulated</option>
          </select>
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" checked={productionIntent} onChange={(event) => setProductionIntent(event.target.checked)} /> production intent
          </label>
        </div>
      </div>
      {result ? (
        <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          {'ok' in result && result.ok ? (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Next action</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{result.nextAction}</p>
              <p className="mt-3 text-sm text-slate-300">Suggested templates: {result.suggestedTemplateIds.join(', ')}</p>
              <p className="mt-2 text-sm text-slate-300">Readiness impact: {Object.entries(result.readinessImpact).filter(([, value]) => value).map(([key]) => key).join(', ') || 'planning only'}</p>
            </div>
          ) : (
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-rose-200">{result.error.code}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{result.error.message}</p>
              <p className="mt-2 text-sm leading-6 text-amber-100">Next: {result.nextAction}</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
