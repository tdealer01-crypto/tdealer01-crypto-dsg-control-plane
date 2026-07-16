'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/Skeleton';

type PolicyItem = {
  id: string;
  name: string;
  version: string;
  status: string;
  thresholds?: Record<string, unknown>;
  governance_state?: string;
  updated_at?: string;
};

type PoliciesResponse = {
  items?: PolicyItem[];
  source?: string;
  error?: string;
};

const QUICK_THRESHOLD = {
  block_risk_score: 0.8,
  stabilize_risk_score: 0.4,
  oscillation_window: 4,
  audit_mode: true,
};

const FLOW_STEPS = [
  ['1', 'Load policy', 'Read the current org runtime policy from the real backend'],
  ['2', 'Review thresholds', 'Review block/stabilize/audit conditions before applying them to the agent'],
  ['3', 'Edit safely', 'Edit the JSON manifest with validation — no real actions are triggered from the public page'],
  ['4', 'Deploy update', 'Create a new runtime policy version and store a governance event'],
];

function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function statusTone(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('active')) return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100';
  if (normalized.includes('draft') || normalized.includes('proposed')) return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return 'border-slate-300/20 bg-slate-400/10 text-slate-200';
}

function prettyJson(value: unknown) {
  return JSON.stringify(value || {}, null, 2);
}

async function fetchPolicies(): Promise<PoliciesResponse> {
  const response = await fetch('/api/policies', { cache: 'no-store' });
  const json = (await response.json().catch(() => ({}))) as PoliciesResponse;
  if (!response.ok) throw new Error(json.error || 'Failed to load policies');
  return json;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [manifest, setManifest] = useState(prettyJson(QUICK_THRESHOLD));
  const [source, setSource] = useState('runtime_policies');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshPolicies() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPolicies();
      const items = data.items || [];
      setPolicies(items);
      setSource(data.source || 'runtime_policies');
      if (items[0]) {
        setSelectedId((current) => current || items[0].id);
        setManifest(prettyJson(items.find((item) => item.id === selectedId)?.thresholds || items[0].thresholds || QUICK_THRESHOLD));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPolicy = useMemo(
    () => policies.find((item) => item.id === selectedId) || policies[0] || null,
    [policies, selectedId],
  );

  useEffect(() => {
    if (selectedPolicy) setManifest(prettyJson(selectedPolicy.thresholds || QUICK_THRESHOLD));
  }, [selectedPolicy]);

  const thresholdEntries = Object.entries(selectedPolicy?.thresholds || QUICK_THRESHOLD);

  async function createRuntimePolicy(nextStatus = 'draft') {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const thresholds = JSON.parse(manifest || '{}') as Record<string, unknown>;
      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: selectedPolicy?.name || 'Default DSG Runtime Policy',
          version: selectedPolicy?.version || 'v1',
          status: nextStatus,
          thresholds,
          governance_state: nextStatus === 'active' ? 'active_in_production' : 'proposed',
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; id?: string; name?: string };
      if (!response.ok) throw new Error(json.error || 'Failed to deploy policy update');
      setNotice(`Policy update created${json.id ? `: ${json.id}` : ''}`);
      setSelectedId(json.id || selectedId);
      await refreshPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy policy update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PageHeader
            title="Policy Control Flow"
            description="Load policy from runtime, review thresholds, edit the manifest, and deploy as a new policy version that the agent uses to inspect actions before execution."
          />
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/dashboard" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Dashboard</Link>
            <Link href="/product" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Product</Link>
            <button onClick={refreshPolicies} disabled={loading} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
              {loading ? 'Refreshing…' : 'Refresh runtime'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {FLOW_STEPS.map(([step, title, body]) => (
            <Card key={step}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-sm font-bold text-amber-100">{step}</div>
              <h2 className="mt-4 text-sm font-semibold text-white">{title}</h2>
              <p className="mt-2 text-xs leading-6 text-slate-400">{body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Runtime source</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{source}</h2>
                </div>
                <span className={['rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]', statusTone(selectedPolicy?.status)].join(' ')}>
                  {selectedPolicy?.status || 'no policy'}
                </span>
              </div>

              {error ? <Card variant="error" className="mt-4 text-sm leading-7">{error}</Card> : null}
              {notice ? <Card variant="success" className="mt-4 text-sm leading-7">{notice}</Card> : null}

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 rounded" />
                    ))}
                  </div>
                ) : null}
                {!loading && policies.length === 0 ? (
                  <Card variant="warning" className="text-sm leading-7">
                    No policy found in runtime. Click Deploy update to create the first policy from the default manifest.
                  </Card>
                ) : null}
                {policies.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => setSelectedId(policy.id)}
                    className={[
                      'w-full border p-4 text-left transition',
                      policy.id === selectedPolicy?.id
                        ? 'border-amber-300/35 bg-amber-300/10'
                        : 'border-white/10 bg-black/20 hover:border-white/25',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{policy.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{policy.id}</p>
                      </div>
                      <span className={['rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]', statusTone(policy.status)].join(' ')}>{policy.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                      <span>Version: {policy.version}</span>
                      <span>State: {policy.governance_state || 'legacy_ready'}</span>
                      <span>Updated: {formatDate(policy.updated_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">What user gets</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Where you see results</h2>
              <p className="mt-3 text-sm leading-7 text-emerald-50/90">
                Once a policy is deployed, the agent/runtime has a new threshold version to use for gate decisions. The dashboard shows the source, status, governance state, and active manifest — all auditable and traceable.
              </p>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Selected policy</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{selectedPolicy?.name || 'New runtime policy'}</h2>
                  <p className="mt-2 text-sm text-slate-400">{selectedPolicy?.governance_state || 'proposed'} · {selectedPolicy?.version || 'v1'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectedPolicy && setManifest(prettyJson(selectedPolicy.thresholds || QUICK_THRESHOLD))}
                    className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-100"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => createRuntimePolicy('active')}
                    className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-950 disabled:opacity-60"
                  >
                    {saving ? 'Deploying…' : 'Deploy active'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {thresholdEntries.map(([key, value]) => (
                  <div key={key} className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{key}</p>
                    <p className="mt-2 font-mono text-lg text-amber-100">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Logic manifest JSON</p>
                  <button
                    type="button"
                    onClick={() => setManifest(prettyJson(QUICK_THRESHOLD))}
                    className="text-xs font-semibold text-amber-200 hover:text-amber-100"
                  >
                    Use safe default
                  </button>
                </div>
                <textarea
                  value={manifest}
                  onChange={(event) => setManifest(event.target.value)}
                  className="mt-3 min-h-[310px] w-full border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-slate-200 outline-none focus:border-amber-300/50"
                  spellCheck={false}
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => createRuntimePolicy('draft')}
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 disabled:opacity-60"
                >
                  Save draft version
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => createRuntimePolicy('active')}
                  className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  Deploy update to runtime
                </button>
              </div>
            </Card>

            <Card>
              <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200">Runtime path</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {['Agent action', 'Policy check', 'Gate decision', 'Evidence trail'].map((item, index) => (
                  <div key={item} className="border border-blue-200/15 bg-black/20 p-4 text-center">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-blue-200/30 bg-blue-200/10 text-sm font-bold text-blue-100">{index + 1}</div>
                    <p className="mt-3 text-xs font-semibold text-white">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
