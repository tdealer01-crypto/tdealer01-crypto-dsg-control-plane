'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayoutPolicy {
  org_id?: string;
  max_payout_amount: number;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  max_payouts_per_day: number;
  min_minutes_between_payouts: number;
  allowed_currency: string;
  allowed_destinations: string[];
  new_destination_hold_hours: number;
  low_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  medium_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  high_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  critical_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  approval_threshold_amount: number;
  two_person_approval_threshold: number | null;
  allowed_days: string[];
  allowed_time_start: string;
  allowed_time_end: string;
  automation_enabled: boolean;
  emergency_paused: boolean;
}

const DEFAULT_POLICY: PayoutPolicy = {
  max_payout_amount: 50000,
  daily_limit: 100000,
  weekly_limit: 500000,
  monthly_limit: 2000000,
  max_payouts_per_day: 3,
  min_minutes_between_payouts: 120,
  allowed_currency: 'THB',
  allowed_destinations: [],
  new_destination_hold_hours: 24,
  low_risk_action: 'ALLOW',
  medium_risk_action: 'REVIEW',
  high_risk_action: 'REVIEW',
  critical_risk_action: 'BLOCK',
  approval_threshold_amount: 50000,
  two_person_approval_threshold: null,
  allowed_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  allowed_time_start: '09:00',
  allowed_time_end: '18:00',
  automation_enabled: true,
  emergency_paused: false,
};

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const ACTIONS = ['ALLOW', 'REVIEW', 'BLOCK'] as const;

// ─── Simulation state ─────────────────────────────────────────────────────────

interface SimInput {
  amount: string;
  currency: string;
  destination_is_new: boolean;
  destination_id: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | '';
  requested_at: string;
  payout_count_today: string;
  minutes_since_last_payout: string;
  daily_total_so_far: string;
  weekly_total_so_far: string;
  monthly_total_so_far: string;
}

interface CheckResult { rule: string; passed: boolean; detail: string; }
interface SimResult {
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reason: string;
  reason_code: string;
  required_approval: string | null;
  checks: CheckResult[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children?: unknown }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">{title}</h2>
      {children as never}
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children?: unknown }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-200">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children as never}
    </div>
  );
}

function NumInput({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
    />
  );
}

function ActionSelect({ value, onChange }: { value: string; onChange: (v: 'ALLOW' | 'REVIEW' | 'BLOCK') => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'ALLOW' | 'REVIEW' | 'BLOCK')}
      className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
    >
      {ACTIONS.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  );
}

function DecisionBadge({ d }: { d: 'ALLOW' | 'REVIEW' | 'BLOCK' }) {
  const cls = {
    ALLOW: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    REVIEW: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    BLOCK: 'bg-red-500/20 text-red-300 border border-red-500/30',
  }[d];
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${cls}`}>{d}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayoutSafetyPage() {
  const [policy, setPolicy] = useState<PayoutPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [newDest, setNewDest] = useState('');

  const [simInput, setSimInput] = useState<SimInput>({
    amount: '75000',
    currency: 'THB',
    destination_is_new: false,
    destination_id: '',
    risk_level: 'MEDIUM',
    requested_at: new Date().toISOString().slice(0, 16),
    payout_count_today: '0',
    minutes_since_last_payout: '',
    daily_total_so_far: '0',
    weekly_total_so_far: '0',
    monthly_total_so_far: '0',
  });
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetch('/api/payout-safety/policy')
      .then((r) => r.json())
      .then((d) => { if (d.policy) setPolicy({ ...DEFAULT_POLICY, ...d.policy }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof PayoutPolicy>(key: K, value: PayoutPolicy[K]) {
    setPolicy((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/payout-safety/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  }

  async function toggleEmergency() {
    setEmergencyLoading(true);
    const next = !policy.emergency_paused;
    try {
      const r = await fetch('/api/payout-safety/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: next }),
      });
      if (r.ok) set('emergency_paused', next);
    } finally { setEmergencyLoading(false); }
  }

  async function simulate() {
    setSimLoading(true);
    setSimResult(null);
    try {
      const r = await fetch('/api/payout-safety/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            amount: Number(simInput.amount),
            currency: simInput.currency,
            destination_is_new: simInput.destination_is_new,
            destination_id: simInput.destination_id || undefined,
            risk_level: simInput.risk_level || undefined,
            requested_at: simInput.requested_at ? new Date(simInput.requested_at).toISOString() : undefined,
            payout_count_today: simInput.payout_count_today ? Number(simInput.payout_count_today) : 0,
            minutes_since_last_payout: simInput.minutes_since_last_payout ? Number(simInput.minutes_since_last_payout) : null,
            daily_total_so_far: Number(simInput.daily_total_so_far),
            weekly_total_so_far: Number(simInput.weekly_total_so_far),
            monthly_total_so_far: Number(simInput.monthly_total_so_far),
          },
        }),
      });
      const d = await r.json();
      if (d.result) setSimResult(d.result as SimResult);
    } finally { setSimLoading(false); }
  }

  function toggleDay(day: string) {
    const days = policy.allowed_days.includes(day)
      ? policy.allowed_days.filter((d) => d !== day)
      : [...policy.allowed_days, day];
    set('allowed_days', days);
  }

  function addDest() {
    const v = newDest.trim();
    if (!v || policy.allowed_destinations.includes(v)) return;
    set('allowed_destinations', [...policy.allowed_destinations, v]);
    setNewDest('');
  }

  function removeDest(d: string) {
    set('allowed_destinations', policy.allowed_destinations.filter((x) => x !== d));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex h-64 items-center justify-center">
          <p className="text-sm text-slate-400">Loading payout safety settings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Payout Safety Settings"
            description="Control when and how money leaves your account — every payout is checked against these rules automatically."
          />
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              onClick={toggleEmergency}
              disabled={emergencyLoading}
              className={`rounded px-4 py-2 text-sm font-bold transition-all ${
                policy.emergency_paused
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-red-600 text-white hover:bg-red-500'
              } disabled:opacity-50`}
            >
              {emergencyLoading ? '…' : policy.emergency_paused ? '▶ Resume Payouts' : '⏸ Emergency Stop'}
            </button>
            {policy.emergency_paused && (
              <span className="text-xs font-semibold text-red-400">ALL PAYOUTS PAUSED</span>
            )}
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Automation" value={policy.automation_enabled ? 'ON' : 'OFF'} ok={policy.automation_enabled} />
            <Stat label="Emergency" value={policy.emergency_paused ? 'PAUSED' : 'Active'} ok={!policy.emergency_paused} />
            <Stat label="Max per payout" value={`${policy.max_payout_amount.toLocaleString()} ${policy.allowed_currency}`} ok />
            <Stat label="Daily limit" value={`${policy.daily_limit.toLocaleString()} ${policy.allowed_currency}`} ok />
          </div>
        </Card>

      {/* Automation toggle */}
      <Section title="General">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Payout automation</p>
            <p className="text-xs text-slate-500">When off, all payouts require manual review</p>
          </div>
          <button
            onClick={() => set('automation_enabled', !policy.automation_enabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${policy.automation_enabled ? 'bg-blue-600' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${policy.automation_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="mt-4">
          <Field label="Currency">
            <input
              value={policy.allowed_currency}
              onChange={(e) => set('allowed_currency', e.target.value.toUpperCase())}
              maxLength={3}
              className="w-28 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {/* Amount Limits */}
      <Section title="Amount Limits">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`Max per payout (${policy.allowed_currency})`} hint="Single payout cap — exceeding triggers REVIEW or BLOCK">
            <NumInput value={policy.max_payout_amount} onChange={(v) => set('max_payout_amount', v)} />
          </Field>
          <Field label={`Daily limit (${policy.allowed_currency})`} hint="Total payouts per calendar day">
            <NumInput value={policy.daily_limit} onChange={(v) => set('daily_limit', v)} />
          </Field>
          <Field label={`Weekly limit (${policy.allowed_currency})`}>
            <NumInput value={policy.weekly_limit} onChange={(v) => set('weekly_limit', v)} />
          </Field>
          <Field label={`Monthly limit (${policy.allowed_currency})`}>
            <NumInput value={policy.monthly_limit} onChange={(v) => set('monthly_limit', v)} />
          </Field>
        </div>
      </Section>

      {/* Frequency */}
      <Section title="Frequency Limits">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Max payouts per day" hint="Blocks once this count is reached today">
            <NumInput value={policy.max_payouts_per_day} min={1} onChange={(v) => set('max_payouts_per_day', v)} />
          </Field>
          <Field label="Min minutes between payouts" hint="Prevents rapid-fire payouts">
            <NumInput value={policy.min_minutes_between_payouts} onChange={(v) => set('min_minutes_between_payouts', v)} />
          </Field>
        </div>
      </Section>

      {/* Destinations */}
      <Section title="Allowed Destinations">
        <p className="mb-3 text-xs text-slate-500">
          If the list is empty, all destinations are allowed. Add account IDs to restrict to an allowlist.
        </p>
        <div className="mb-3 flex gap-2">
          <input
            value={newDest}
            onChange={(e) => setNewDest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDest()}
            placeholder="Account ID or bank ref"
            className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <button onClick={addDest} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">
            + Add
          </button>
        </div>
        {policy.allowed_destinations.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No allowlist — all destinations permitted</p>
        ) : (
          <ul className="space-y-1">
            {policy.allowed_destinations.map((d) => (
              <li key={d} className="flex items-center justify-between rounded bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
                <span className="font-mono">{d}</span>
                <button onClick={() => removeDest(d)} className="text-slate-500 hover:text-red-400">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Field label="New destination hold period (hours)" hint="Auto-payouts are blocked for this many hours after a new destination is added">
            <NumInput value={policy.new_destination_hold_hours} onChange={(v) => set('new_destination_hold_hours', v)} />
          </Field>
        </div>
      </Section>

      {/* Risk Threshold */}
      <Section title="Risk Automation Rules">
        <p className="mb-4 text-xs text-slate-500">Define what happens automatically for each risk level.</p>
        <div className="space-y-3">
          {(['low', 'medium', 'high', 'critical'] as const).map((level) => {
            const key = `${level}_risk_action` as keyof PayoutPolicy;
            return (
              <div key={level} className="flex items-center gap-4">
                <div className="w-24 shrink-0">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    level === 'low' ? 'bg-emerald-500/20 text-emerald-300' :
                    level === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                    level === 'high' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {level.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <ActionSelect
                    value={policy[key] as string}
                    onChange={(v) => set(key, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Time Window */}
      <Section title="Allowed Payout Window">
        <div className="mb-4">
          <p className="mb-2 text-sm text-slate-300">Days</p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                  policy.allowed_days.includes(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Allowed from (UTC)">
            <input
              type="time"
              value={policy.allowed_time_start}
              onChange={(e) => set('allowed_time_start', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Allowed until (UTC)">
            <input
              type="time"
              value={policy.allowed_time_end}
              onChange={(e) => set('allowed_time_end', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {/* Approval Rules */}
      <Section title="Approval Rules">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={`Admin approval threshold (${policy.allowed_currency})`}
            hint="Payouts at or above this amount require admin approval"
          >
            <NumInput value={policy.approval_threshold_amount} onChange={(v) => set('approval_threshold_amount', v)} />
          </Field>
          <Field
            label={`2-person approval threshold (${policy.allowed_currency})`}
            hint="Requires two approvers — leave 0 to disable"
          >
            <NumInput
              value={policy.two_person_approval_threshold ?? 0}
              onChange={(v) => set('two_person_approval_threshold', v > 0 ? v : null)}
            />
          </Field>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      </div>

      {/* Simulation */}
      <Section title="Test with Simulation">
        <p className="mb-4 text-xs text-slate-500">
          Enter a hypothetical payout to see exactly which rules would trigger — without affecting real payouts.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={`Amount (${policy.allowed_currency})`}>
            <input
              type="number"
              value={simInput.amount}
              onChange={(e) => setSimInput((s) => ({ ...s, amount: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Risk level">
            <select
              value={simInput.risk_level}
              onChange={(e) => setSimInput((s) => ({ ...s, risk_level: e.target.value as SimInput['risk_level'] }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Not specified —</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Requested at (local time)">
            <input
              type="datetime-local"
              value={simInput.requested_at}
              onChange={(e) => setSimInput((s) => ({ ...s, requested_at: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Destination">
            <div className="flex items-center gap-3">
              <input
                value={simInput.destination_id}
                onChange={(e) => setSimInput((s) => ({ ...s, destination_id: e.target.value }))}
                placeholder="Account ID (optional)"
                className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={simInput.destination_is_new}
                  onChange={(e) => setSimInput((s) => ({ ...s, destination_is_new: e.target.checked }))}
                  className="rounded"
                />
                New dest
              </label>
            </div>
          </Field>
          <Field label="Payouts today (before this)">
            <input
              type="number"
              min={0}
              value={simInput.payout_count_today}
              onChange={(e) => setSimInput((s) => ({ ...s, payout_count_today: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label="Mins since last payout (blank = none today)">
            <input
              type="number"
              min={0}
              value={simInput.minutes_since_last_payout}
              onChange={(e) => setSimInput((s) => ({ ...s, minutes_since_last_payout: e.target.value }))}
              placeholder="—"
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </Field>
          <Field label={`Daily total so far (${policy.allowed_currency})`}>
            <input type="number" min={0} value={simInput.daily_total_so_far}
              onChange={(e) => setSimInput((s) => ({ ...s, daily_total_so_far: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </Field>
          <Field label={`Weekly total so far (${policy.allowed_currency})`}>
            <input type="number" min={0} value={simInput.weekly_total_so_far}
              onChange={(e) => setSimInput((s) => ({ ...s, weekly_total_so_far: e.target.value }))}
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
          </Field>
        </div>

        <button
          onClick={simulate}
          disabled={simLoading}
          className="mt-4 rounded bg-slate-700 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
        >
          {simLoading ? 'Simulating…' : '▶ Run Simulation'}
        </button>

        {simResult && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="mb-3 flex items-center gap-3">
              <DecisionBadge d={simResult.decision} />
              <span className="font-mono text-xs text-slate-400">{simResult.reason_code}</span>
              {simResult.required_approval && (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300">
                  Requires: {simResult.required_approval}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-slate-200">{simResult.reason}</p>
            <div className="space-y-1.5">
              {simResult.checks.map((c) => (
                <div key={c.rule} className="flex items-start gap-2 text-xs">
                  <span className={c.passed ? 'text-emerald-400' : 'text-red-400'}>{c.passed ? '✓' : '✕'}</span>
                  <span className="font-mono text-slate-400">{c.rule}</span>
                  <span className="text-slate-300">{c.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      </div>
    </main>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${ok ? 'text-slate-200' : 'text-red-400'}`}>{value}</p>
    </div>
  );
}
