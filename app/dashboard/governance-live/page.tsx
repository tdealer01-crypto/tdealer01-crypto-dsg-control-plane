'use client';

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

function Field({ label, value }: { label: string; value: unknown }) {
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <div className="grid gap-1 border-t border-white/[0.06] py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all text-sm text-slate-200">{text}</dd>
    </div>
  );
}

function Panel({
  index,
  title,
  status,
  children,
}: {
  index: number;
  title: string;
  status?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Panel {index}</p>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
        </div>
        <Badge status={status} />
      </div>
      <dl>{children}</dl>
    </section>
  );
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

  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">DSG Governance Plugin</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Live Governance</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                MCP/OpenAPI actions are evaluated against the server-side approved plan, then persisted to the audit ledger. Feed refresh: 2 seconds. No synthetic events.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">Organization mode</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingMode}
                  onClick={() => void changeMode('observe')}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    mode === 'observe'
                      ? 'border-blue-400/50 bg-blue-400/15 text-blue-200'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  } disabled:opacity-50`}
                >
                  OBSERVE
                </button>
                <button
                  type="button"
                  disabled={savingMode}
                  onClick={() => void changeMode('enforce')}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    mode === 'enforce'
                      ? 'border-red-400/50 bg-red-400/15 text-red-200'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  } disabled:opacity-50`}
                >
                  ENFORCE
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Only org_admin can change mode. Agents cannot override it.</p>
            </div>
          </div>
        </header>

        {modeError && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            เปลี่ยนโหมดไม่สำเร็จ: {modeError}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            Live feed ไม่พร้อม: {error}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Current setting</p>
            <p className="mt-1 text-lg font-bold text-white">{mode.toUpperCase()}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Latest event mode</p>
            <p className="mt-1 text-lg font-bold text-white">{latest ? eventMode.toUpperCase() : 'NO EVENT'}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Persisted events loaded</p>
            <p className="mt-1 text-lg font-bold text-white">{loading ? '…' : rows.length}</p>
          </div>
        </div>

        {!loading && !latest ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
            <p className="font-semibold text-slate-200">ยังไม่มี governance event จริง</p>
            <p className="mt-2 text-sm text-slate-500">เชื่อม Agent ผ่าน MCP หรือ OpenAPI แล้วเรียก preflight ครั้งแรก ข้อมูลจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Panel index={1} title="ACTION" status={statuses.action ?? latest?.decision}>
              <Field label="Event" value={latest?.execution_id} />
              <Field label="Agent" value={latest?.agent_id} />
              <Field label="Action" value={latest?.action_kind} />
              <Field label="Target" value={metadata.target_system_id} />
              <Field label="Operation" value={metadata.operation_name} />
              <Field label="Risk" value={metadata.risk_level} />
            </Panel>

            <Panel index={2} title="PLAN ALIGNMENT" status={statuses.plan_alignment}>
              <Field label="Decision" value={metadata.plan_decision} />
              <Field label="Plan hash" value={metadata.plan_hash} />
              <Field label="Action allowed" value={metadata.policy_allows_action === true ? 'YES' : 'NO'} />
              <Field label="Reasons" value={reasons.length ? reasons.join(' · ') : '—'} />
            </Panel>

            <Panel index={3} title="PERMISSION" status={statuses.permission}>
              <Field label="Auth source" value={metadata.auth_source} />
              <Field label="Roles" value={(metadata.roles ?? []).join(', ')} />
              <Field label="Meaning" value={statuses.permission === 'WAITING_PERMISSION' ? 'Execution permission is insufficient' : 'Execution role verified'} />
            </Panel>

            <Panel index={4} title="EVIDENCE" status={statuses.evidence}>
              <Field label="Claim allowed" value={metadata.claim_allowed === true ? 'YES' : 'NO'} />
              <Field label="Evidence refs" value={evidenceRefs.length} />
              <Field label="Refs" value={evidenceRefs.length ? evidenceRefs.join(', ') : 'No evidence reference recorded'} />
            </Panel>

            <Panel index={5} title="EXECUTION / AUDIT" status={statuses.execution_audit}>
              <Field label="Mode at decision" value={eventMode.toUpperCase()} />
              <Field label="Downstream" value={metadata.should_block === true ? 'DO_NOT_EXECUTE' : 'CONTINUE_TO_TARGET'} />
              <Field label="Audit hash" value={latest?.current_hash} />
              <Field label="Previous hash" value={latest?.previous_hash} />
              <Field label="Decision hash" value={latest?.evidence_hash} />
              <Field label="Recorded at" value={latest?.occurred_at ? new Date(latest.occurred_at).toLocaleString() : '—'} />
            </Panel>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="text-sm font-bold text-white">Connect existing agent</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Microsoft Foundry / MCP</p>
              <code className="mt-2 block break-all text-slate-200">/api/mcp/governance</code>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OpenAPI schema</p>
              <code className="mt-2 block break-all text-slate-200">/api/dsg/governance/openapi</code>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
