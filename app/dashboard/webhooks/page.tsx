'use client';

import { useState } from 'react';
import Link from 'next/link';

type WebhookStatus = 'ACTIVE' | 'DISABLED' | 'FAILING';

type DeliveryLog = {
  id: string;
  timestamp: string;
  eventType: string;
  httpStatus: number;
  durationMs: number;
  requestPayload: string;
  responsePayload: string;
};

type Webhook = {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: WebhookStatus;
  createdAt: string;
  secret: string;
  deliveryLogs: DeliveryLog[];
};

const ALL_EVENTS = [
  'gate.evaluated',
  'proof.created',
  'action.approved',
  'action.blocked',
  'action.reviewed',
  'agent.started',
  'agent.completed',
];

const INITIAL_WEBHOOKS: Webhook[] = [
  {
    id: 'wh_01',
    url: 'https://app.acme-corp.io/hooks/dsg-governance',
    description: 'Production governance event sink for ACME ERP',
    events: ['gate.evaluated', 'action.approved', 'action.blocked', 'agent.completed'],
    status: 'ACTIVE',
    createdAt: '2025-04-12',
    secret: '••••••••••••••••••••',
    deliveryLogs: [
      { id: 'dl_001', timestamp: '2025-05-14 18:42:11', eventType: 'gate.evaluated', httpStatus: 200, durationMs: 143, requestPayload: '{"event":"gate.evaluated","gate_id":"gt_88x","result":"PASS","agent_id":"agt_001"}', responsePayload: '{"ok":true}' },
      { id: 'dl_002', timestamp: '2025-05-14 17:30:05', eventType: 'action.blocked', httpStatus: 200, durationMs: 98, requestPayload: '{"event":"action.blocked","action":"wire_transfer","amount":125000,"agent_id":"agt_001"}', responsePayload: '{"received":true}' },
      { id: 'dl_003', timestamp: '2025-05-14 16:11:44', eventType: 'agent.completed', httpStatus: 200, durationMs: 211, requestPayload: '{"event":"agent.completed","agent_id":"agt_001","duration_ms":4520,"actions_taken":3}', responsePayload: '{"ok":true}' },
      { id: 'dl_004', timestamp: '2025-05-14 14:05:22', eventType: 'action.approved', httpStatus: 502, durationMs: 5000, requestPayload: '{"event":"action.approved","action":"send_report","agent_id":"agt_001"}', responsePayload: '{"error":"Bad Gateway"}' },
      { id: 'dl_005', timestamp: '2025-05-14 11:55:03', eventType: 'gate.evaluated', httpStatus: 200, durationMs: 87, requestPayload: '{"event":"gate.evaluated","gate_id":"gt_44y","result":"REVIEW","agent_id":"agt_001"}', responsePayload: '{"ok":true}' },
    ],
  },
  {
    id: 'wh_02',
    url: 'https://hooks.sentinel-ai.net/dsg/inbound/prod',
    description: 'Sentinel AI secondary compliance feed',
    events: ['proof.created', 'action.reviewed', 'agent.started', 'agent.completed'],
    status: 'FAILING',
    createdAt: '2025-03-28',
    secret: '••••••••••••••••••••',
    deliveryLogs: [
      { id: 'dl_006', timestamp: '2025-05-15 09:10:33', eventType: 'proof.created', httpStatus: 503, durationMs: 5000, requestPayload: '{"event":"proof.created","proof_id":"prf_112","agent_id":"agt_002"}', responsePayload: '{"error":"Service Unavailable"}' },
      { id: 'dl_007', timestamp: '2025-05-15 08:55:17', eventType: 'agent.started', httpStatus: 503, durationMs: 5000, requestPayload: '{"event":"agent.started","agent_id":"agt_002","task":"compliance_scan"}', responsePayload: '{"error":"Service Unavailable"}' },
      { id: 'dl_008', timestamp: '2025-05-15 08:40:09', eventType: 'action.reviewed', httpStatus: 503, durationMs: 5000, requestPayload: '{"event":"action.reviewed","action":"export_data","reviewer":"jdoe@sentinel.net"}', responsePayload: '{"error":"Service Unavailable"}' },
      { id: 'dl_009', timestamp: '2025-05-14 22:14:55', eventType: 'agent.completed', httpStatus: 200, durationMs: 174, requestPayload: '{"event":"agent.completed","agent_id":"agt_002","duration_ms":6100}', responsePayload: '{"ok":true}' },
      { id: 'dl_010', timestamp: '2025-05-14 21:00:11', eventType: 'proof.created', httpStatus: 200, durationMs: 122, requestPayload: '{"event":"proof.created","proof_id":"prf_108","agent_id":"agt_002"}', responsePayload: '{"received":true}' },
    ],
  },
];

function statusBadge(status: WebhookStatus) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        ACTIVE
      </span>
    );
  }
  if (status === 'FAILING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        FAILING — 3 consecutive failures
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      DISABLED
    </span>
  );
}

function httpStatusBadge(code: number) {
  const ok = code >= 200 && code < 300;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-bold ${
        ok
          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {code}
    </span>
  );
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(INITIAL_WEBHOOKS);
  const [showForm, setShowForm] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    description: '',
    events: [] as string[],
    secret: 'whsec_' + Math.random().toString(36).slice(2, 14),
  });
  const [formError, setFormError] = useState('');
  const [secretRevealed, setSecretRevealed] = useState(false);

  function toggleLog(id: string) {
    setExpandedLogs((p) => ({ ...p, [id]: !p[id] }));
  }

  function togglePayload(id: string) {
    setExpandedPayloads((p) => ({ ...p, [id]: !p[id] }));
  }

  function toggleEvent(event: string) {
    setFormData((p) => ({
      ...p,
      events: p.events.includes(event) ? p.events.filter((e) => e !== event) : [...p.events, event],
    }));
  }

  function handleRegister() {
    if (!formData.url.startsWith('https://')) {
      setFormError('Endpoint URL must start with https://');
      return;
    }
    if (formData.events.length === 0) {
      setFormError('Select at least one event type.');
      return;
    }
    const newHook: Webhook = {
      id: 'wh_' + Date.now(),
      url: formData.url,
      description: formData.description,
      events: formData.events,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().slice(0, 10),
      secret: formData.secret,
      deliveryLogs: [],
    };
    setWebhooks((p) => [newHook, ...p]);
    setShowForm(false);
    setFormError('');
    setSecretRevealed(true);
    setFormData({
      url: '',
      description: '',
      events: [],
      secret: 'whsec_' + Math.random().toString(36).slice(2, 14),
    });
  }

  function handleToggle(id: string) {
    setWebhooks((p) =>
      p.map((wh) =>
        wh.id === id
          ? { ...wh, status: wh.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }
          : wh,
      ),
    );
  }

  function handleDelete(id: string) {
    setWebhooks((p) => p.filter((wh) => wh.id !== id));
    setDeleteConfirm(null);
  }

  function handleTest(id: string) {
    setTestResults((p) => ({ ...p, [id]: 'sending...' }));
    setTimeout(() => {
      setTestResults((p) => ({ ...p, [id]: 'HTTP 200 — test ping delivered in 112ms' }));
    }, 900);
  }

  function handleRetry(whId: string, dlId: string) {
    setWebhooks((p) =>
      p.map((wh) =>
        wh.id === whId
          ? {
              ...wh,
              deliveryLogs: wh.deliveryLogs.map((dl) =>
                dl.id === dlId ? { ...dl, httpStatus: 200, durationMs: 131 } : dl,
              ),
            }
          : wh,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(15,23,42,0.92)_45%,rgba(212,175,55,0.06))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">DSG Webhooks</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Webhook Management</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Register HTTPS endpoints to receive real-time governance events. Verify delivery signatures using the{' '}
                <code className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs font-mono text-amber-200">X-DSG-Signature</code>{' '}
                header on every request.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950"
              >
                {showForm ? 'Cancel' : '+ Register webhook'}
              </button>
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Security note */}
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-5 py-4">
          <p className="text-xs font-semibold text-amber-200">
            <span className="font-black">Signature verification:</span> Every webhook delivery includes an{' '}
            <code className="rounded border border-amber-300/20 bg-amber-300/10 px-1 font-mono">X-DSG-Signature</code>{' '}
            header (HMAC-SHA256 of the raw body, keyed with your secret). Reject requests where the signature does not match.
          </p>
        </div>

        {/* Registration form */}
        {showForm && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">New endpoint</p>
            <h2 className="mt-2 text-xl font-black text-white">Register webhook</h2>
            {formError && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">{formError}</p>
            )}
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Endpoint URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://your-app.com/hooks/dsg"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-300/40"
                />
                <p className="mt-1 text-xs text-slate-500">Must start with https://</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Production governance sink for ACME ERP"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-300/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Events to subscribe</label>
                <div className="grid gap-2 md:grid-cols-2">
                  {ALL_EVENTS.map((ev) => (
                    <label key={ev} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                        className="h-4 w-4 rounded accent-amber-400"
                      />
                      <span className="text-sm font-semibold text-slate-200">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Signing secret (shown once)</label>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-2xl border border-amber-300/25 bg-amber-300/8 px-4 py-3 text-sm font-mono text-amber-200">
                    {formData.secret}
                  </code>
                  <button
                    onClick={() => setFormData((p) => ({ ...p, secret: 'whsec_' + Math.random().toString(36).slice(2, 14) }))}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:border-amber-300/30"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Copy now — it will not be shown again after registration.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleRegister}
                className="rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950"
              >
                Register endpoint
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(''); }}
                className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-slate-300"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Webhooks list */}
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Registered endpoints</p>
          {webhooks.length === 0 && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-slate-400">No webhooks registered yet. Click &ldquo;Register webhook&rdquo; to add one.</p>
            </div>
          )}
          <div className="mt-4 grid gap-4">
            {webhooks.map((wh) => (
              <article key={wh.id} className="rounded-3xl border border-white/10 bg-[#0b0d10] p-5">
                {/* Webhook header row */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {statusBadge(wh.status)}
                      <code className="truncate text-sm font-mono font-bold text-white">
                        {wh.url.length > 55 ? wh.url.slice(0, 55) + '…' : wh.url}
                      </code>
                    </div>
                    {wh.description && (
                      <p className="mt-1 text-xs text-slate-400">{wh.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {wh.events.map((ev) => (
                        <span key={ev} className="rounded-full border border-amber-300/20 bg-amber-300/8 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                          {ev}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Created {wh.createdAt}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTest(wh.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:border-amber-300/30"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggle(wh.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                        wh.status === 'ACTIVE' || wh.status === 'FAILING'
                          ? 'border-white/10 bg-white/5 text-slate-300'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {wh.status === 'ACTIVE' || wh.status === 'FAILING' ? 'Disable' : 'Enable'}
                    </button>
                    {deleteConfirm === wh.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(wh.id)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300"
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(wh.id)}
                        className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs font-bold text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Test result */}
                {testResults[wh.id] && (
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2 text-xs font-semibold text-emerald-300">
                    {testResults[wh.id]}
                  </div>
                )}

                {/* Delivery logs toggle */}
                <button
                  onClick={() => toggleLog(wh.id)}
                  className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-200"
                >
                  <span>{expandedLogs[wh.id] ? '▾' : '▸'}</span>
                  Delivery logs ({wh.deliveryLogs.length})
                </button>

                {/* Delivery logs */}
                {expandedLogs[wh.id] && (
                  <div className="mt-3 grid gap-2">
                    {wh.deliveryLogs.map((dl) => (
                      <div key={dl.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          {httpStatusBadge(dl.httpStatus)}
                          <span className="text-xs font-mono text-slate-400">{dl.timestamp}</span>
                          <span className="rounded-full border border-amber-300/20 bg-amber-300/8 px-2 py-0.5 text-xs font-semibold text-amber-200">
                            {dl.eventType}
                          </span>
                          <span className="text-xs text-slate-500">{dl.durationMs}ms</span>
                          {(dl.httpStatus < 200 || dl.httpStatus >= 300) && (
                            <button
                              onClick={() => handleRetry(wh.id, dl.id)}
                              className="ml-auto rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-200"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => togglePayload(dl.id)}
                          className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-300"
                        >
                          {expandedPayloads[dl.id] ? 'Hide' : 'Show'} request / response
                        </button>
                        {expandedPayloads[dl.id] && (
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Request</p>
                              <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/30 p-3 text-xs leading-5 text-slate-300">{dl.requestPayload}</pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Response</p>
                              <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/30 p-3 text-xs leading-5 text-slate-300">{dl.responsePayload}</pre>
                            </div>
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
