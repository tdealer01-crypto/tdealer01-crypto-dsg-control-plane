'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

type GraphNode = {
  id: string;
  title: string;
  kind: 'trigger' | 'condition' | 'action' | 'terminal';
  left: string;
  top: string;
  accent: string;
  meta: string;
};

function formatDate(value?: string) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildGraphNodes(policy: PolicyItem | null): GraphNode[] {
  const thresholds = policy?.thresholds || {};
  const thresholdKeys = Object.keys(thresholds);
  const previewKey = thresholdKeys[0] || 'threshold';
  const previewValue =
    thresholdKeys.length > 0
      ? JSON.stringify((thresholds as Record<string, unknown>)[previewKey])
      : 'configured';

  return [
    {
      id: 'trigger',
      title: 'INGRESS_REQUEST',
      kind: 'trigger',
      left: 'left-20',
      top: 'top-40',
      accent: 'border-[#81ecff] text-[#00d4ec]',
      meta: policy?.name || 'Policy ingress',
    },
    {
      id: 'condition',
      title: policy?.name?.toUpperCase() || 'AUTH_VALIDATION',
      kind: 'condition',
      left: 'left-[420px]',
      top: 'top-10',
      accent: 'border-[#00fe66] text-[#00fe66]',
      meta: `${previewKey}: ${previewValue}`,
    },
    {
      id: 'action',
      title: policy?.governance_state?.toUpperCase() || 'RUNTIME_DECISION',
      kind: 'action',
      left: 'left-[420px]',
      top: 'top-72',
      accent: 'border-[#ff6e85] text-[#ff6e85]',
      meta: `status: ${policy?.status || 'draft'}`,
    },
    {
      id: 'terminal',
      title: 'POLICY_ENFORCED',
      kind: 'terminal',
      left: 'left-[760px]',
      top: 'top-40',
      accent: 'border-[#81ecff] text-[#81ecff]',
      meta: policy?.version || 'v1',
    },
  ];
}

async function fetchPolicies(): Promise<PoliciesResponse> {
  const response = await fetch('/api/policies', { cache: 'no-store' });
  const json = (await response.json().catch(() => ({}))) as PoliciesResponse;

  if (!response.ok) {
    throw new Error(json.error || 'Failed to load policies');
  }

  return json;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [manifest, setManifest] = useState('');
  const [source, setSource] = useState('runtime policies');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;

    fetchPolicies()
      .then((data) => {
        if (!alive) return;

        const items = data.items || [];
        setPolicies(items);
        setSource(data.source || 'runtime policies');

        if (items[0]) {
          setSelectedId(items[0].id);
          setManifest(JSON.stringify(items[0].thresholds || {}, null, 2));
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load policies');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedPolicy = useMemo(
    () => policies.find((item) => item.id === selectedId) || policies[0] || null,
    [policies, selectedId],
  );

  useEffect(() => {
    if (!selectedPolicy) return;
    setManifest(JSON.stringify(selectedPolicy.thresholds || {}, null, 2));
  }, [selectedPolicy]);

  const graphNodes = useMemo(() => buildGraphNodes(selectedPolicy), [selectedPolicy]);

  async function createRuntimePolicy() {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const thresholds = JSON.parse(manifest || '{}') as Record<string, unknown>;
      const payload = {
        name: selectedPolicy?.name || 'Graph Policy',
        version: selectedPolicy?.version || 'v1',
        status: 'draft',
        thresholds,
        governance_state: selectedPolicy?.governance_state || 'proposed',
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || 'Failed to push policy to runtime');
      }

      setNotice(`Policy pushed to runtime${json.id ? `: ${json.id}` : ''}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to push policy to runtime',
      );
    } finally {
      setSaving(false);
    }
  }

  const policyNavItems: [string, string, boolean][] = [
    ['dashboard', 'Overview', false],
    ['hub', 'Policy Graph', true],
    ['sync_alt', 'Execution Loops', false],
    ['gavel', 'Audit Evidence', false],
    ['verified_user', 'Verification', false],
  ];

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0d0e11] text-[#f7f6f9]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0d0e11] px-6 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-6">
          <span className="font-headline text-xl font-bold uppercase tracking-tighter text-[#00E5FF]">
            DSG ONE
          </span>
          <nav className="hidden h-full items-center gap-8 md:flex">
            <Link
              className="font-['Chakra_Petch'] text-sm uppercase tracking-widest text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]"
              href="/dashboard"
            >
              Overview
            </Link>
            <Link
              className="font-['Chakra_Petch'] text-sm font-bold uppercase tracking-widest text-[#00fe66]"
              href="/dashboard/policies"
            >
              Policy Graph
            </Link>
            <Link
              className="font-['Chakra_Petch'] text-sm uppercase tracking-widest text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]"
              href="/dashboard/executions"
            >
              Execution Loops
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="border-l-2 border-[#81ecff] bg-[#181a1d] px-3 py-1 font-mono text-[10px] tracking-tighter text-[#81ecff]">
            ENV: ACTIVE_IN_PRODUCTION
          </div>
        </div>
      </header>

      <aside className="fixed left-0 z-40 flex h-full w-64 flex-col border-r border-[#47484b]/10 bg-[#0d0e11] pb-4 pt-20">
        <div className="mb-8 px-6">
          <div className="font-headline text-lg font-black tracking-widest text-[#00E5FF]">
            OPERATOR_01
          </div>
          <div className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-[#ababae]">
            LEVEL_4_ACCESS
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {policyNavItems.map(([icon, label, active]) => (
            <div
              key={label}
              className={[
                "group flex items-center px-6 py-3 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] transition-all duration-200",
                active
                  ? 'border-l-4 border-[#00fe66] bg-[#1e2023] text-[#00E5FF] shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]'
                  : 'text-slate-500',
              ].join(' ')}
            >
              <span className="material-symbols-outlined mr-4">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <section className="fixed bottom-0 right-0 top-16 z-40 flex w-96 flex-col border-l border-[#47484b]/10 bg-[#121316]">
        <div className="border-b border-[#47484b]/10 p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest">
              Inspector
            </h2>
            <span className="bg-[#242629] px-2 py-0.5 font-mono text-[10px] text-[#00fe66]">
              {selectedPolicy?.id || 'NO_POLICY'}
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-tighter text-[#ababae]">
            Runtime-backed policy inspector
          </p>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {error ? (
            <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {notice}
            </div>
          ) : null}

          <div className="space-y-4">
            <h3 className="border-b border-[#81ecff]/20 pb-1 font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">
              General_Settings
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#ababae]">
                  Policy_Name
                </label>
                <input
                  className="border-0 border-b border-[#47484b] bg-black p-1 font-mono text-xs text-[#81ecff] focus:border-[#81ecff] focus:ring-0"
                  readOnly
                  type="text"
                  value={selectedPolicy?.name || 'NONE'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#ababae]">
                  Version
                </label>
                <input
                  className="border-0 border-b border-[#47484b] bg-black p-1 font-mono text-xs text-[#f7f6f9] focus:border-[#81ecff] focus:ring-0"
                  readOnly
                  type="text"
                  value={selectedPolicy?.version || 'v1'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#ababae]">
                  Governance_State
                </label>
                <input
                  className="border-0 border-b border-[#47484b] bg-black p-1 font-mono text-xs text-[#f7f6f9] focus:border-[#81ecff] focus:ring-0"
                  readOnly
                  type="text"
                  value={selectedPolicy?.governance_state || 'legacy'}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#81ecff]/20 pb-1">
              <h3 className="font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">
                Logic_Manifest
              </h3>
              <span className="font-mono text-[8px] text-[#ababae]">READ/WRITE</span>
            </div>
            <textarea
              value={manifest}
              onChange={(e) => setManifest(e.target.value)}
              className="min-h-[220px] w-full border border-[#47484b] bg-black p-4 font-mono text-[11px] leading-relaxed text-[#ababae] focus:border-[#81ecff] focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            <h3 className="border-b border-[#81ecff]/20 pb-1 font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">
              Policy_List
            </h3>
            <div className="space-y-2">
              {loading ? (
                <div className="border border-[#47484b] bg-black p-3 text-sm text-slate-500">
                  Loading policies…
                </div>
              ) : null}
              {!loading && policies.length === 0 ? (
                <div className="border border-[#47484b] bg-black p-3 text-sm text-slate-500">
                  No policies found.
                </div>
              ) : null}
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setSelectedId(policy.id)}
                  className={[
                    'w-full border p-3 text-left text-sm',
                    policy.id === selectedPolicy?.id
                      ? 'border-[#00fe66]/40 bg-[#00fe66]/10 text-[#00fe66]'
                      : 'border-[#47484b] bg-black text-slate-300',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{policy.name}</span>
                    <span className="font-mono text-xs">{policy.version}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {policy.status} · {formatDate(policy.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#181a1d] p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                selectedPolicy &&
                setManifest(JSON.stringify(selectedPolicy.thresholds || {}, null, 2))
              }
              className="flex-1 border border-[#47484b]/30 bg-[#242629] px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={createRuntimePolicy}
              className="flex-1 bg-[#00fe66] px-4 py-2 font-headline text-[10px] font-bold uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {saving ? 'Pushing…' : 'Push to Runtime'}
            </button>
          </div>
        </div>
      </section>

      <div className="pl-64 pr-96 pt-16">
        <div className="flex h-12 items-center justify-between border-b border-[#47484b]/10 bg-[#1e2023] px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#00fe66]">●</span>
              <span className="font-headline text-xs uppercase tracking-widest">
                Live_Policy_Engine.v4
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Source: {source}
            </span>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={createRuntimePolicy}
            className="bg-[#81ecff] px-4 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-[#005762] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            {saving ? 'Deploying…' : 'Deploy Update'}
          </button>
        </div>

        <div className="relative h-[calc(100vh-7rem)] overflow-hidden bg-[#0d0e11] [background-image:radial-gradient(circle,_#242629_1px,_transparent_1px)] [background-size:32px_32px]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <path
              d="M 280 200 C 350 200, 350 80, 420 80"
              stroke="#00fe66"
              strokeDasharray="8"
              strokeOpacity="0.6"
              fill="none"
              strokeWidth="2"
            />
            <path
              d="M 280 200 C 350 200, 350 320, 420 320"
              stroke="#00fe66"
              strokeDasharray="8"
              strokeOpacity="0.6"
              fill="none"
              strokeWidth="2"
            />
            <path
              d="M 620 80 C 690 80, 690 200, 760 200"
              stroke="#00fe66"
              strokeDasharray="8"
              strokeOpacity="0.6"
              fill="none"
              strokeWidth="2"
            />
            <path
              d="M 620 320 C 690 320, 690 200, 760 200"
              stroke="#00fe66"
              strokeDasharray="8"
              strokeOpacity="0.6"
              fill="none"
              strokeWidth="2"
            />
          </svg>

          {graphNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => setSelectedId(selectedPolicy?.id || '')}
              className={`absolute w-[200px] border-l-4 bg-[#242629] p-3 text-left shadow-lg ${node.left} ${node.top} ${node.accent}`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="font-headline text-[9px] uppercase tracking-widest">
                  {node.kind}
                </span>
                <span className="material-symbols-outlined text-xs text-[#ababae]">
                  drag_handle
                </span>
              </div>
              <div className="mb-3 font-headline text-xs font-bold uppercase text-[#f7f6f9]">
                {node.title}
              </div>
              <div className="text-[10px] font-mono text-slate-400">{node.meta}</div>
            </button>
          ))}

          <div className="absolute bottom-6 left-6 border border-[#47484b]/30 bg-[#1e2023]/90 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            Policies: {policies.length} · Selected: {selectedPolicy?.name || 'none'}
          </div>
        </div>
      </div>
    </main>
  );
}
