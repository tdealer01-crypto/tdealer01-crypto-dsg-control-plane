'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AgentInfo {
  status: string;
  role: string;
}

interface TrinityStatus {
  ok: boolean;
  system: string;
  version: string;
  agents: Record<string, AgentInfo>;
  governance: { policyVersion: string; constraintsEnforced: number };
  checkedAt: string;
}

interface ExecutionResult {
  ok: boolean;
  dry_run: boolean;
  planHash: string;
  governance: {
    approved: boolean;
    policyVersion: string;
    violations: string[];
    constraints: Array<{ name: string; satisfied: boolean }>;
  };
  execution?: {
    deliverableLength: number;
    qualityScore: number;
    proofHash: string;
    executionTimeMs: number;
  };
  verification?: { passed: boolean; qualityScore: number; issues: string[] };
  reputation?: { newReputation: number; reputationChange: number; tierChanged: boolean };
  auditHash: string;
  completedAt: string;
  error?: string;
}

const AGENT_COLORS: Record<string, string> = {
  Mind: 'text-violet-400',
  Hand: 'text-blue-400',
  Eye: 'text-cyan-400',
  Nerve: 'text-emerald-400',
  Spine: 'text-amber-400',
};

const AGENT_ICONS: Record<string, string> = {
  Mind: '🧠',
  Hand: '✋',
  Eye: '👁️',
  Nerve: '⚡',
  Spine: '🦴',
};

const JOB_CATEGORIES = [
  'smart-contract-audit',
  'frontend-dev',
  'backend-api',
  'documentation',
  'testing',
  'security-review',
  'data-analysis',
  'devops',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function AgentCard({ name, info }: { name: string; info: AgentInfo }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{AGENT_ICONS[name] ?? '🤖'}</span>
        <span className={`font-bold ${AGENT_COLORS[name] ?? 'text-white'}`}>{name}</span>
        <span className="ml-auto rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-400">
          {info.status}
        </span>
      </div>
      <p className="text-xs text-slate-400">{info.role}</p>
    </div>
  );
}

function GovernanceConstraints({
  constraints,
}: {
  constraints: Array<{ name: string; satisfied: boolean }>;
}) {
  return (
    <div className="space-y-1">
      {constraints.map((c) => (
        <div key={c.name} className="flex items-center gap-2 text-xs">
          <span className={c.satisfied ? 'text-emerald-400' : 'text-red-400'}>
            {c.satisfied ? '✅' : '❌'}
          </span>
          <span className={c.satisfied ? 'text-slate-300' : 'text-red-300'}>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TrinityDashboardPage() {
  const [systemStatus, setSystemStatus] = useState<TrinityStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [runError, setRunError] = useState('');

  // Form state
  const [jobTitle, setJobTitle] = useState('Smart Contract Security Audit');
  const [jobCategory, setJobCategory] = useState('smart-contract-audit');
  const [rewardAmount, setRewardAmount] = useState(2.0);
  const [agentReputation, setAgentReputation] = useState(80);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await fetch('/api/trinity/status');
      const data = await res.json();
      if (!data.ok) throw new Error('System status check failed');
      setSystemStatus(data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to load system status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function runOrchestration() {
    setRunning(true);
    setRunError('');
    setResult(null);

    try {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/trinity/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dry_run: true,
          job: {
            title: jobTitle,
            category: jobCategory,
            rewardAmount,
            rewardCurrency: 'SOL',
            deadline,
          },
          agent: {
            agentId: 'dashboard-test-agent',
            reputation: agentReputation,
            skills: [jobCategory, 'security-review', 'testing'],
          },
        }),
      });

      const data = await res.json();
      setResult(data);
      if (!data.ok && data.error) setRunError(data.error);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Orchestration failed');
    } finally {
      setRunning(false);
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔱</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Trinity AI System</h1>
            <p className="text-sm text-slate-400">Multi-Agent Orchestration • DSG Governance • Dry-Run Mode</p>
          </div>
          <button
            onClick={loadStatus}
            disabled={statusLoading}
            className="ml-auto rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            {statusLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Agent Status Grid */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Agent Registry
        </h2>
        {statusError && (
          <p className="mb-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">{statusError}</p>
        )}
        {statusLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : systemStatus ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries(systemStatus.agents).map(([name, info]) => (
                <AgentCard key={name} name={name} info={info} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span>System: <span className="text-slate-300">{systemStatus.system}</span></span>
              <span>Policy: <span className="text-slate-300">v{systemStatus.governance.policyVersion}</span></span>
              <span>Constraints: <span className="text-slate-300">{systemStatus.governance.constraintsEnforced}</span></span>
              <span className="ml-auto">
                Checked: {new Date(systemStatus.checkedAt).toLocaleTimeString()}
              </span>
            </div>
          </>
        ) : null}
      </section>

      {/* Orchestration Panel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Run Orchestration (Dry-Run)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Job Category</label>
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Reward (SOL)</label>
                <input
                  type="number"
                  min={0}
                  max={99999}
                  step={0.1}
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Agent Reputation</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={agentReputation}
                  onChange={(e) => setAgentReputation(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={runOrchestration}
              disabled={running}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Running…
                </span>
              ) : (
                '▶ Run Orchestration'
              )}
            </button>

            {runError && (
              <p className="rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">{runError}</p>
            )}
          </div>
        </section>

        {/* Result Panel */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Execution Result
          </h2>

          {!result && !running && (
            <div className="flex h-48 items-center justify-center text-slate-500 text-sm">
              Run an orchestration to see results
            </div>
          )}

          {running && (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <div className="mb-3 text-3xl animate-pulse">🔱</div>
                <p className="text-sm text-slate-400">
                  Spine → Hand → Eye → Nerve…
                </p>
              </div>
            </div>
          )}

          {result && !running && (
            <div className="space-y-4 text-sm">
              {/* Status banner */}
              <div
                className={`rounded-lg px-3 py-2 ${
                  result.ok
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : 'bg-red-900/30 text-red-300'
                }`}
              >
                {result.ok ? '✅ Orchestration complete (dry-run)' : `❌ ${result.error ?? 'Blocked'}`}
              </div>

              {/* Plan */}
              <div>
                <p className="mb-1 text-xs text-slate-500">Plan Hash (Spine)</p>
                <p className="font-mono text-xs text-violet-300 break-all">{result.planHash}</p>
              </div>

              {/* Governance */}
              <div>
                <p className="mb-2 text-xs text-slate-500">
                  Governance — Policy v{result.governance.policyVersion}
                </p>
                <GovernanceConstraints constraints={result.governance.constraints} />
              </div>

              {/* Execution (Hand) */}
              {result.execution && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs font-medium text-blue-400">✋ Hand — Execution</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-400">Deliverable</span>
                    <span className="text-slate-200">{result.execution.deliverableLength} bytes</span>
                    <span className="text-slate-400">Quality Score</span>
                    <span className={scoreColor(result.execution.qualityScore)}>
                      {result.execution.qualityScore}/100
                    </span>
                    <span className="text-slate-400">Exec Time</span>
                    <span className="text-slate-200">{result.execution.executionTimeMs}ms</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Proof:</p>
                  <p className="font-mono text-xs text-blue-300 break-all">{result.execution.proofHash}</p>
                </div>
              )}

              {/* Verification (Eye) */}
              {result.verification && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs font-medium text-cyan-400">👁️ Eye — Verification</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-400">Passed</span>
                    <span className={result.verification.passed ? 'text-emerald-400' : 'text-red-400'}>
                      {result.verification.passed ? 'Yes ✅' : 'No ❌'}
                    </span>
                    <span className="text-slate-400">Quality</span>
                    <span className={scoreColor(result.verification.qualityScore)}>
                      {result.verification.qualityScore}/100
                    </span>
                  </div>
                </div>
              )}

              {/* Reputation (Nerve) */}
              {result.reputation && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs font-medium text-emerald-400">⚡ Nerve — Reputation</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-400">New Reputation</span>
                    <span className="text-emerald-300">{result.reputation.newReputation}</span>
                    <span className="text-slate-400">Change</span>
                    <span className={result.reputation.reputationChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {result.reputation.reputationChange >= 0 ? '+' : ''}
                      {result.reputation.reputationChange}
                    </span>
                    <span className="text-slate-400">Tier Changed</span>
                    <span className="text-slate-200">{result.reputation.tierChanged ? 'Yes 🎖️' : 'No'}</span>
                  </div>
                </div>
              )}

              {/* Audit Hash */}
              <div>
                <p className="mb-1 text-xs text-slate-500">Audit Hash</p>
                <p className="font-mono text-xs text-amber-300 break-all">{result.auditHash}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {new Date(result.completedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-slate-600">
        All executions are dry-run only — no real SOL transfers are made from this dashboard
      </p>
    </div>
  );
}
