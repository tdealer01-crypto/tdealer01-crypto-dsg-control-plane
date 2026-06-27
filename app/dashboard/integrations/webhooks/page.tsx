'use client';

import { useState } from 'react';
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

interface RegisterResult {
  org_id: string;
  agent_id: string;
  api_key: string;
  secret?: string;
  secret_returned?: boolean;
}

const INTEGRATION_EVENTS = [
  'execution.completed',
  'execution.initiated',
  'execution.failed',
  'gate.evaluated',
  'gate.approved',
  'gate.rejected',
  'gate.blocked',
  'review.required',
  'action.approved',
  'action.blocked',
  'action.reviewed',
  'proof.created',
  'proof.scan_completed',
  'agent.created',
  'agent.started',
  'agent.completed',
  'agent.failed',
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

function SecretBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <code className="block break-all pr-20 text-xs text-emerald-200">{value}</code>
      <CopyButton text={value} />
    </div>
  );
}

export default function IntegrationWebhooksPage() {
  const [formData, setFormData] = useState({
    email: '',
    app_name: '',
    webhook_url: '',
    allowed_origins: '',
    events: [] as string[],
  });
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [lookup, setLookup] = useState({ agent_id: '', api_key: '', status: '' });
  const [deliveries, setDeliveries] = useState<IntegrationDeliveryLog[]>([]);
  const [deliveryError, setDeliveryError] = useState('');
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  function toggleEvent(event: string) {
    setFormData((previous) => ({
      ...previous,
      events: previous.events.includes(event)
        ? previous.events.filter((item) => item !== event)
        : [...previous.events, event],
    }));
  }

  async function handleRegister() {
    if (!formData.email.includes('@')) { setFormError('Valid email required'); return; }
    if (!formData.app_name || formData.app_name.length < 2) { setFormError('App name required (2+ chars)'); return; }
    if (!formData.webhook_url.startsWith('https://')) { setFormError('Webhook URL must be HTTPS'); return; }
    if (formData.events.length === 0) { setFormError('Select at least one event'); return; }

    setSubmitting(true);
    setFormError('');

    try {
      const regRes = await fetch('/api/integrations/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: formData.email, app_name: formData.app_name }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) { setFormError(regData.error ?? `HTTP ${regRes.status}`); return; }

      const whRes = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${regData.api_key}` },
        body: JSON.stringify({
          agent_id: regData.agent_id,
          webhook_url: formData.webhook_url,
          allowed_origins: formData.allowed_origins.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const whData = await whRes.json();
      if (!whRes.ok) { setFormError(whData.error ?? `HTTP ${whRes.status}`); return; }

      const result: RegisterResult = {
        org_id: regData.org_id,
        agent_id: regData.agent_id,
        api_key: regData.api_key,
        secret: whData.secret,
        secret_returned: Boolean(whData.secret_returned),
      };
      setRegisterResult(result);
      setLookup((previous) => ({ ...previous, agent_id: result.agent_id, api_key: result.api_key }));
      setFormData({ email: '', app_name: '', webhook_url: '', allowed_origins: '', events: [] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchDeliveries() {
    if (!lookup.agent_id || !lookup.api_key) {
      setDeliveryError('agent_id and api_key are required');
      return;
    }

    setLoadingDeliveries(true);
    setDeliveryError('');

    try {
      const params = new URLSearchParams({ agent_id: lookup.agent_id, limit: '100' });
      if (lookup.status) params.set('status', lookup.status);

      const res = await fetch(`/api/integrations/webhook-deliveries?${params.toString()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${lookup.api_key}` },
      });
      const data = await res.json();
      if (!res.ok) { setDeliveryError(data.error ?? `HTTP ${res.status}`); return; }
      setDeliveries(data.deliveries ?? []);
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDeliveries(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.08))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">Integration Webhooks</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Connect external apps to DSG events
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Register an integration, attach a webhook URL, then inspect real delivery logs with Bearer-authenticated access. No demo data is rendered on this page.
              </p>
            </div>
            <Link href="/dashboard/integrations" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:border-emerald-400/40 hover:text-emerald-200">
              Back to integrations
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-black text-white">Register integration + webhook</h2>
            <p className="mt-2 text-sm text-slate-400">The webhook secret is returned once. Store it in your receiver secret manager.</p>

            <div className="mt-6 grid gap-4">
              <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="Operator email" value={formData.email} onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))} />
              <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="App name" value={formData.app_name} onChange={(event) => setFormData((previous) => ({ ...previous, app_name: event.target.value }))} />
              <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="https://yourapp.com/dsg/events" value={formData.webhook_url} onChange={(event) => setFormData((previous) => ({ ...previous, webhook_url: event.target.value }))} />
              <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="Allowed origins, comma separated" value={formData.allowed_origins} onChange={(event) => setFormData((previous) => ({ ...previous, allowed_origins: event.target.value }))} />
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Events</p>
              <div className="flex flex-wrap gap-2">
                {INTEGRATION_EVENTS.map((event) => {
                  const active = formData.events.includes(event);
                  return (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                      {event}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</p>}

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRegister()}
              className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Registering…' : 'Register webhook'}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="text-xl font-black text-white">One-time credentials</h2>
            <p className="mt-2 text-sm text-slate-400">These values are shown only after registration. Do not commit them to GitHub.</p>
            {registerResult ? (
              <div className="mt-6 grid gap-4">
                <SecretBox label="Org ID" value={registerResult.org_id} />
                <SecretBox label="Agent ID" value={registerResult.agent_id} />
                <SecretBox label="API Key" value={registerResult.api_key} />
                {registerResult.secret ? (
                  <SecretBox label="Webhook signing secret" value={registerResult.secret} />
                ) : (
                  <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Existing webhook updated. Secret was not rotated and is not returned again.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">Register a webhook to display credentials.</p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-xl font-black text-white">Delivery logs</h2>
          <p className="mt-2 text-sm text-slate-400">Query real delivery logs by agent_id and API key. This avoids demo/mock rows in production UI.</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_180px_120px]">
            <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="agt_..." value={lookup.agent_id} onChange={(event) => setLookup((previous) => ({ ...previous, agent_id: event.target.value }))} />
            <input className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" placeholder="dsg_live_..." value={lookup.api_key} onChange={(event) => setLookup((previous) => ({ ...previous, api_key: event.target.value }))} />
            <select className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50" value={lookup.status} onChange={(event) => setLookup((previous) => ({ ...previous, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="delivered">delivered</option>
              <option value="failed">failed</option>
              <option value="retrying">retrying</option>
              <option value="dead_letter">dead_letter</option>
              <option value="pending">pending</option>
            </select>
            <button type="button" onClick={() => void fetchDeliveries()} disabled={loadingDeliveries} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
              {loadingDeliveries ? 'Loading…' : 'Fetch'}
            </button>
          </div>

          {deliveryError && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{deliveryError}</p>}

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            {deliveries.length === 0 ? (
              <p className="bg-slate-950/60 p-5 text-sm text-slate-400">No delivery rows loaded.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {deliveries.map((delivery) => {
                  const expanded = Boolean(expandedPayloads[delivery.id]);
                  return (
                    <div key={delivery.id} className="bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-mono text-sm font-bold text-white">{delivery.event}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(delivery.created_at).toUTCString()} • attempt {delivery.attempt} • {delivery.duration_ms}ms</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(delivery.status)}
                          {httpStatusBadge(delivery.response_code)}
                          <button type="button" onClick={() => setExpandedPayloads((previous) => ({ ...previous, [delivery.id]: !expanded }))} className="rounded-lg border border-white/10 px-3 py-1 text-xs font-bold text-slate-300 hover:text-white">
                            {expanded ? 'Hide payload' : 'Show payload'}
                          </button>
                        </div>
                      </div>
                      {delivery.error_message && <p className="mt-3 text-sm text-red-200">{delivery.error_message}</p>}
                      {expanded && (
                        <pre className="mt-4 overflow-auto rounded-xl border border-white/10 bg-slate-950 p-4 text-xs text-slate-300">
                          {JSON.stringify({ request: delivery.request_payload, response: delivery.response_payload }, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
