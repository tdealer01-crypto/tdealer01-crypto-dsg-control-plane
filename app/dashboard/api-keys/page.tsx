'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

type Scope = 'read' | 'write' | 'admin' | 'gates:evaluate' | 'proofs:prove';
type KeyStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type ExpiryOption = 'never' | '30d' | '90d' | '1y';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  createdAt: string;
  lastUsed: string | null;
  expiry: string | null;
  status: KeyStatus;
  requestsThisMonth: number;
}

const ALL_SCOPES: { value: Scope; label: string; description: string }[] = [
  { value: 'read', label: 'read', description: 'Read access to all resources' },
  { value: 'write', label: 'write', description: 'Create and update resources' },
  { value: 'admin', label: 'admin', description: 'Full administrative control' },
  { value: 'gates:evaluate', label: 'gates:evaluate', description: 'Evaluate DSG policy gates' },
  { value: 'proofs:prove', label: 'proofs:prove', description: 'Generate and submit proofs' },
];

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
];

const STATUS_STYLES: Record<KeyStatus, string> = {
  ACTIVE: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  EXPIRED: 'border border-slate-600/40 bg-slate-600/10 text-slate-400',
  REVOKED: 'border border-red-500/40 bg-red-500/10 text-red-400',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<Scope[]>(['read']);
  const [newKeyExpiry, setNewKeyExpiry] = useState<ExpiryOption>('never');
  const [nameError, setNameError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyName, setRevealedKeyName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeys() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch('/api/api-keys');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFetchError((data as { error?: string }).error ?? `HTTP ${res.status}`);
          return;
        }
        const data = await res.json() as { keys: ApiKey[] };
        setKeys(data.keys ?? []);
      } catch {
        setFetchError('Network error — could not load keys');
      } finally {
        setLoading(false);
      }
    }
    loadKeys();
  }, []);

  function toggleScope(scope: Scope) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleCreate() {
    setNameError('');
    setScopeError('');
    setCreateError(null);
    if (!newKeyName.trim()) { setNameError('Key name is required.'); return; }
    if (newKeyScopes.length === 0) { setScopeError('Select at least one scope.'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes, expiry: newKeyExpiry }),
      });
      const data = await res.json() as ApiKey & { key?: string; error?: string; field?: string };
      if (!res.ok) {
        if (data.field === 'name') setNameError(data.error ?? 'Invalid name');
        else if (data.field === 'scopes') setScopeError(data.error ?? 'Invalid scopes');
        else setCreateError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      // data.key is the raw secret — shown once, never retrievable again
      setRevealedKey(data.key ?? null);
      setRevealedKeyName(data.name);
      setKeys((prev) => [data, ...prev]);
      setNewKeyName('');
      setNewKeyScopes(['read']);
      setNewKeyExpiry('never');
      setShowCreateForm(false);
    } catch {
      setCreateError('Network error — key was not created');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, status: 'REVOKED' as KeyStatus } : k));
      }
    } finally {
      setRevoking(null);
      setRevokeConfirmId(null);
    }
  }

  function handleCopy() {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.06))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-300">DSG Enterprise</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">API Key Management</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Create and manage API keys for server-to-server access. Scope keys to the minimum permissions needed and rotate regularly. Keys are hashed on creation — store them securely.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setShowCreateForm((v) => !v); setRevealedKey(null); setCreateError(null); }}
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950"
              >
                {showCreateForm ? 'Cancel' : '+ Create new key'}
              </button>
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* One-time key reveal */}
        {revealedKey && (
          <section className="mt-6 rounded-3xl border border-amber-400/50 bg-amber-400/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-amber-200">Save this key now — it cannot be retrieved after you leave this page.</p>
                <p className="mt-1 text-xs text-amber-300/70">Key name: <span className="font-semibold">{revealedKeyName}</span></p>
                <div className="mt-3 flex items-center gap-3">
                  <code className="flex-1 overflow-x-auto rounded-xl border border-amber-400/30 bg-black/40 px-4 py-3 font-mono text-sm text-amber-100">
                    {revealedKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-300/20"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="flex-shrink-0 rounded-lg p-2 text-amber-300/60 hover:text-amber-200"
                aria-label="Dismiss"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </section>
        )}

        {showCreateForm && (
          <Card className="mt-6">
            <h2 className="text-lg font-black text-white">Create new API key</h2>
            {createError && (
              <Card variant="error" className="mt-3">
                <p className="text-sm">{createError}</p>
              </Card>
            )}
            <div className="mt-5 grid gap-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Key name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Gateway, CI Read Key..."
                  className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-400/50 focus:outline-none"
                />
                {nameError && <p className="mt-1 text-xs font-semibold text-red-400">{nameError}</p>}
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Scopes</p>
                <div className="flex flex-wrap gap-3">
                  {ALL_SCOPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleScope(s.value)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        newKeyScopes.includes(s.value)
                          ? 'border-blue-400/60 bg-blue-400/20 text-blue-200'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {scopeError && <p className="mt-2 text-xs font-semibold text-red-400">{scopeError}</p>}
                <div className="mt-3 space-y-1">
                  {ALL_SCOPES.filter((s) => newKeyScopes.includes(s.value)).map((s) => (
                    <p key={s.value} className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-400">{s.label}</span> — {s.description}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Expiry</p>
                <div className="flex flex-wrap gap-3">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewKeyExpiry(opt.value)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                        newKeyExpiry === opt.value
                          ? 'border-amber-300/60 bg-amber-300/15 text-amber-200'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="rounded-xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                >
                  {creating ? 'Generating…' : 'Generate key'}
                </button>
              </div>
            </div>
          </Card>
        )}

        <Card className="mt-6">
          <p className="text-xs font-semibold text-slate-400">
            <span className="mr-1 font-black text-amber-300">Security:</span>
            Keys are hashed server-side (SHA-256) and cannot be retrieved after creation. Treat them like passwords. Rotate every 90 days for production workloads.
          </p>
        </Card>

        <Card className="mt-6">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">API keys</p>
            {!loading && <h2 className="mt-1 text-2xl font-black text-white">{keys.length} key{keys.length !== 1 ? 's' : ''}</h2>}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading keys…</div>
          ) : fetchError ? (
            <Card variant="error" className="text-center py-10">
              <p className="text-sm font-semibold">{fetchError}</p>
              <p className="mt-1 text-xs text-slate-400">Make sure you are signed in and have an organisation set up.</p>
            </Card>
          ) : keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 py-16 text-center">
              <p className="text-lg font-bold text-slate-400">No API keys yet</p>
              <p className="mt-2 text-sm text-slate-500">Create your first key to start integrating.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Name</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Key</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Scopes</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Created</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Last used</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Expiry</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Requests</th>
                    <th className="pb-3 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {keys.map((key) => (
                    <tr key={key.id} className="group">
                      <td className="py-4 pr-4 font-semibold text-slate-100">{key.name}</td>
                      <td className="py-4 pr-4">
                        <code className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-mono text-xs text-slate-300">
                          {key.prefix}
                        </code>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="rounded-md border border-blue-400/25 bg-blue-400/10 px-2 py-0.5 text-xs font-semibold text-blue-300"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-xs text-slate-400 whitespace-nowrap">{fmtDate(key.createdAt)}</td>
                      <td className="py-4 pr-4 text-xs text-slate-400 whitespace-nowrap">{key.lastUsed ? fmtDate(key.lastUsed) : '—'}</td>
                      <td className="py-4 pr-4 text-xs text-slate-400 whitespace-nowrap">{key.expiry ? fmtDate(key.expiry) : 'Never'}</td>
                      <td className="py-4 pr-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[key.status]}`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-slate-400 whitespace-nowrap">
                        {(key.requestsThisMonth ?? 0).toLocaleString()} this month
                      </td>
                      <td className="py-4 text-right">
                        {key.status === 'ACTIVE' && (
                          revokeConfirmId === key.id ? (
                            <span className="inline-flex gap-2">
                              <button
                                onClick={() => handleRevoke(key.id)}
                                disabled={revoking === key.id}
                                className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25 disabled:opacity-60"
                              >
                                {revoking === key.id ? 'Revoking…' : 'Confirm revoke'}
                              </button>
                              <button
                                onClick={() => setRevokeConfirmId(null)}
                                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setRevokeConfirmId(key.id)}
                              className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400 hover:border-red-500/40 hover:bg-red-500/15"
                            >
                              Revoke
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Scope reference</p>
          <h2 className="mt-3 text-2xl font-black text-white">Available permission scopes</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ALL_SCOPES.map((s) => (
              <article key={s.value} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <code className="text-sm font-black text-blue-300">{s.label}</code>
                <p className="mt-2 text-xs leading-6 text-slate-400">{s.description}</p>
              </article>
            ))}
          </div>
        </Card>

      </div>
    </main>
  );
}
