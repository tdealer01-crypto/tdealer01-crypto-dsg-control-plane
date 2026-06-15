'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CopyButton from '../../../../components/CopyButton';

type IntegrationDeliveryStatus = 'delivered' | 'failed' | 'dead_letter' | 'retrying' | 'pending';

interface IntegrationDeliveryLog {
  id: string;
  event: string;
  status: IntegrationDeliveryStatus;
  response_code: number | null;
  duration_ms: number;
  attempt: number;
  error_message: string | null;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown> | null;
  created_at: string;
}

interface IntegrationProfile {
  id: string;
  org_id: string;
  agent_id: string;
  email: string;
  app_name: string;
  webhook_url: string | null;
  allowed_origins: string[];
  status: 'active' | 'disabled';
}

interface IntegrationWebhookWithDeliveries extends IntegrationProfile {
  deliveries: IntegrationDeliveryLog[];
}

const INTEGRATION_EVENTS = [
  'execution.completed', 'execution.initiated', 'execution.failed',
  'gate.evaluated', 'gate.approved', 'gate.rejected', 'gate.blocked',
  'review.required', 'action.approved', 'action.blocked', 'action.reviewed',
  'proof.created', 'proof.scan_completed',
  'agent.created', 'agent.started', 'agent.completed', 'agent.failed',
];

function statusBadge(status: IntegrationDeliveryStatus) {
  const styles: Record<IntegrationDeliveryStatus, string> = {
    delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    failed: 'border-red-500/30 bg-red-500/10 text-red-300',
    dead_letter: 'border-red-500/30 bg-red-500/10 text-red-300',
    retrying: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    pending: 'border-white/10 bg-white/5 text-slate-400',
  };
  const labels: Record<IntegrationDeliveryStatus, string> = {
    delivered: '✓ Delivered',
    failed: '✗ Failed',
    dead_letter: '✗ Dead Letter',
    retrying: '⟳ Retrying',
    pending: '○ Pending',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function httpStatusBadge(code: number | null) {
  if (code === null) return <span className="text-xs text-slate-500">—</span>;
  const ok = code >= 200 && code < 300;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-bold ${ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
      {code}
    </span>
  );
}

function profileStatusBadge(status: 'active' | 'disabled') {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ACTIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> DISABLED
    </span>
  );
}

export default function IntegrationWebhooksPage() {
  const [integrations, setIntegrations] = useState<IntegrationWebhookWithDeliveries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    app_name: '',
    webhook_url: '',
    allowed_origins: '',
    events: [] as string[],
  });
  const [formError, setFormError] = useState('');
  const [registerResult, setRegisterResult] = useState<{ org_id: string; agent_id: string; api_key: string; secret: string } | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const res = await fetch('/api/integrations/webhook-deliveries?limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `HTTP ${res.status}`); return; }
      // Group deliveries by webhook_id
      const grouped = new Map<string, IntegrationDeliveryLog[]>();
      // Since this endpoint returns deliveries for a specific agent_id, we need to fetch all
      // For now, we'll use a different approach - fetch profiles and their deliveries
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfilesWithDeliveries() {
    try {
      // First get all profiles for this org (we'd need org context)
      // For demo purposes, we'll fetch from a combined endpoint
      const res = await fetch('/api/integrations/webhook-deliveries?limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `HTTP ${res.status}`); return; }
      // Group by webhook/integration
    } catch (err) {
      setError(String(err));
    }
  }

  // For now, we'll fetch all integration profiles and their deliveries
  useEffect(() => {
    async function load() {
      try {
        // Fetch from multiple endpoints - we need a combined view
        // For demo, we'll use mock data until the API supports multi-integration view
        const mockIntegrations: IntegrationWebhookWithDeliveries[] = [
          {
            id: 'int_abc123',
            org_id: 'org_xyz',
            agent_id: 'agt_abc123',
            email: 'dev@acme.com',
            app_name: 'ACME ERP',
            webhook_url: 'https://app.acme.com/hooks/dsg-governance',
            allowed_origins: ['https://app.acme.com'],
            status: 'active',
            deliveries: [
              { id: 'dl_1', event: 'gate.evaluated', status: 'delivered', response_code: 200, duration_ms: 145, attempt: 1, error_message: null, request_payload: { event: 'gate.evaluated', org_id: 'org_xyz', agent_id: 'agt_abc123', timestamp: '2026-06-15T10:00:00Z', payload: { gate_id: 'gt_123', result: 'PASS' } }, response_payload: { ok: true }, created_at: '2026-06-15T10:00:00Z' },
              { id: 'dl_2', event: 'action.approved', status: 'delivered', response_code: 200, duration_ms: 98, attempt: 1, error_message: null, request_payload: { event: 'action.approved', org_id: 'org_xyz', agent_id: 'agt_abc123', timestamp: '2026-06-15T10:05:00Z', payload: { action: 'approve_invoice', amount: 125000 } }, response_payload: { received: true }, created_at: '2026-06-15T10:05:00Z' },
              { id: 'dl_3', event: 'review.required', status: 'failed', response_code: 502, duration_ms: 5000, attempt: 1, error_message: 'Bad Gateway', request_payload: { event: 'review.required', org_id: 'org_xyz', agent_id: 'agt_abc123', timestamp: '2026-06-15T10:10:00Z', payload: { approval_id: 'appr_456' } }, response_payload: { error: 'Bad Gateway' }, created_at: '2026-06-15T10:10:00Z' },
              { id: 'dl_4', event: 'review.required', status: 'delivered', response_code: 200, duration_ms: 112, attempt: 2, error_message: null, request_payload: { event: 'review.required', org_id: 'org_xyz', agent_id: 'agt_abc123', timestamp: '2026-06-15T10:10:10Z', payload: { approval_id: 'appr_456', _retry: true } }, response_payload: { ok: true }, created_at: '2026-06-15T10:10:10Z' },
            ],
          },
          {
            id: 'int_def456',
            org_id: 'org_xyz',
            agent_id: 'agt_def456',
            email: 'team@sentinel.io',
            app_name: 'Sentinel Compliance',
            webhook_url: 'https://hooks.sentinel.io/dsg/inbound',
            allowed_origins: ['https://hooks.sentinel.io'],
            status: 'active',
            deliveries: [
              { id: 'dl_5', event: 'agent.completed', status: 'delivered', response_code: 200, duration_ms: 174, attempt: 1, error_message: null, request_payload: { event: 'agent.completed', org_id: 'org_xyz', agent_id: 'agt_def456', timestamp: '2026-06-15T09:00:00Z', payload: { duration_ms: 6100 } }, response_payload: { ok: true }, created_at: '2026-06-15T09:00:00Z' },
              { id: 'dl_6', event: 'proof.created', status: 'dead_letter', response_code: 503, duration_ms: 5000, attempt: 5, error_message: 'Service Unavailable', request_payload: { event: 'proof.created', org_id: 'org_xyz', agent_id: 'agt_def456', timestamp: '2026-06-15T08:55:00Z', payload: { proof_id: 'prf_112' } }, response_payload: { error: 'Service Unavailable', final: true }, created_at: '2026-06-15T08:55:00Z' },
            ],
          },
        ];
        setIntegrations(mockIntegrations);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRegister() {
    if (!formData.email.includes('@')) { setFormError('Valid email required'); return; }
    if (!formData.app_name || formData.app_name.length < 2) { setFormError('App name required (2+ chars)'); return; }
    if (!formData.webhook_url.startsWith('https://')) { setFormError('Webhook URL must be HTTPS'); return; }
    if (formData.events.length === 0) { setFormError('Select at least one event'); return; }

    try {
      // Step 1: Register integration
      const regRes = await fetch('/api/integrations/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: formData.email, app_name: formData.app_name }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) { setFormError(regData.error ?? `HTTP ${regRes.status}`); return; }

      // Step 2: Register webhook
      const whRes = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${regData.api_key}` },
        body: JSON.stringify({
          agent_id: regData.agent_id,
          webhook_url: formData.webhook_url,
          allowed_origins: formData.allowed_origins.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const whData = await whRes.json();
      if (!whRes.ok) { setFormError(whData.error ?? `HTTP ${whRes.status}`); return; }

      setRegisterResult({ ...regData, secret: whData.secret });
      setShowRegister(false);
      setFormError('');
      setFormData({ email: '', app_name: '', webhook_url: '', allowed_origins: '', events: [] });
    } catch (err) {
      setFormError(String(err));
    }
  }

  function toggleEvent(event: string) {
    setFormData(p => ({ ...p, events: p.events.includes(event) ? p.events.filter(e => e !== event) : [...p.events, event] }));
  }

  function toggleLogs(id: string) {
    setExpandedLogs(p => ({ ...p, [id]: !p[id] }));
  }

  function togglePayload(id: string) {
    setExpandedPayloads(p => ({ ...p, [id]: !p[id] }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.08))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">Integration Webhooks</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Manage integration event delivery
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Register integrations, attach webhook URLs with HMAC-SHA256 signatures, and monitor delivery logs with retry/dead-letter tracking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowRegister(v => !v)} className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">
                {showRegister ? 'Cancel' : '+ Register integration'}
              </button>
              <Link href="/dashboard/integrations" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to integrations
              </Link>
            </div>
          </div>
        </section>

        {/* New integration banner */}
        {registerResult && (
          <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Integration registered — copy credentials now (shown once)</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex gap-2"><span className="text-slate-500">org_id:</span><code className="font-mono text-emerald-200">{registerResult.org_id}</code><CopyButton text={registerResult.org_id} /></div>
              <div className="flex gap-2"><span className="text-slate-500">agent_id:</span><code className="font-mono text-emerald-200">{registerResult.agent_id}</code><CopyButton text={registerResult.agent_id} /></div>
              <div className="flex gap-2"><span className="text-slate-500">api_key:</span><code className="font-mono text-emerald-200">{registerResult.api_key}</code><CopyButton text={registerResult.api_key} /></div>
              <div className="flex gap-2"><span className="text-slate-500">webhook_secret:</span><code className="font-mono text-emerald-200">{registerResult.secret}</code><CopyButton text={registerResult.secret} /></div>
            </div>
            <button onClick={() => setRegisterResult(null)} className="mt-3 text-xs text-slate-400 underline">Dismiss</button>
          </div>
        )}

        {/* Register form */}
        {showRegister && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">New integration</p>
            <h2 className="mt-2 text-xl font-black text-white">Register integration + webhook</h2>
            {formError && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">{formError}</p>}
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="dev@yourcompany.com" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">App name</label>
                <input type="text" value={formData.app_name} onChange={e => setFormData(p => ({ ...p, app_name: e.target.value }))} placeholder="Your App" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Webhook URL</label>
                <input type="url" value={formData.webhook_url} onChange={e => setFormData(p => ({ ...p, webhook_url: e.target.value }))} placeholder="https://your-app.com/hooks/dsg" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40" />
                <p className="mt-1 text-xs text-slate-500">Must start with https://</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Allowed origins (comma-separated)</label>
                <input type="text" value={formData.allowed_origins} onChange={e => setFormData(p => ({ ...p, allowed_origins: e.target.value }))} placeholder="https://your-app.com, https://staging.your-app.com" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40" />
                <p className="mt-1 text-xs text-slate-500">CORS origins for webhook verification</p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Events to subscribe</label>
                <div className="grid gap-2 md:grid-cols-2">
                  {INTEGRATION_EVENTS.map(ev => (
                    <label key={ev} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <input type="checkbox" checked={formData.events.includes(ev)} onChange={() => toggleEvent(ev)} className="h-4 w-4 rounded accent-emerald-400" />
                      <span className="text-sm font-semibold text-slate-200">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={handleRegister} className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950">Register integration + webhook</button>
              <button onClick={() => { setShowRegister(false); setFormError(''); }} className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-slate-300">Cancel</button>
            </div>
          </section>
        )}

        {/* Signing note */}
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-5 py-4">
          <p className="text-xs font-semibold text-amber-200">
            <span className="font-black">Signature verification:</span> Every webhook delivery includes an{' '}
            <code className="rounded border border-amber-300/20 bg-amber-300/10 px-1 font-mono">X-DSG-Signature</code>{' '}
            header (HMAC-SHA256 of <code className="font-mono text-xs">secret|payload</code>, keyed with your webhook secret).
            Reject requests where the signature does not match.
          </p>
        </div>

        {/* Integrations list */}
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Registered integrations</p>
          {loading && <p className="mt-6 text-sm text-slate-400">Loading integrations…</p>}
          {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {integrations.length === 0 && !loading && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-slate-400">No integrations registered yet. Click &ldquo;Register integration&rdquo; to add one.</p>
            </div>
          )}
          <div className="mt-4 grid gap-4">
            {integrations.map(wh => (
              <article key={wh.id} className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5">
                {/* Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {profileStatusBadge(wh.status)}
                      <code className="truncate text-sm font-mono font-bold text-white">{wh.agent_id}</code>
                      <span className="text-xs text-slate-400">/{wh.app_name}</span>
                    </div>
                    {wh.webhook_url && <p className="mt-1 text-xs text-slate-400 break-all">{wh.webhook_url}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {wh.events.map((ev: string) => (
                        <span key={ev} className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">{ev}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Origins: {wh.allowed_origins.join(', ') || '—'}</p>
                  </div>
                </div>

                {/* Delivery logs toggle */}
                <button onClick={() => toggleLogs(wh.id)} className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-200">
                  <span>{expandedLogs[wh.id] ? '▾' : '▸'}</span>
                  Delivery logs ({wh.deliveries.length})
                </button>

                {/* Delivery logs */}
                {expandedLogs[wh.id] && (
                  <div className="mt-3 grid gap-2">
                    {wh.deliveries.map(dl => (
                      <div key={dl.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          {statusBadge(dl.status)}
                          {httpStatusBadge(dl.response_code)}
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2 py-0.5 text-xs font-semibold text-emerald-200">{dl.event}</span>
                          <span className="text-xs text-slate-500">{dl.duration_ms}ms</span>
                          <span className="text-xs text-slate-500">attempt {dl.attempt}</span>
                          {dl.error_message && <span className="text-xs text-red-400">{dl.error_message}</span>}
                        </div>
                        <button onClick={() => togglePayload(dl.id)} className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-300">
                          {expandedPayloads[dl.id] ? 'Hide' : 'Show'} request / response
                        </button>
                        {expandedPayloads[dl.id] && (
                          <div className="mt-2 grid gap-2">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono text-slate-300 overflow-auto max-h-48">
                              <p className="font-semibold text-amber-300">Request:</p>
                              <pre>{JSON.stringify(dl.request_payload, null, 2)}</pre>
                            </div>
                            {dl.response_payload && (
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono text-slate-300 overflow-auto max-h-48">
                                <p className="font-semibold text-emerald-300">Response:</p>
                                <pre>{JSON.stringify(dl.response_payload, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}