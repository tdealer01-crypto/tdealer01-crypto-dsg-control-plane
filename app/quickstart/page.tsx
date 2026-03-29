'use client';

import Link from 'next/link';
import { useState } from 'react';

type AgentResponse = {
  agent_id: string;
  name: string;
  policy_id: string;
  status: string;
  monthly_limit: number;
  api_key: string | null;
  api_key_preview: string | null;
  created: boolean;
};

type ExecuteResponse = {
  decision: string;
  reason: string;
  latency_ms: number;
  audit_id: string | null;
  request_id: string;
};

export default function QuickstartPage() {
  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [agentError, setAgentError] = useState('');
  const [execute, setExecute] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  async function createStarterAgent() {
    try {
      setIsCreatingAgent(true);
      setAgentError('');

      const response = await fetch('/api/quickstart/agent', { method: 'POST' });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to create starter agent');
      }

      setAgent(json as AgentResponse);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Failed to create starter agent');
    } finally {
      setIsCreatingAgent(false);
    }
  }

  async function runSampleExecution() {
    try {
      setIsExecuting(true);
      setExecuteError('');

      const response = await fetch('/api/quickstart/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: agent?.api_key || '' }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to run sample execution');
      }

      setExecute(json as ExecuteResponse);
    } catch (error) {
      setExecuteError(error instanceof Error ? error.message : 'Failed to run sample execution');
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Workspace ready</p>
          <h1 className="mt-4 text-4xl font-bold">Your DSG workspace is ready</h1>
          <p className="mt-4 text-slate-300">Complete quickstart to create your first agent, run a real execution, and inspect live telemetry.</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-lg font-semibold">Trial quota / plan</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Plan: Trial</li>
              <li>• Duration: 14 days</li>
              <li>• Included executions: 1,000</li>
            </ul>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
            <p className="text-lg font-semibold">Open live monitor</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard/mission" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Open Mission</Link>
              <Link href="/app-shell" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Open App Shell</Link>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-lg font-semibold">Create first agent</p>
          <button
            onClick={() => void createStarterAgent()}
            disabled={isCreatingAgent}
            className="mt-4 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
          >
            {isCreatingAgent ? 'Creating...' : 'Create Starter Agent'}
          </button>

          {agentError ? <p className="mt-3 text-sm text-red-300">{agentError}</p> : null}

          {agent ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p>Agent: {agent.name}</p>
              <p>Policy: {agent.policy_id}</p>
              <p>Status: {agent.status}</p>
              <p>Monthly limit: {agent.monthly_limit}</p>
              <p>API key preview: {agent.api_key_preview || 'not available'}</p>
              <p className="mt-2 text-emerald-200">{agent.created ? 'New starter agent created.' : 'Starter agent already existed.'}</p>
              {agent.api_key ? (
                <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100">
                  <p className="font-semibold">Copy API Key</p>
                  <code className="mt-1 block break-all text-xs">{agent.api_key}</code>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-lg font-semibold">Run first execution</p>
          <button
            onClick={() => void runSampleExecution()}
            disabled={isExecuting || !agent?.api_key}
            className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold"
          >
            {isExecuting ? 'Running...' : 'Run Sample Execute'}
          </button>


          {!agent?.api_key ? (
            <p className="mt-3 text-sm text-amber-200">Create a new starter agent first to get the one-time API key needed for sample execution.</p>
          ) : null}

          {executeError ? <p className="mt-3 text-sm text-red-300">{executeError}</p> : null}

          {execute ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p>Decision: {execute.decision}</p>
              <p>Reason: {execute.reason}</p>
              <p>Latency: {execute.latency_ms} ms</p>
              <p>Execution ID: {execute.request_id}</p>
              <p>Audit ID: {execute.audit_id || 'n/a'}</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
