'use client';

import { useState } from 'react';
import Link from 'next/link';

type NotifType =
  | 'gate.evaluated'
  | 'approval.required'
  | 'deployment.ready'
  | 'agent.failed'
  | 'billing.alert';

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  relativeTime: string;
  read: boolean;
};

type PreferenceKey =
  | 'approvalRequests'
  | 'gateBlock'
  | 'agentFailures'
  | 'weeklyGovernance'
  | 'billingAlerts';

type Preferences = Record<PreferenceKey, boolean>;

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n01', type: 'approval.required', title: 'Action needs human review', body: 'Agent agt_007 requested approval for wire_transfer ($84,000) — policy P-14 requires review over $50k.', relativeTime: '2 min ago', read: false },
  { id: 'n02', type: 'gate.evaluated', title: 'Gate evaluated: BLOCK', body: 'Gate gt_finance_limit blocked action approve_invoice for agent agt_003. Limit policy exceeded.', relativeTime: '11 min ago', read: false },
  { id: 'n03', type: 'deployment.ready', title: 'Deployment go/no-go ready', body: 'Release v2.4.1 passed all governance gates. Deployment is cleared for production.', relativeTime: '34 min ago', read: false },
  { id: 'n04', type: 'agent.failed', title: 'Agent governance exception', body: 'Agent agt_005 (compliance_scan) failed with POLICY_VIOLATION: action export_data blocked by rule R-88.', relativeTime: '1 hr ago', read: false },
  { id: 'n05', type: 'gate.evaluated', title: 'Gate evaluated: PASS', body: 'Gate gt_pii_check passed for agent agt_002 action read_customer_profile. No violations.', relativeTime: '1 hr ago', read: true },
  { id: 'n06', type: 'billing.alert', title: 'Approaching monthly gate limit', body: 'Your org has used 87% of the 10,000 gate evaluations included in the Pro plan. Upgrade to avoid throttling.', relativeTime: '3 hr ago', read: false },
  { id: 'n07', type: 'approval.required', title: 'Pending approval: delete_records', body: 'Agent agt_009 is awaiting approval to execute delete_records on table customer_pii. Assigned to compliance team.', relativeTime: '4 hr ago', read: true },
  { id: 'n08', type: 'gate.evaluated', title: 'Gate evaluated: REVIEW', body: 'Gate gt_cross_border flagged action send_payment_abroad for agent agt_001 — routed to compliance reviewer.', relativeTime: '5 hr ago', read: true },
  { id: 'n09', type: 'deployment.ready', title: 'Deployment blocked: governance check failed', body: 'Release v2.4.0 failed gate gt_production_readiness. 2 actions lack required audit proofs.', relativeTime: '6 hr ago', read: true },
  { id: 'n10', type: 'agent.failed', title: 'Agent governance exception', body: 'Agent agt_011 (invoice_automation) exceeded max retries after 3 BLOCK decisions. Task paused.', relativeTime: '8 hr ago', read: true },
  { id: 'n11', type: 'gate.evaluated', title: 'Gate evaluated: PASS', body: 'Gate gt_soc2_evidence passed for agent agt_004. All required evidence fields present.', relativeTime: '10 hr ago', read: true },
  { id: 'n12', type: 'billing.alert', title: 'Invoice generated', body: 'Invoice INV-2025-05 for $1,240.00 (Pro plan + 3,200 overage gate evaluations) is ready.', relativeTime: '1 day ago', read: true },
  { id: 'n13', type: 'approval.required', title: 'Action needs human review', body: 'Agent agt_006 requested approval for bulk_export — 12,000 records flagged for PII review by DLP policy.', relativeTime: '1 day ago', read: true },
  { id: 'n14', type: 'gate.evaluated', title: 'Gate evaluated: BLOCK', body: 'Gate gt_vendor_access blocked agent agt_008 from calling external vendor API. Allowlist violation.', relativeTime: '2 days ago', read: true },
  { id: 'n15', type: 'deployment.ready', title: 'Deployment go/no-go ready', body: 'Release v2.3.9 cleared all pre-deployment gates. Governance proof exported to audit log.', relativeTime: '2 days ago', read: true },
];

const INITIAL_PREFERENCES: Preferences = {
  approvalRequests: true,
  gateBlock: true,
  agentFailures: true,
  weeklyGovernance: false,
  billingAlerts: true,
};

function notifIcon(type: NotifType) {
  switch (type) {
    case 'gate.evaluated':
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-sm">
          ⬡
        </span>
      );
    case 'approval.required':
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/25 bg-blue-400/10 text-sm">
          ✋
        </span>
      );
    case 'deployment.ready':
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-sm">
          🚀
        </span>
      );
    case 'agent.failed':
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-sm">
          ✕
        </span>
      );
    case 'billing.alert':
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-sm">
          $
        </span>
      );
  }
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked
          ? 'border-amber-300/40 bg-amber-300/25'
          : 'border-white/10 bg-white/5'
      } ${ disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
          checked ? 'translate-x-6 bg-amber-300' : 'translate-x-1 bg-slate-500'
        }`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [preferences, setPreferences] = useState<Preferences>(INITIAL_PREFERENCES);

  const unread = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
  }

  function togglePref(key: PreferenceKey) {
    setPreferences((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.12),rgba(15,23,42,0.92)_45%,rgba(212,175,55,0.05))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">DSG Notifications</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Notifications & Preferences</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Centralized feed for all governance events — gate decisions, approval requests, deployment go/no-go, and billing alerts. Manage delivery channels below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          {/* Section A — Notification Feed */}
          <section className="rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white">Notifications</h2>
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/15 px-2.5 py-0.5 text-xs font-black text-amber-200">
                    {unread} unread
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-300/30"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    n.read
                      ? 'border-white/8 bg-white/[0.02] hover:border-white/12'
                      : 'border-amber-300/18 bg-amber-300/6 hover:border-amber-300/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {notifIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold ${n.read ? 'text-slate-200' : 'text-white'}`}>{n.title}</p>
                        <span className="shrink-0 text-xs text-slate-500">{n.relativeTime}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{n.body}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section B — Notification Preferences */}
          <section className="grid gap-4 content-start">
            {/* Email preferences */}
            <div className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Email notifications</p>
              <h3 className="mt-2 text-lg font-black text-white">Email delivery</h3>
              <div className="mt-4 grid gap-3">
                {[
                  { key: 'approvalRequests' as PreferenceKey, label: 'Approval requests', note: 'Always on', locked: true },
                  { key: 'gateBlock' as PreferenceKey, label: 'Gate BLOCK decisions', note: '', locked: false },
                  { key: 'agentFailures' as PreferenceKey, label: 'Agent failures', note: '', locked: false },
                  { key: 'weeklyGovernance' as PreferenceKey, label: 'Weekly governance summary', note: '', locked: false },
                  { key: 'billingAlerts' as PreferenceKey, label: 'Billing alerts', note: '', locked: false },
                ].map(({ key, label, note, locked }) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{label}</p>
                      {note && <p className="text-xs text-slate-500">{note}</p>}
                    </div>
                    <Toggle
                      checked={preferences[key]}
                      onChange={() => togglePref(key)}
                      disabled={locked}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Slack integration */}
            <div className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Slack</p>
                  <h3 className="mt-1 text-base font-black text-white">Slack integration</h3>
                  <p className="mt-1 text-xs text-slate-400">Not connected</p>
                </div>
                <span className="text-2xl">💬</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Receive governance alerts, approval requests, and gate decisions in any Slack channel.
              </p>
              <button className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-slate-200 hover:border-amber-300/30">
                Connect Slack
              </button>
            </div>

            {/* PagerDuty */}
            <div className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">PagerDuty</p>
                  <h3 className="mt-1 text-base font-black text-white">PagerDuty integration</h3>
                  <p className="mt-1 text-xs text-slate-400">Not connected</p>
                </div>
                <span className="text-2xl">🔔</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Trigger PagerDuty incidents automatically for critical agent failures or governance exceptions.
              </p>
              <button className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-slate-200 hover:border-amber-300/30">
                Configure
              </button>
            </div>

            {/* Webhook notifications */}
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/8 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300/70">Webhooks</p>
              <h3 className="mt-1 text-base font-black text-white">Webhook notifications</h3>
              <p className="mt-2 text-xs leading-5 text-amber-100/70">
                Deliver all governance events to your own endpoints in real time. Manage registered webhooks and view delivery logs.
              </p>
              <Link
                href="/dashboard/webhooks"
                className="mt-4 flex w-full items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/15 py-2.5 text-sm font-bold text-amber-200"
              >
                Manage webhooks →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
