'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AgentInfo { status: string; role: string }
interface TrinityStatus {
  ok: boolean; system: string; version: string;
  agents: Record<string, AgentInfo>;
  governance: { policyVersion: string; constraintsEnforced: number };
  checkedAt: string;
}
interface ExecutionResult {
  ok: boolean; dry_run: boolean; planHash: string;
  governance: { approved: boolean; policyVersion: string; violations: string[]; constraints: Array<{ name: string; satisfied: boolean }> };
  execution?: { deliverableLength: number; qualityScore: number; proofHash: string; executionTimeMs: number };
  verification?: { passed: boolean; qualityScore: number; issues: string[] };
  reputation?: { newReputation: number; reputationChange: number; tierChanged: boolean };
  auditHash: string; completedAt: string; error?: string;
}
interface JobExecution {
  job_id: string; agent_id: string; status: string;
  quality_score?: number; proof_hash?: string; started_at: string; completed_at?: string;
}
interface AgentProfile {
  agent_id: string; reputation: number; tier: string;
  completed_jobs: number; total_earnings: number;
}
interface JobListing {
  id: string; platform: string; title: string; category: string;
  difficulty: string; reward: { amount: number; currency: string; usdEstimate: number };
  deadline: string; status: string; source: 'live' | 'demo';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const AGENT_COLORS: Record<string, string> = {
  Mind: 'text-violet-400', Hand: 'text-blue-400',
  Eye: 'text-cyan-400', Nerve: 'text-emerald-400', Spine: 'text-amber-400',
};
const AGENT_ICONS: Record<string, string> = {
  Mind: '🧠', Hand: '✋', Eye: '👁️', Nerve: '⚡', Spine: '🦴',
};
const JOB_CATEGORIES = [
  'smart-contract-audit','frontend-dev','backend-api',
  'documentation','testing','security-review','data-analysis','devops',
];
const TIER_CONFIG = {
  bronze:   { color: 'text-orange-400', bg: 'bg-orange-900/30', bar: 'bg-orange-500', label: 'Bronze',   min: 0,  max: 40  },
  silver:   { color: 'text-slate-300',  bg: 'bg-slate-700/50',  bar: 'bg-slate-400',  label: 'Silver',   min: 40, max: 70  },
  gold:     { color: 'text-yellow-400', bg: 'bg-yellow-900/30', bar: 'bg-yellow-500', label: 'Gold',     min: 70, max: 90  },
  platinum: { color: 'text-cyan-300',   bg: 'bg-cyan-900/30',   bar: 'bg-cyan-400',   label: 'Platinum', min: 90, max: 100 },
};
const PLATFORM_LABELS: Record<string, string> = {
  'github-bounties': 'GitHub', 'solana-bounties': 'Solana Earn',
  'immunefi': 'Immunefi', 'hackerone': 'HackerOne', 'upwork': 'Upwork',
};
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-emerald-400', medium: 'text-yellow-400',
  hard: 'text-orange-400', expert: 'text-red-400',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function AgentCard({ name, info }: { name: string; info: AgentInfo }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{AGENT_ICONS[name] ?? '🤖'}</span>
        <span className={`font-bold ${AGENT_COLORS[name] ?? 'text-white'}`}>{name}</span>
        <span className="ml-auto rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-400">{info.status}</span>
      </div>
      <p className="text-xs text-slate-400">{info.role}</p>
    </div>
  );
}

function TierProgressBar({ reputation, tier }: { reputation: number; tier: string }) {
  const cfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.bronze;
  const pct = Math.min(100, Math.max(0, ((reputation - cfg.min) / (cfg.max - cfg.min)) * 100));
  const nextTier = tier === 'bronze' ? 'Silver' : tier === 'silver' ? 'Gold' : tier === 'gold' ? 'Platinum' : null;

  return (
    <div className={`rounded-xl border border-slate-700 p-4 ${cfg.bg}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
          {tier === 'platinum' && <span className="text-xs text-cyan-400">MAX TIER</span>}
        </div>
        <span className={`text-2xl font-bold ${cfg.color}`}>{reputation}</span>
      </div>

      <div className="mb-2 h-2 rounded-full bg-slate-700">
        <div className={`h-2 rounded-full transition-all duration-500 ${cfg.bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{cfg.min}</span>
        {nextTier ? (
          <span className="text-slate-400">
            {cfg.max - reputation} rep to <span className="text-slate-300">{nextTier}</span>
          </span>
        ) : <span className="text-cyan-400">Elite status</span>}
        <span>{cfg.max}</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1">
        {Object.entries(TIER_CONFIG).map(([key, t]) => (
          <div
            key={key}
            className={`rounded py-1 text-center text-xs font-medium transition-colors ${
              key === tier ? `${t.bg} ${t.color} border border-current/30` : 'text-slate-600'
            }`}
          >
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function GovernanceConstraints({ constraints }: { constraints: Array<{ name: string; satisfied: boolean }> }) {
  return (
    <div className="space-y-1">
      {constraints.map((c) => (
        <div key={c.name} className="flex items-center gap-2 text-xs">
          <span className={c.satisfied ? 'text-emerald-400' : 'text-red-400'}>{c.satisfied ? '✅' : '❌'}</span>
          <span className={c.satisfied ? 'text-slate-300' : 'text-red-300'}>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: 'bg-emerald-900/50 text-emerald-400',
    paid: 'bg-blue-900/50 text-blue-400',
    submitted: 'bg-yellow-900/50 text-yellow-400',
    failed: 'bg-red-900/50 text-red-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TrinityDashboardPage() {
  // System status
  const [systemStatus, setSystemStatus] = useState<TrinityStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  // Orchestration
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [runError, setRunError] = useState('');
  const [jobTitle, setJobTitle] = useState('Smart Contract Security Audit');
  const [jobCategory, setJobCategory] = useState('smart-contract-audit');
  const [rewardAmount, setRewardAmount] = useState(2.0);
  const [agentReputation, setAgentReputation] = useState(80);
  const [agentId] = useState('dashboard-test-agent');

  // Execution history (Feature 1)
  const [history, setHistory] = useState<JobExecution[]>([]);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyConfigured, setHistoryConfigured] = useState(true);

  // Job discovery (Feature 2)
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsDemo, setJobsDemo] = useState(true);
  const [discoverCategory, setDiscoverCategory] = useState('');

  // Active tab
  const [tab, setTab] = useState<'orchestrate' | 'history' | 'discover'>('orchestrate');

  // Load system status
  const loadStatus = useCallback(async () => {
    setStatusLoading(true); setStatusError('');
    try {
      const res = await fetch('/api/trinity/status');
      const data = await res.json();
      if (!data.ok) throw new Error('Status check failed');
      setSystemStatus(data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed');
    } finally { setStatusLoading(false); }
  }, []);

  // Load execution history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/trinity/history?agentId=${agentId}&limit=20`);
      const data = await res.json();
      setHistory(data.executions ?? []);
      setProfile(data.profile ?? null);
      setHistoryConfigured(data.configured !== false);
    } finally { setHistoryLoading(false); }
  }, [agentId]);

  // Discover jobs
  const discoverJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const url = `/api/trinity/discover?limit=8${discoverCategory ? `&category=${discoverCategory}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setJobsDemo(data.demo === true);
    } finally { setJobsLoading(false); }
  }, [discoverCategory]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);
  useEffect(() => { if (tab === 'discover') discoverJobs(); }, [tab, discoverJobs]);

  // Update local reputation display after orchestration
  const currentReputation = result?.reputation?.newReputation ?? agentReputation;
  const currentTier =
    currentReputation >= 90 ? 'platinum' :
    currentReputation >= 70 ? 'gold' :
    currentReputation >= 40 ? 'silver' : 'bronze';

  async function runOrchestration() {
    setRunning(true); setRunError(''); setResult(null);
    try {
      const deadline = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const res = await fetch('/api/trinity/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dry_run: true,
          job: { title: jobTitle, category: jobCategory, rewardAmount, rewardCurrency: 'SOL', deadline },
          agent: { agentId, reputation: agentReputation, skills: [jobCategory, 'security-review', 'testing'] },
        }),
      });
      const data = await res.json();
      setResult(data);
      if (!data.ok && data.error) setRunError(data.error);
    } catch (err) { setRunError(err instanceof Error ? err.message : 'Failed'); }
    finally { setRunning(false); }
  }

  const scoreColor = (s: number) => s >= 85 ? 'text-emerald-400' : s >= 70 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔱</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Trinity AI System</h1>
            <p className="text-sm text-slate-400">Multi-Agent Orchestration • DSG Governance • Dry-Run Mode</p>
          </div>
          <button onClick={loadStatus} disabled={statusLoading}
            className="ml-auto rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">
            {statusLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Agent Registry */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Agent Registry</h2>
        {statusError && <p className="mb-3 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">{statusError}</p>}
        {statusLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800" />)}
          </div>
        ) : systemStatus ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries(systemStatus.agents).map(([name, info]) => <AgentCard key={name} name={name} info={info} />)}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-600">
              <span>Policy v{systemStatus.governance.policyVersion}</span>
              <span>{systemStatus.governance.constraintsEnforced} constraints</span>
              <span className="ml-auto">Checked {new Date(systemStatus.checkedAt).toLocaleTimeString()}</span>
            </div>
          </>
        ) : null}
      </section>

      {/* Tier Progress (Feature 3) — always visible */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Tier Progression</h2>
        <TierProgressBar reputation={currentReputation} tier={profile?.tier ?? currentTier} />
        {profile && (
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span>Jobs: <span className="text-slate-300">{profile.completed_jobs}</span></span>
            <span>Earnings: <span className="text-slate-300">{profile.total_earnings.toFixed(2)} SOL</span></span>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-800">
        {(['orchestrate', 'history', 'discover'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-b-2 border-violet-500 text-violet-400' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t === 'orchestrate' ? '▶ Orchestrate' : t === 'history' ? '📋 History' : '🧠 Discover Jobs'}
          </button>
        ))}
      </div>

      {/* Tab: Orchestrate */}
      {tab === 'orchestrate' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">Configure & Run</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Job Title</label>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Category</label>
                <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Reward (SOL)</label>
                  <input type="number" min={0} max={99999} step={0.1} value={rewardAmount}
                    onChange={(e) => setRewardAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Reputation</label>
                  <input type="number" min={0} max={100} value={agentReputation}
                    onChange={(e) => setAgentReputation(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                </div>
              </div>
              <button onClick={runOrchestration} disabled={running}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
                {running ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Running…</span> : '▶ Run Orchestration'}
              </button>
              {runError && <p className="rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">{runError}</p>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">Execution Result</h2>
            {!result && !running && (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">Run an orchestration to see results</div>
            )}
            {running && (
              <div className="flex h-48 items-center justify-center">
                <div className="text-center">
                  <div className="mb-3 animate-pulse text-3xl">🔱</div>
                  <p className="text-sm text-slate-400">Spine → Hand → Eye → Nerve…</p>
                </div>
              </div>
            )}
            {result && !running && (
              <div className="space-y-4 text-sm">
                <div className={`rounded-lg px-3 py-2 ${result.ok ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                  {result.ok ? '✅ Orchestration complete (dry-run)' : `❌ ${result.error ?? 'Blocked'}`}
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Plan Hash (Spine)</p>
                  <p className="break-all font-mono text-xs text-violet-300">{result.planHash}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs text-slate-500">Governance — Policy v{result.governance.policyVersion}</p>
                  <GovernanceConstraints constraints={result.governance.constraints} />
                </div>
                {result.execution && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="mb-2 text-xs font-medium text-blue-400">✋ Hand — Execution</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-400">Deliverable</span><span className="text-slate-200">{result.execution.deliverableLength} bytes</span>
                      <span className="text-slate-400">Quality</span><span className={scoreColor(result.execution.qualityScore)}>{result.execution.qualityScore}/100</span>
                      <span className="text-slate-400">Time</span><span className="text-slate-200">{result.execution.executionTimeMs}ms</span>
                    </div>
                    <p className="mt-2 break-all font-mono text-xs text-blue-300">{result.execution.proofHash}</p>
                  </div>
                )}
                {result.verification && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="mb-2 text-xs font-medium text-cyan-400">👁️ Eye — Verification</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-400">Passed</span>
                      <span className={result.verification.passed ? 'text-emerald-400' : 'text-red-400'}>{result.verification.passed ? 'Yes ✅' : 'No ❌'}</span>
                      <span className="text-slate-400">Quality</span><span className={scoreColor(result.verification.qualityScore)}>{result.verification.qualityScore}/100</span>
                    </div>
                  </div>
                )}
                {result.reputation && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                    <p className="mb-2 text-xs font-medium text-emerald-400">⚡ Nerve — Reputation</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-400">New Rep</span><span className="text-emerald-300">{result.reputation.newReputation}</span>
                      <span className="text-slate-400">Change</span>
                      <span className={result.reputation.reputationChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {result.reputation.reputationChange >= 0 ? '+' : ''}{result.reputation.reputationChange}
                      </span>
                      <span className="text-slate-400">Tier Changed</span><span className="text-slate-200">{result.reputation.tierChanged ? 'Yes 🎖️' : 'No'}</span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs text-slate-500">Audit Hash</p>
                  <p className="break-all font-mono text-xs text-amber-300">{result.auditHash}</p>
                  <p className="mt-1 text-xs text-slate-600">{new Date(result.completedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab: Execution History (Feature 1) */}
      {tab === 'history' && (
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Execution History</h2>
            <button onClick={loadHistory} disabled={historyLoading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">
              {historyLoading ? '…' : '↻ Refresh'}
            </button>
          </div>

          {!historyConfigured && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
              Supabase not configured — execution history requires a live database connection.
            </div>
          )}

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              {historyConfigured ? 'No executions yet — run an orchestration first' : 'No data available'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-500">
                    <th className="pb-2 pr-4">Job ID</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Quality</th>
                    <th className="pb-2 pr-4">Started</th>
                    <th className="pb-2">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((ex) => (
                    <tr key={ex.job_id} className="hover:bg-slate-800/30">
                      <td className="py-2 pr-4 font-mono text-slate-300">{ex.job_id.slice(0, 16)}…</td>
                      <td className="py-2 pr-4"><StatusBadge status={ex.status} /></td>
                      <td className={`py-2 pr-4 ${ex.quality_score ? scoreColor(ex.quality_score) : 'text-slate-500'}`}>
                        {ex.quality_score ? `${ex.quality_score}/100` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">{new Date(ex.started_at).toLocaleString()}</td>
                      <td className="py-2 font-mono text-slate-500">
                        {ex.proof_hash ? `${ex.proof_hash.slice(0, 12)}…` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab: Discover Jobs (Feature 2) */}
      {tab === 'discover' && (
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Mind Agent — Job Discovery</h2>
            {jobsDemo && (
              <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-400">Demo data</span>
            )}
            {!jobsDemo && (
              <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-400">Live data</span>
            )}
            <div className="ml-auto flex gap-2">
              <select value={discoverCategory} onChange={(e) => setDiscoverCategory(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white focus:outline-none">
                <option value="">All categories</option>
                {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={discoverJobs} disabled={jobsLoading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">
                {jobsLoading ? '🧠 Scanning…' : '🔍 Discover'}
              </button>
            </div>
          </div>

          {jobsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">Click Discover to scan for jobs</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-slate-600 transition-colors">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-200 leading-snug">{job.title}</p>
                    <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                      {PLATFORM_LABELS[job.platform] ?? job.platform}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-violet-400">{job.category}</span>
                    <span className={DIFFICULTY_COLORS[job.difficulty] ?? 'text-slate-400'}>{job.difficulty}</span>
                    <span className="ml-auto font-semibold text-emerald-400">
                      {job.reward.amount} {job.reward.currency}
                      <span className="ml-1 text-slate-500">(~${job.reward.usdEstimate})</span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {jobsDemo && (
            <p className="mt-4 text-xs text-slate-600">
              Set GITHUB_TOKEN env var to enable live job discovery from GitHub bounties
            </p>
          )}
        </section>
      )}

      <p className="mt-6 text-center text-xs text-slate-700">
        All orchestrations are dry-run only — no real SOL transfers from this dashboard
      </p>
    </div>
  );
}
