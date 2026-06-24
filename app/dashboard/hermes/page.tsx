'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type Agent = {
  id: string;
  name: string;
  status: string;
  model: string;
};

type Execution = {
  id: string;
  decision: string;
  reason: string;
  created_at: string;
};

type HealthStatus = {
  ok: boolean;
  core_ok: boolean;
  db_ok: boolean;
  version: string;
};

export default function HermesDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'executions' | 'governance'>('overview');

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u as any);

      const [agentsRes, execsRes, healthRes] = await Promise.all([
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/executions?limit=10').then(r => r.json()),
        fetch('/api/health').then(r => r.json()),
      ]);

      setAgents((agentsRes.data || agentsRes.items || []).slice(0, 10));
      setExecutions((execsRes.data || execsRes.items || []).slice(0, 10));
      setHealth(healthRes);
    } catch (err) {
      console.error('[hermes] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">DSG Command Center</h1>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusDot ok={health?.ok ?? false} label={health?.ok ? 'System Healthy' : 'Issues Detected'} />
            <button
              onClick={fetchData}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/5 px-6">
        <div className="mx-auto flex max-w-7xl gap-1">
          {(['overview', 'agents', 'executions', 'governance'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-emerald-400 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab health={health} agents={agents} executions={executions} onRefresh={fetchData} />
        )}
        {activeTab === 'agents' && <AgentsTab agents={agents} />}
        {activeTab === 'executions' && <ExecutionsTab executions={executions} />}
        {activeTab === 'governance' && <GovernanceTab />}
      </main>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function OverviewTab({ health, agents, executions, onRefresh }: {
  health: HealthStatus | null;
  agents: Agent[];
  executions: Execution[];
  onRefresh: () => void;
}) {
  const stats = [
    { label: 'Agents', value: agents.length, color: 'text-emerald-400' },
    { label: 'Executions', value: executions.length, color: 'text-amber-400' },
    { label: 'Core Status', value: health?.core_ok ? 'Active' : 'Degraded', color: health?.core_ok ? 'text-emerald-400' : 'text-red-400' },
    { label: 'DB Status', value: health?.db_ok ? 'Connected' : 'Disconnected', color: health?.db_ok ? 'text-emerald-400' : 'text-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
            <p className={`mt-2 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold">Recent Executions</h2>
        {executions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No executions yet. Trigger your first action to see results here.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {executions.slice(0, 5).map(exec => (
              <div key={exec.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-2">
                <div className="flex items-center gap-3">
                  <DecisionBadge decision={exec.decision} />
                  <span className="text-sm text-slate-300">{exec.reason || 'No reason'}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(exec.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction label="View Agents" href="/dashboard/agents" icon="🤖" />
          <QuickAction label="View Audit" href="/dashboard/audit" icon="📋" />
          <QuickAction label="Governance" href="/dashboard/governance" icon="🏛" />
          <QuickAction label="API Keys" href="/dashboard/api-keys" icon="🔑" />
        </div>
      </div>
    </div>
  );
}

function AgentsTab({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <p className="text-4xl">🤖</p>
        <p className="mt-4 text-lg font-semibold">No agents configured</p>
        <p className="mt-2 text-sm text-slate-400">Create your first agent to start governing AI actions.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {agents.map(agent => (
        <div key={agent.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div>
            <p className="font-medium">{agent.name}</p>
            <p className="text-xs text-slate-400">{agent.model || 'default model'}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            agent.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'
          }`}>
            {agent.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExecutionsTab({ executions }: { executions: Execution[] }) {
  if (executions.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <p className="text-4xl">📊</p>
        <p className="mt-4 text-lg font-semibold">No executions recorded</p>
        <p className="mt-2 text-sm text-slate-400">Execution history will appear here as actions are processed.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {executions.map(exec => (
        <div key={exec.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DecisionBadge decision={exec.decision} />
              <span className="text-xs text-slate-500">{exec.id}</span>
            </div>
            <span className="text-xs text-slate-500">{new Date(exec.created_at).toLocaleString()}</span>
          </div>
          {exec.reason && <p className="mt-2 text-sm text-slate-400">{exec.reason}</p>}
        </div>
      ))}
    </div>
  );
}

function GovernanceTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="font-semibold">Compliance Status</h3>
        <div className="mt-4 space-y-3">
          <ComplianceItem label="Audit Trail" status="active" />
          <ComplianceItem label="Human Oversight" status="active" />
          <ComplianceItem label="Evidence Chain" status="active" />
          <ComplianceItem label="Incident Response" status="active" />
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="font-semibold">Quick Links</h3>
        <div className="mt-4 space-y-2">
          <QuickAction label="Evidence Pack" href="/api/compliance-evidence-pack" icon="📦" />
          <QuickAction label="Audit Export" href="/api/audit/export" icon="📤" />
          <QuickAction label="Incident Log" href="/dashboard/governance/incidents" icon="🚨" />
          <QuickAction label="10Q Report" href="/dashboard/governance" icon="📊" />
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    ALLOW: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    BLOCK: 'border-red-400/30 bg-red-500/10 text-red-200',
    STABILIZE: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    REVIEW: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  };
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${colors[decision] || 'border-white/10 bg-white/5 text-slate-300'}`}>
      {decision}
    </span>
  );
}

function ComplianceItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs ${status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        {status}
      </span>
    </div>
  );
}

function QuickAction({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </a>
  );
}
