'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type OnboardingState = {
  bootstrap_status: 'pending' | 'completed' | 'failed';
  checklist?: { steps?: string[]; next_action?: string };
};

const FALLBACK_STEPS = [
  'Create or inspect your first agent',
  'Review a starter policy',
  'Run your first controlled execution',
  'Inspect evidence or audit output',
  'Review quota and billing basics',
];

type ExecuteResponse = {
  decision: string;
  reason: string;
  latency_ms: number;
  audit_id: string | null;
  request_id: string;
};

type IntegrationPack = {
  env: {
    DSG_BASE_URL: string;
    DSG_AGENT_ID: string;
    DSG_API_KEY: string;
  };
  smoke_test: {
    health_check: string;
    execute: string;
  };
  sdk: {
    language: string;
    function_name: string;
    snippet: string;
  };
  next_step: string;
};

export default function QuickstartPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentResponse | null>(null);
  const [agentError, setAgentError] = useState('');
  const [execute, setExecute] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [isAutoSetupRunning, setIsAutoSetupRunning] = useState(false);
  const [autoSetupSteps, setAutoSetupSteps] = useState<string[]>([]);
  const [autoSetupExecutionId, setAutoSetupExecutionId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [isEmptyOrg, setIsEmptyOrg] = useState(false);
  const [integrationPack, setIntegrationPack] = useState<IntegrationPack | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/quickstart/onboarding');
      if (!response.ok) return;
      const json = await response.json();
      setOnboarding(json.onboarding);
      setIsEmptyOrg(Boolean(json.is_empty));
    })();
  }, []);

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

  async function runOneClickSetup() {
    try {
      setIsAutoSetupRunning(true);
      setAgentError('');
      setExecuteError('');
      setAutoSetupSteps([]);
      setAutoSetupExecutionId(null);

      const setupResponse = await fetch('/api/setup/auto', { method: 'POST', cache: 'no-store' });
      const setupJson = await setupResponse.json();
      if (!setupResponse.ok) {
        throw new Error(String(setupJson?.error || 'Auto setup failed'));
      }

      setAutoSetupSteps(Array.isArray(setupJson?.steps) ? setupJson.steps : []);
      setAutoSetupExecutionId(typeof setupJson?.execution_id === 'string' ? setupJson.execution_id : null);

      if (typeof setupJson?.api_key === 'string' && setupJson.api_key.length > 0) {
        setAgent({
          agent_id: typeof setupJson.agent_id === 'string' ? setupJson.agent_id : 'auto-setup-agent',
          name: 'Auto-Setup Agent',
          policy_id: 'policy_default',
          status: 'active',
          monthly_limit: 10000,
          api_key: setupJson.api_key,
          api_key_preview: `${setupJson.api_key.slice(0, 12)}...`,
          created: true,
        });
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Auto setup failed');
    } finally {
      setIsAutoSetupRunning(false);
    }
  }

  async function copyApiKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('Copied API key');
      setTimeout(() => setCopyStatus(''), 1800);
    } catch {
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 1800);
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
        const rawError = String(json?.error || 'Failed to run sample execution');
        const message = rawError === 'Internal server error'
          ? 'Internal server error: quickstart backend setup is incomplete. Check runtime migrations/logs.'
          : rawError;
        throw new Error(message);
      }

      setExecute(json as ExecuteResponse);
    } catch (error) {
      setExecuteError(error instanceof Error ? error.message : 'Failed to run sample execution');
    } finally {
      setIsExecuting(false);
    }
  }

  async function generateIntegrationPack() {
    try {
      setIsGeneratingPack(true);
      setAgentError('');

      const response = await fetch('/api/quickstart/integration-pack', { method: 'POST' });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(String(json?.error || 'Failed to generate integration pack'));
      }

      const pack = json as IntegrationPack;
      setIntegrationPack(pack);
      setAgent({
        agent_id: pack.env.DSG_AGENT_ID,
        name: 'Starter Agent',
        policy_id: agent?.policy_id || 'policy_default',
        status: 'active',
        monthly_limit: agent?.monthly_limit || 1000,
        api_key: pack.env.DSG_API_KEY,
        api_key_preview: `${pack.env.DSG_API_KEY.slice(0, 12)}...`,
        created: true,
      });
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Failed to generate integration pack');
    } finally {
      setIsGeneratingPack(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Workspace ready</p>
          <h1 className="mt-4 text-4xl font-bold">Your DSG workspace is ready</h1>
          <p className="mt-4 text-slate-300">
            Complete quickstart to create your first agent, run a sample execution through the stable execution entry,
            and inspect authenticated operator surfaces.
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-lg font-semibold">Starter checklist</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {(onboarding?.checklist?.steps || FALLBACK_STEPS).map((step) => (
              <li key={step}>• {step}</li>
            ))}
          </ul>
          {isEmptyOrg && onboarding?.bootstrap_status !== 'completed' ? (
            <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              Set up starter workspace
            </p>
          ) : null}
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
            <p className="text-lg font-semibold">Open operator surfaces</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard/mission" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Open Mission</Link>
              <Link href="/app-shell" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Open App Shell</Link>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-lg font-semibold">One-click setup</p>
          <p className="mt-2 text-sm text-slate-300">
            Run full setup (policy + agent + verification execution + onboarding + billing) and continue to dashboard automatically.
          </p>
          <button
            onClick={() => void runOneClickSetup()}
            disabled={isAutoSetupRunning}
            className="mt-4 rounded-xl bg-emerald-300 px-4 py-3 font-semibold text-slate-950"
          >
            {isAutoSetupRunning ? 'Starting...' : 'Start One-Click Setup'}
          </button>
          {autoSetupExecutionId ? (
            <p className="mt-3 text-sm text-emerald-200">Setup complete. Execution: {autoSetupExecutionId}. Redirecting to dashboard...</p>
          ) : null}
          {autoSetupSteps.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-300">
              {autoSetupSteps.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          ) : null}
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
                  <button
                    onClick={() => void copyApiKey(agent.api_key)}
                    className="mt-3 rounded-lg border border-emerald-200/40 px-3 py-2 text-xs font-semibold text-emerald-100"
                  >
                    Copy to clipboard
                  </button>
                  {copyStatus ? <p className="mt-2 text-xs">{copyStatus}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-lg font-semibold">Run sample execution</p>
          <button
            onClick={() => void runSampleExecution()}
            disabled={isExecuting || !agent?.api_key}
            className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold"
          >
            {isExecuting ? 'Running...' : 'Run Sample Execution'}
          </button>

          {!agent?.api_key ? (
            <p className="mt-3 text-sm text-amber-200">
              Create a new starter agent first to get the one-time API key needed for sample execution.
            </p>
          ) : null}

          <p className="mt-3 text-sm text-slate-400">
            Quickstart uses the stable execution entry and keeps deeper usage, policy, and capacity checks inside authenticated operator surfaces.
          </p>

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

        <section className="rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/10 p-6">
          <p className="text-lg font-semibold">Auto integration pack (recommended)</p>
          <p className="mt-2 text-sm text-slate-200">
            Generate backend-ready environment variables, smoke test commands, and a TypeScript helper with one click.
          </p>
          <button
            onClick={() => void generateIntegrationPack()}
            disabled={isGeneratingPack}
            className="mt-4 rounded-xl bg-emerald-300 px-4 py-3 font-semibold text-slate-950"
          >
            {isGeneratingPack ? 'Generating...' : 'Generate Pack'}
          </button>
          {integrationPack ? (
            <div className="mt-4 space-y-4 text-xs text-emerald-50">
              <div className="rounded-xl border border-emerald-200/30 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold">.env for your backend</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">
{`DSG_BASE_URL=${integrationPack.env.DSG_BASE_URL}
DSG_AGENT_ID=${integrationPack.env.DSG_AGENT_ID}
DSG_API_KEY=${integrationPack.env.DSG_API_KEY}`}
                </pre>
              </div>
              <div className="rounded-xl border border-emerald-200/30 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold">Smoke test commands</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">{integrationPack.smoke_test.health_check}</pre>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap">{integrationPack.smoke_test.execute}</pre>
              </div>
              <div className="rounded-xl border border-emerald-200/30 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold">TypeScript helper ({integrationPack.sdk.function_name})</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">{integrationPack.sdk.snippet}</pre>
              </div>
              <p className="text-sm text-emerald-100">{integrationPack.next_step}</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
