"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Agent = {
  agent_id: string;
  name: string;
  policy_id: string;
  status: 'active' | 'disabled' | string;
  monthly_limit: number;
  usage_this_month: number;
  api_key_preview?: string;
};

type AgentsResponse = {
  items: Agent[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  error?: string;
};

type CreatedAgent = {
  agent_id: string;
  name: string;
  policy_id: string;
  status: string;
  monthly_limit: number;
  api_key: string;
  api_key_preview: string;
};

const PER_PAGE = 10;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [policyId, setPolicyId] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedAgent | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMonthlyLimit, setEditMonthlyLimit] = useState(10000);
  const [editPolicyId, setEditPolicyId] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');

  const loadAgents = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/agents?page=${targetPage}&per_page=${PER_PAGE}`);
      const json = (await res.json()) as AgentsResponse;
      if (!res.ok) throw new Error(json?.error || 'Failed to load agents');
      setAgents(json.items || []);
      setTotalPages(Math.max(Number(json.pagination?.total_pages || 1), 1));
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents(1);
  }, [loadAgents]);

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    try {
      setCreating(true);
      setError('');
      setCreated(null);
      const payload: Record<string, unknown> = { name, monthly_limit: monthlyLimit };
      if (policyId.trim()) payload.policy_id = policyId.trim();

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create agent');

      setCreated(json as CreatedAgent);
      setName('');
      setPolicyId('');
      setMonthlyLimit(10000);
      await loadAgents(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(agent: Agent) {
    setEditingId(agent.agent_id);
    setEditName(agent.name);
    setEditMonthlyLimit(agent.monthly_limit);
    setEditPolicyId(agent.policy_id || '');
    setEditStatus(agent.status === 'disabled' ? 'disabled' : 'active');
  }

  async function saveEdit(agentId: string) {
    try {
      setError('');
      const payload: Record<string, unknown> = {
        name: editName,
        monthly_limit: editMonthlyLimit,
        status: editStatus,
      };
      if (editPolicyId.trim()) payload.policy_id = editPolicyId.trim();

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update agent');
      setEditingId(null);
      await loadAgents(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
    }
  }

  async function disableAgent(agentId: string) {
    if (!confirm('Disable this agent? It will no longer accept API calls.')) return;

    try {
      setError('');
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to disable agent');
      await loadAgents(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable agent');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">Agents</p>
          <h1 className="text-4xl font-bold">Agent Management</h1>
          <p className="mt-2 text-slate-300">Create, manage, and disable production agents.</p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Create agent</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createAgent}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500" required />
            <input value={monthlyLimit} onChange={(e) => setMonthlyLimit(Number(e.target.value || 0))} type="number" min={1} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
            <input value={policyId} onChange={(e) => setPolicyId(e.target.value)} placeholder="Policy ID (optional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
            <button disabled={creating} className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black">{creating ? 'Creating...' : 'Create Agent'}</button>
          </form>
          {created ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
              <p className="font-semibold">One-time API key (copy now)</p>
              <code className="mt-2 block break-all text-emerald-100">{created.api_key}</code>
            </div>
          ) : null}
        </section>

        {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">{error}</p> : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Agents list</h2>
            <button onClick={() => void loadAgents(page)} className="rounded-lg border border-slate-600 px-3 py-1 text-sm">Refresh</button>
          </div>

          {loading ? <p className="text-slate-300">Loading agents...</p> : null}

          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.agent_id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                {editingId === agent.agent_id ? (
                  <div className="grid gap-3 md:grid-cols-5">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
                    <input type="number" min={1} value={editMonthlyLimit} onChange={(e) => setEditMonthlyLimit(Number(e.target.value || 0))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500" />
                    <input value={editPolicyId} onChange={(e) => setEditPolicyId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500" placeholder="Policy ID" />
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'active' | 'disabled')} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => void saveEdit(agent.agent_id)} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black">Save</button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-slate-300">ID: {agent.agent_id}</p>
                      <p className="text-sm text-slate-300">Policy: {agent.policy_id || 'auto'}</p>
                      <p className="text-sm text-slate-300">Status: {agent.status}</p>
                    </div>
                    <div className="text-sm text-slate-300">
                      <p>Monthly limit: {agent.monthly_limit}</p>
                      <p>Usage this month: {agent.usage_this_month || 0}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => startEdit(agent)} className="rounded-lg border border-slate-600 px-3 py-1">Edit</button>
                        <button onClick={() => void disableAgent(agent.agent_id)} className="rounded-lg border border-red-500/60 px-3 py-1 text-red-300">Disable</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading && agents.length === 0 ? <p className="text-slate-400">No agents found.</p> : null}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => void loadAgents(page - 1)} className="rounded-lg border border-slate-600 px-3 py-1 disabled:opacity-40">Previous</button>
            <p className="text-sm text-slate-300">Page {page} / {totalPages}</p>
            <button disabled={page >= totalPages} onClick={() => void loadAgents(page + 1)} className="rounded-lg border border-slate-600 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </section>
      </div>
    </main>
  );
}
