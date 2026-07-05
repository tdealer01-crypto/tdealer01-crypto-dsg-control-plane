'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { createWebSocketClient, type TrinityWebSocketClient } from '@/lib/websocket/client';

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
  settlement?: {
    status?: string;
    txSignature?: string;
    reason?: string;
  };
  trinity?: {
    bounty_program?: string;
    exploit_cid?: string | null;
    severity?: string;
    reward_amount?: number;
  };
}

interface ExecutionHistory {
  id: string;
  job_title: string;
  status: 'success' | 'failed' | 'pending';
  execution_time: number;
  created_at: string;
  plan_hash: string;
}

interface JobDiscovery {
  id: string;
  title: string;
  platform: string;
  category: string;
  difficulty: string;
  rewardSol: number;
  usdEstimate?: number;
  deadline: string;
  status: string;
  source: 'live' | 'demo';
}

// ...

function normalizeJob(raw: Record<string, unknown>): JobDiscovery {
  const reward = raw.reward;
  let rewardSol = 0;
  let usdEstimate: number | undefined;

  if (typeof reward === 'object' && reward !== null) {
    const obj = reward as Record<string, unknown>;
    rewardSol = Number(obj.amount ?? 0);
    usdEstimate = obj.usdEstimate !== undefined ? Number(obj.usdEstimate) : undefined;
  } else {
    rewardSol = Number(reward ?? 0);
  }

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    platform: String(raw.platform ?? ''),
    category: String(raw.category ?? ''),
    difficulty: String(raw.difficulty ?? ''),
    deadline: String(raw.deadline ?? ''),
    status: String(raw.status ?? ''),
    source: typeof raw.source === 'string' && (raw.source === 'live' || raw.source === 'demo') ? raw.source : 'live',
    rewardSol,
    usdEstimate,
  };
}

// Form validation
interface FormErrors {
  jobTitle?: string;
  rewardAmount?: string;
  agentReputation?: string;
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

function ExecutionHistoryTable({ history }: { history: ExecutionHistory[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-400">Job Title</th>
            <th className="text-left px-3 py-2 text-slate-400">Status</th>
            <th className="text-left px-3 py-2 text-slate-400">Exec Time (ms)</th>
            <th className="text-left px-3 py-2 text-slate-400">Created</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row) => (
            <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-900/30">
              <td className="px-3 py-2 text-slate-300">{row.job_title}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded px-2 py-1 ${
                    row.status === 'success'
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : row.status === 'failed'
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-400">{row.execution_time}</td>
              <td className="px-3 py-2 text-slate-500">
                {new Date(row.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobDiscoveryPanel({ jobs }: { jobs: JobDiscovery[] }) {
  const difficultyColor = (difficulty: string) => {
    if (difficulty === 'hard') return 'bg-red-900/30 text-red-400';
    if (difficulty === 'medium') return 'bg-yellow-900/30 text-yellow-400';
    return 'bg-emerald-900/30 text-emerald-400';
  };

  return (
    <div className="space-y-2">
      {jobs.length === 0 ? (
        <p className="text-sm text-slate-400">No jobs discovered yet</p>
      ) : (
        jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 hover:border-slate-600 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <span className="text-xs rounded px-2 py-0.5 bg-slate-700 text-slate-300">{job.platform}</span>
                  <span className={`text-xs rounded px-2 py-0.5 ${difficultyColor(job.difficulty)}`}>
                    {job.difficulty}
                  </span>
                  {job.source === 'demo' && (
                    <span className="text-xs rounded px-2 py-0.5 bg-blue-900/30 text-blue-400">demo</span>
                  )}
                </div>
                <p className="font-medium text-slate-300">{job.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {job.category} • {job.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-amber-400">{job.rewardSol} SOL</p>
                {job.usdEstimate && (
                  <p className="text-xs text-slate-500">${job.usdEstimate.toFixed(0)}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2">Due: {new Date(job.deadline).toLocaleDateString()}</p>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TrinityDashboardPage() {
  const { toast } = useToast();

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
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // WebSocket client state
  const wsClientRef = useRef<TrinityWebSocketClient | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // History and job discovery
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [discoveredJobs, setDiscoveredJobs] = useState<JobDiscovery[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }

    if (rewardAmount <= 0 || isNaN(rewardAmount)) {
      errors.rewardAmount = 'Reward must be greater than 0';
    }

    if (agentReputation < 0 || agentReputation > 100) {
      errors.agentReputation = 'Reputation must be between 0-100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Setup Production WebSocket with automatic reconnection and SSE fallback
  useEffect(() => {
    let isMounted = true;

    const setupWebSocket = async () => {
      try {
        // Get WebSocket URL from environment or construct it
        const wsUrl =
          process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
          (() => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}`;
          })();

        console.log('[Trinity] Connecting to WebSocket:', wsUrl);

        // Create WebSocket client with automatic reconnection and SSE fallback
        const client = createWebSocketClient(wsUrl);

        // Listen for connection status changes
        const unsubscribeStatus = client.onStatusChange((status) => {
          if (isMounted) {
            setWsStatus(status);
            setWsConnected(status === 'connected');

            if (status === 'connected') {
              toast.success('Connected to Trinity real-time updates');
              // Subscribe to orchestra orchestration updates
              subscribeToChannels(client);
            } else if (status === 'disconnected') {
              toast.warning('Trinity real-time connection lost');
            }
          }
        });

        // Connect to WebSocket server
        await client.connect().catch((err) => {
          console.warn('[Trinity] WebSocket connection failed, will retry:', err.message);
          // Client will retry automatically and fallback to SSE if needed
        });

        if (isMounted) {
          wsClientRef.current = client;
        }

        return () => {
          unsubscribeStatus();
          client.disconnect();
        };
      } catch (err) {
        console.error('[Trinity] Failed to setup WebSocket:', err);
        if (isMounted) {
          setWsConnected(false);
        }
      }
    };

    const subscribeToChannels = (client: TrinityWebSocketClient) => {
      // Subscribe to orchestration updates
      client.subscribe('trinity:orchestration', (msg) => {
        if (msg.payload?.status) {
          setResult((prev) => ({
            ...prev,
            ...msg.payload,
          }));
        }
      });

      // Subscribe to execution results
      client.subscribe('trinity:executions', (msg) => {
        if (msg.payload?.executionId) {
          setResult((prev) => ({
            ...prev,
            ...msg.payload,
          }));
        }
      });

      // Subscribe to job discovery updates
      client.subscribe('trinity:jobs', (msg) => {
        if (msg.payload?.jobs) {
          setDiscoveredJobs(msg.payload.jobs);
        }
      });
    };

    const cleanup = setupWebSocket();

    return () => {
      isMounted = false;
      cleanup?.then((fn) => fn?.());
    };
  }, [toast]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await fetch('/api/trinity/status');
      const data = await res.json();
      if (!data.ok) throw new Error('System status check failed');
      setSystemStatus(data);
      toast.success('System status updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load system status';
      setStatusError(message);
      toast.error(message);
    } finally {
      setStatusLoading(false);
    }
  }, [toast]);

  const loadExecutionHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/trinity/history?agentId=dashboard-test-agent&limit=20', {
        headers: {
          'x-trinity-org-id': 'default-org',
          'x-trinity-actor-id': 'dashboard-test-agent',
          'x-trinity-role': 'OWNER',
        },
      });
      const data = await res.json();
      if (data.ok) {
        setExecutionHistory(data.executions || data.history || []);
        // Sync reputation from DB profile if available
        if (data.profile?.reputation !== undefined) {
          setAgentReputation(data.profile.reputation);
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDiscoveredJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/trinity/discover?limit=10', {
        headers: {
          'x-trinity-org-id': 'default-org',
          'x-trinity-actor-id': 'dashboard-test-agent',
          'x-trinity-role': 'OWNER',
        },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.jobs)) {
        const mapped: JobDiscovery[] = data.jobs.map((j: Record<string, unknown>) => normalizeJob(j));
        setDiscoveredJobs(mapped);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      setStatusLoading(true);
      setHistoryLoading(true);
      setJobsLoading(true);

      try {
        const [statusRes, historyRes, jobsRes] = await Promise.all([
          fetch('/api/trinity/status'),
          fetch('/api/trinity/history?agentId=dashboard-test-agent&limit=20', {
            headers: {
              'x-trinity-org-id': 'default-org',
              'x-trinity-actor-id': 'dashboard-test-agent',
            },
          }),
          fetch('/api/trinity/jobs?org_id=default-org'),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          setSystemStatus(data);
        }

        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.ok && data.executions) {
            setExecutionHistory(data.executions);
          }
        }

        if (jobsRes.ok) {
          const data = await jobsRes.json();
          if (data.ok && Array.isArray(data.jobs)) {
            const mapped = data.jobs.map((j: Record<string, unknown>) => normalizeJob(j));
            setDiscoveredJobs(mapped);
          }
        }
      } finally {
        setStatusLoading(false);
        setHistoryLoading(false);
        setJobsLoading(false);
      }
    };

    initializeData();
  }, []);

  async function runOrchestration() {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    setRunning(true);
    setRunError('');
    setResult(null);

    try {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/trinity/orchestrate', {
        method: 'POST',
        body: JSON.stringify({
          dry_run: false,
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
        headers: {
          'Content-Type': 'application/json',
          'x-trinity-org-id': 'default-org',
          'x-trinity-actor-id': 'dashboard-test-agent',
          'x-trinity-role': 'OWNER',
        },
      });

      const data = await res.json();
      setResult(data);

      if (data.ok) {
        toast.success('✨ Orchestration completed successfully');
        loadExecutionHistory();
      } else {
        const errorMsg = data.error || 'Orchestration blocked';
        setRunError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Orchestration failed';
      setRunError(message);
      toast.error(message);
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
            <p className="text-sm text-slate-400">
              Multi-Agent Orchestration • DSG Governance • End-to-End Workflow
              {wsConnected && <span className="ml-2 text-xs text-emerald-400">● Real-time Connected</span>}
            </p>
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Agent Registry</h2>
        {statusError && (
          <p className="mb-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">{statusError}</p>
        )}
        {statusLoading || !systemStatus ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 min-h-32">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/50 border border-slate-700" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries(systemStatus.agents).map(([name, info]) => (
                <AgentCard key={name} name={name} info={info} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                System: <span className="text-slate-300">{systemStatus.system}</span>
              </span>
              <span>
                Policy: <span className="text-slate-300">v{systemStatus.governance.policyVersion}</span>
              </span>
              <span>
                Constraints: <span className="text-slate-300">{systemStatus.governance.constraintsEnforced}</span>
              </span>
              <span className="ml-auto">Checked: {new Date(systemStatus.checkedAt).toLocaleTimeString()}</span>
            </div>
          </>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Run Orchestration (Production Path)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => {
                  setJobTitle(e.target.value);
                  if (formErrors.jobTitle) setFormErrors({ ...formErrors, jobTitle: undefined });
                }}
                className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none ${
                  formErrors.jobTitle
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-600 focus:border-violet-500'
                }`}
                placeholder="e.g., Smart Contract Audit"
              />
              {formErrors.jobTitle && <p className="mt-1 text-xs text-red-400">{formErrors.jobTitle}</p>}
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
                  onChange={(e) => {
                    setRewardAmount(Number(e.target.value));
                    if (formErrors.rewardAmount) setFormErrors({ ...formErrors, rewardAmount: undefined });
                  }}
                  className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none ${
                    formErrors.rewardAmount
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-600 focus:border-violet-500'
                  }`}
                />
                {formErrors.rewardAmount && <p className="mt-1 text-xs text-red-400">{formErrors.rewardAmount}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Agent Reputation</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={agentReputation}
                  onChange={(e) => {
                    setAgentReputation(Number(e.target.value));
                    if (formErrors.agentReputation) setFormErrors({ ...formErrors, agentReputation: undefined });
                  }}
                  className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none ${
                    formErrors.agentReputation
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-600 focus:border-violet-500'
                  }`}
                />
                {formErrors.agentReputation && <p className="mt-1 text-xs text-red-400">{formErrors.agentReputation}</p>}
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
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-400">Execution Result</h2>

          {!result && !running && (
            <div className="flex h-48 items-center justify-center text-slate-500 text-sm">
              Run an orchestration to see results
            </div>
          )}

          {running && (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <div className="mb-3 text-3xl animate-pulse">🔱</div>
                <p className="text-sm text-slate-400">Spine → Hand → Eye → Nerve…</p>
              </div>
            </div>
          )}

          {result && !running && (
            <div className="space-y-4 text-sm">
              <div
                className={`rounded-lg px-3 py-2 ${
                  result.ok
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : 'bg-red-900/30 text-red-300'
                }`}
              >
                {result.ok ? '✅ Orchestration complete (live workflow)' : `❌ ${result.error ?? 'Blocked'}`}
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-500">Plan Hash (Spine)</p>
                <p className="font-mono text-xs text-violet-300 break-all">{result.planHash}</p>
              </div>

              <div>
                <p className="mb-2 text-xs text-slate-500">Governance — Policy v{result.governance.policyVersion}</p>
                <GovernanceConstraints constraints={result.governance.constraints} />
              </div>

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
                </div>
              )}

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
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs text-slate-500">Audit Hash</p>
                <p className="font-mono text-xs text-amber-300 break-all">{result.auditHash}</p>
              </div>

              {result.settlement && (
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs font-medium text-emerald-400">💸 Settlement</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-400">Status</span>
                    <span className="text-slate-200">{result.settlement.status ?? 'unknown'}</span>
                    <span className="text-slate-400">Tx Signature</span>
                    <span className="break-all text-slate-200">{result.settlement.txSignature ?? 'pending'}</span>
                    <span className="text-slate-400">Reason</span>
                    <span className="text-slate-200">{result.settlement.reason ?? '-'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Execution History */}
      <section className="mt-8 rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Execution History</h2>
          <button
            onClick={loadExecutionHistory}
            disabled={historyLoading}
            className="text-xs text-slate-400 hover:text-slate-300 disabled:opacity-50"
          >
            {historyLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
        {executionHistory.length > 0 ? (
          <ExecutionHistoryTable history={executionHistory} />
        ) : (
          <p className="text-sm text-slate-500">No executions yet</p>
        )}
      </section>

      {/* Job Discovery */}
      <section className="mt-8 rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          💼 Discovered Jobs (Mind Agent)
        </h2>
        <JobDiscoveryPanel jobs={discoveredJobs} />
      </section>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-slate-600">
        Live settlement requires configured wallet/RPC and TRINITY_ENABLE_LIVE_SOL_TRANSFER=true
      </p>
    </div>
  );
}
