'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type GovernanceMode = 'observe' | 'enforce';
type GovernanceStatus = 'PASS' | 'BLOCKED' | 'WAITING_PERMISSION' | 'UNVERIFIED';

type PanelStatuses = {
  action?: GovernanceStatus;
  plan_alignment?: GovernanceStatus;
  permission?: GovernanceStatus;
  evidence?: GovernanceStatus;
  execution_audit?: GovernanceStatus;
};

type AuditMetadata = {
  mode?: GovernanceMode;
  plan_hash?: string;
  target_system_id?: string;
  operation_name?: string;
  risk_level?: string;
  plan_decision?: string;
  reasons?: string[];
  policy_allows_action?: boolean;
  should_block?: boolean;
  claim_allowed?: boolean;
  evidence_refs?: string[];
  roles?: string[];
  auth_source?: string;
  panel_statuses?: PanelStatuses;
};

type AuditRow = {
  id: string;
  execution_id: string;
  agent_id: string;
  action_kind: string;
  decision: GovernanceStatus;
  status: string;
  evidence_hash: string | null;
  previous_hash: string | null;
  current_hash: string;
  occurred_at: string;
  metadata: AuditMetadata;
};

const PANEL_COPY = [
  ['ACTION', 'What the agent is trying to do'],
  ['PLAN ALIGNMENT', 'Whether the action matches the approved plan'],
  ['PERMISSION', 'Whether the execution identity has permission'],
  ['EVIDENCE', 'Whether the decision has supporting evidence'],
  ['EXECUTION / AUDIT', 'What happens next and what was recorded'],
] as const;

function statusClass(status?: string) {
  switch (status) {
    case 'PASS':
      return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    case 'BLOCKED':
      return 'border-red-400/30 bg-red-400/10 text-red-200';
    case 'WAITING_PERMISSION':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
    case 'UNVERIFIED':
      return 'border-violet-400/30 bg-violet-400/10 text-violet-200';
    default:
      return 'border-slate-700 bg-slate-900 text-slate-300';
  }
}

function Badge({ status }: { status?: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
      {status ?? 'NO DATA'}
    </span>
  );
}

function Field({ label, value, mono = false }: { label: string; value: unknown; mono?: boolean }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <div className="grid gap-1 border-t border-white/[0.06] py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`break-all text-sm text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{text}</dd>
    </div>
  );
}

function Panel({
  index,
  status,
  children,
}: {
  index: number;
  status?: string;
  children: React.ReactNode;
}) {
  const copy = PANEL_COPY[index - 1];
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-2xl shadow-black/10 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-xs font-bold text-amber-100">
            {String(index).padStart(2, '0')}
          </span>
          <div>
            <h2 className="text-base font-bold tracking-wide text-white">{copy[0]}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{copy[1]}</p>
          </div>
        </div>
        <Badge status={status} />
      </div>
      <dl>{children}</dl>
    </section>
  );
}

function nextAction(status?: GovernanceStatus, reasons: string[] = []) {
  if (status === 'BLOCKED') {
    return {
      title: 'Action stopped',
      body: reasons[0] ?? 'This action is outside the currently approved governance conditions.',
      fix: 'Change the action to match the approved plan, or update and approve the plan before trying again.',
    };
  }
  if (status === 'WAITING_PERMISSION') {
    return {
      title: 'Permission required',
      body: 'The action cannot continue with the current execution permission.',
      fix: 'Grant the required role or capability, then retry the action.',
    };
  }
  if (status === 'UNVERIFIED') {
    return {
      title: 'Evidence incomplete',
      body: 'DSG does not have enough verified evidence to support this action or claim.',
      fix: 'Attach or produce the required evidence, then run governance again.',
    };
  }
  return {
    title: 'Action may continue',
    body: 'The latest governance decision does not require DSG to stop downstream execution.',
    fix: 'No governance fix is required for this event. Open Audit if you need the recorded proof trail.',
  };
}

export default function GovernanceLivePage() {
  const [mode, setMode] = useState<GovernanceMode>('observe');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [error, setError] = useState('');
  const [modeError, setModeError] = useState('');

  const loadSettings = useCallback(async () => {
    const response = await fetch('/api/dsg/governance/settings', {
      cache: 'no-store',
      credentials: 'include',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error ?? 'SETTINGS_UNAVAILABLE');
    setMode(body.mode === 'enforce' ? 'enforce' : 'observe');
  }, []);

  const loadFeed = useCallback(async () => {
    const response = await fetch('/api/dsg/governance/live?limit=30', {
      cache: 'no-store',
      credentials: 'include',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error ?? 'FEED_UNAVAILABLE');
    setRows(Array.isArray(body.items) ? body.items : []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadSettings(), loadFeed()])
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'GOVERNANCE_LIVE_UNAVAILABLE');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const timer = window.setInterval(() => {
      void loadFeed().catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'FEED_UNAVAILABLE');
      });
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadFeed, loadSettings]);

  const changeMode = useCallback(async (next: GovernanceMode) => {
    setSavingMode(true);
    setModeError('');
    try {
      const response = await fetch('/api/dsg/governance/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? 'MODE_UPDATE_FAILED');
      setMode(body.mode);
    } catch (err) {
      setModeError(err instanceof Error ? err.message : 'MODE_UPDATE_FAILED');
    } finally {
      setSavingMode(false);
    }
  }, []);

  const latest = rows[0] ?? null;
  const metadata = latest?.metadata ?? {};
  const statuses = metadata.panel_statuses ?? {};
  const eventMode = metadata.mode ?? mode;
  const reasons = useMemo(() => metadata.reasons ?? [], [metadata.reasons]);
  const evidenceRefs = useMemo(() => metadata.evidence_refs ?? [], [metadata.evidence_refs]);
  const outcome = nextAction(statuses.execution_audit ?? latest?.decision, reasons);

  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 border-b border-white/[0.07] pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100">
                  Live governance
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Real persisted events · refresh 2s
                </span>
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">
                See what your agent is trying to do — and what DSG decides.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                Follow one action through plan alignment, permission, evidence, and the final execution decision. No synthetic events are added to this feed.
              </p>
            </div>

            <div className="min-w-[280px] rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-white">Control mode</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Observe records decisions. Enforce can stop actions when governance requires it.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-1.5">
                <button
                  type="button"
                  disabled={savingMode}
                  onClick={() => void changeMode('observe')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${mode === 'observe' ? 'bg-white/10 text-white' : 'text-slate-500'} disabled:opacity-50`}
                >
                  OBSERVE
                </button>
                <button
                  type="button"
                  disabled={savingMode}
                  onClick={() => void changeMode('enforce')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${mode === 'enforce' ? 'bg-red-500/15 text-red-200' : 'text-slate-500'} disabled:opacity-50`}
                >
                  ENFORCE
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">Mode changes remain server-authorized; agents cannot override them.</p>
            </div>
          </div>
        </header>

        {modeError && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Mode change failed: {modeError}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            Live feed unavailable: {error}
          </div>
        )}

        {!loading && !latest ? (
          <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-100">Start here</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Connect an existing agent to create the first real event.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              This screen intentionally stays empty until a real governance event is persisted. Connect through MCP or OpenAPI, run one preflight action, then return here to see the five-stage decision.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/integration" className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950">
                Connect an agent
              </Link>
              <Link href="/docs" className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200">
                Read integration docs
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-slate-500">Current mode</p>
                <p className="mt-1 text-lg font-bold text-white">{mode.toUpperCase()}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-slate-500">Latest decision</p>
                <div className="mt-2"><Badge status={statuses.execution_audit ?? latest?.decision} /></div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-slate-500">Persisted events loaded</p>
                <p className="mt-1 text-lg font-bold text-white">{loading ? '…' : rows.length}</p>
              </div>
            </section>

            <div className="space-y-4">
              <Panel index={1} status={statuses.action ?? latest?.decision}>
                <Field label="Agent" value={latest?.agent_id} />
                <Field label="Action" value={latest?.action_kind} />
                <Field label="Target" value={metadata.target_system_id} />
                <Field label="Operation" value={metadata.operation_name} />
                <Field label="Risk" value={metadata.risk_level} />
                <Field label="Event ID" value={latest?.execution_id} mono />
              </Panel>

              <Panel index={2} status={statuses.plan_alignment}>
                <Field label="Decision" value={metadata.plan_decision} />
                <Field label="Action allowed" value={metadata.policy_allows_action === true ? 'YES' : 'NO'} />
                <Field label="Why" value={reasons.length ? reasons.join(' · ') : 'No reason recorded'} />
                <Field label="Plan hash" value={metadata.plan_hash} mono />
              </Panel>

              <Panel index={3} status={statuses.permission}>
                <Field label="Result" value={statuses.permission === 'WAITING_PERMISSION' ? 'Permission is insufficient' : 'Execution role verified'} />
                <Field label="Roles" value={(metadata.roles ?? []).join(', ') || 'No role recorded'} />
                <Field label="Auth source" value={metadata.auth_source} />
              </Panel>

              <Panel index={4} status={statuses.evidence}>
                <Field label="Claim allowed" value={metadata.claim_allowed === true ? 'YES' : 'NO'} />
                <Field label="Evidence records" value={evidenceRefs.length} />
                <Field label="References" value={evidenceRefs.length ? evidenceRefs.join(', ') : 'No evidence reference recorded'} mono />
              </Panel>

              <Panel index={5} status={statuses.execution_audit}>
                <Field label="Mode at decision" value={eventMode.toUpperCase()} />
                <Field label="Downstream" value={metadata.should_block === true ? 'DO NOT EXECUTE' : 'CONTINUE TO TARGET'} />
                <Field label="Recorded at" value={latest?.occurred_at ? new Date(latest.occurred_at).toLocaleString() : '—'} />
                <Field label="Audit hash" value={latest?.current_hash} mono />
              </Panel>
            </div>

            <section className={`mt-5 rounded-3xl border p-6 ${statusClass(statuses.execution_audit ?? latest?.decision)}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">What this means</p>
              <h2 className="mt-2 text-xl font-bold">{outcome.title}</h2>
              <p className="mt-2 text-sm leading-7 opacity-90">{outcome.body}</p>
              <div className="mt-5 border-t border-current/10 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">What to do next</p>
                <p className="mt-2 text-sm leading-7">{outcome.fix}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/dashboard/audit" className="rounded-xl border border-current/20 bg-black/15 px-4 py-2 text-sm font-bold">View audit record</Link>
                <Link href="/dashboard/proofs" className="rounded-xl border border-current/20 bg-black/15 px-4 py-2 text-sm font-bold">View evidence</Link>
              </div>
            </section>
          </>
        )}

        <section className="mt-8 border-t border-white/[0.07] pt-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Connect existing systems</p>
              <h2 className="mt-2 text-xl font-bold text-white">MCP or OpenAPI — no new agent required.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Use the integration surface for setup and testing. This page is for reading the resulting governance decision.
              </p>
            </div>
            <Link href="/dashboard/integration" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-100">
              Open Connections
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
