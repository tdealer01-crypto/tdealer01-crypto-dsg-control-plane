import type { AgentContext } from './context';

export type AgentTool = {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, { type: string; required: boolean; description: string }>;
  riskLevel: 'read' | 'write' | 'critical';
  requiredRole: string;
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
};

async function callJson(
  context: AgentContext,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${context.origin}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: context.authHeader,
      cookie: context.cookieHeader,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (path === '/api/readiness' && response.status >= 500) {
      return {
        ready: false,
        status: 'deployment_error',
        warning: 'Readiness returned 500. Please inspect the deployment and Vercel logs before executing agents.',
        error: String(json.error || 'readiness failed'),
      };
    }
    throw new Error(String(json.error || `Tool call failed (${path})`));
  }

  return json;
}

function requiredAgentId(params: Record<string, unknown>) {
  const agentId = String(params.agent_id || '').trim();
  if (!agentId) {
    throw new Error('agent_id is required and cannot be empty');
  }
  return agentId;
}

function omitEmptyPolicy<T extends Record<string, unknown>>(payload: T) {
  if (payload.policy_id === '' || payload.policy_id === 'default' || payload.policy_id === undefined) {
    delete payload.policy_id;
  }
  return payload;
}

export const DSG_TOOLS: AgentTool[] = [
  {
    id: 'readiness',
    name: 'Check System Readiness',
    description: 'Fetch deployment readiness from /api/readiness with a safe warning fallback on server errors.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/readiness', { method: 'GET' }),
  },
  {
    id: 'execute_action',
    name: 'Execute Agent Action',
    description: 'Create intent and execute through DSG gate with full audit.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      action: { type: 'string', required: true, description: 'Action name' },
      payload: { type: 'object', required: false, description: 'Action payload' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: requiredAgentId(params),
          action: params.action,
          payload: params.payload || {},
          tool_name: 'agent-chat',
        }),
      }),
  },
  {
    id: 'browser_navigate',
    name: 'Browser Navigate (Browserbase)',
    description: 'Open a URL in a Browserbase cloud browser with full JS rendering. Returns session live-view URL + HTTP-fetched text content.',
    parameters: {
      url: { type: 'string', required: true, description: 'HTTPS URL to open' },
      extract: { type: 'string', required: false, description: 'What to extract or look for on the page' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params) => {
      const url = String(params.url ?? '');
      if (!url.startsWith('https://')) return { ok: false, error: 'only https:// URLs allowed' };

      // HTTP fallback — always run for fast text content
      let httpContent = '';
      try {
        const r = await fetch(url, { headers: { 'user-agent': 'DSG-Agent/1.0' }, signal: AbortSignal.timeout(10_000) });
        const raw = await r.text();
        httpContent = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
      } catch {
        httpContent = '(HTTP fetch failed)';
      }

      const apiKey = process.env.BROWSERBASE_API_KEY;
      const projectId = process.env.BROWSERBASE_PROJECT_ID;
      if (!apiKey || !projectId) {
        return { ok: true, provider: 'http-fallback', url, content: httpContent, note: 'Browserbase not configured — returned HTTP fetch result' };
      }

      try {
        const res = await fetch('https://api.browserbase.com/v1/sessions', {
          method: 'POST',
          headers: { 'x-bb-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({ projectId, startUrl: url, keepAlive: false }),
        });
        const session = await res.json() as { id?: string; liveUrl?: string; debuggerUrl?: string };
        return {
          ok: true,
          provider: 'browserbase',
          sessionId: session.id,
          liveUrl: session.liveUrl ?? `https://www.browserbase.com/sessions/${session.id}`,
          httpContent,
          extract: params.extract ?? null,
          note: 'Cloud browser session created. Use liveUrl to watch live. httpContent is HTTP-fetched text (no JS).',
        };
      } catch (err) {
        return { ok: true, provider: 'http-fallback', url, content: httpContent, error: err instanceof Error ? err.message : 'browserbase failed' };
      }
    },
  },
  {
    id: 'telegram_send',
    name: 'Send Telegram Message',
    description: 'Send a message to Telegram through DSG spine.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      chat_id: { type: 'string', required: true, description: 'Telegram chat ID' },
      text: { type: 'string', required: true, description: 'Message text' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: requiredAgentId(params),
          action: 'social.telegram.send',
          payload: {
            chat_id: params.chat_id,
            text: params.text,
          },
          tool_name: 'telegram_send',
        }),
      }),
  },
  {
    id: 'audit_summary',
    name: 'Get Runtime Audit Summary',
    description: 'Fetch runtime truth and latest ledger entries for an agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'runtime_summary',
    execute: async (params, context) =>
      callJson(context, `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(requiredAgentId(params))}`, {
        method: 'GET',
      }),
  },
  {
    id: 'checkpoint',
    name: 'Create Runtime Checkpoint',
    description: 'Create a checkpoint hash from latest truth and ledger.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'write',
    requiredRole: 'checkpoint',
    execute: async (params, context) =>
      callJson(context, '/api/checkpoint', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: requiredAgentId(params) }),
      }),
  },
  {
    id: 'recovery_validate',
    name: 'Validate Runtime Recovery',
    description: 'Validate lineage integrity and missing sequences.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'checkpoint',
    execute: async (params, context) =>
      callJson(context, '/api/runtime-recovery', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: requiredAgentId(params) }),
      }),
  },
  {
    id: 'realtime_web_search',
    name: 'Real-time Web Search',
    description: 'Search live online information and return quick references.',
    parameters: {
      query: { type: 'string', required: true, description: 'Search query' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(
        context,
        `/api/realtime-search?q=${encodeURIComponent(String(params.query || ''))}`,
        { method: 'GET' },
      ),
  },
  {
    id: 'capacity',
    name: 'Check Quota & Capacity',
    description: 'Fetch quota remaining and utilization.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'usage_read',
    execute: async (_params, context) => callJson(context, '/api/capacity', { method: 'GET' }),
  },
  {
    id: 'list_agents',
    name: 'List Agents',
    description: 'List org agents and current monthly usage.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'execute',
    execute: async (_params, context) => callJson(context, '/api/agents', { method: 'GET' }),
  },
  {
    id: 'create_agent',
    name: 'Create New Agent',
    description: 'Create a new agent with one-time API key return.',
    parameters: {
      name: { type: 'string', required: true, description: 'Agent name' },
      policy_id: { type: 'string', required: false, description: 'Policy ID; omit/null for backend default' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/agents', {
        method: 'POST',
        body: JSON.stringify(omitEmptyPolicy({ ...params })),
      }),
  },
  {
    id: 'create_chatbot_agent',
    name: 'Create Chatbot Agent',
    description: 'Create a chatbot-ready agent with safe defaults for interactive usage.',
    parameters: {
      name: { type: 'string', required: false, description: 'Agent name (default: Chatbot Agent)' },
      policy_id: { type: 'string', required: false, description: 'Policy ID; omit/null for backend default' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit (default: 50000)' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/agents', {
        method: 'POST',
        body: JSON.stringify(omitEmptyPolicy({
          name: String(params.name || 'Chatbot Agent'),
          policy_id: params.policy_id ? String(params.policy_id) : null,
          monthly_limit: Number(params.monthly_limit || 50000),
        })),
      }),
  },
  {
    id: 'list_policies',
    name: 'List Policies',
    description: 'List available policies.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'policies_read',
    execute: async (_params, context) => callJson(context, '/api/policies', { method: 'GET' }),
  },
  {
    id: 'reconcile_effect',
    name: 'Reconcile Effect Callback',
    description: 'Mark effect status as succeeded or failed.',
    parameters: {
      effect_id: { type: 'string', required: true, description: 'Effect ID' },
      status: { type: 'string', required: true, description: 'succeeded or failed' },
    },
    riskLevel: 'write',
    requiredRole: 'effect_callback',
    execute: async (params, context) =>
      callJson(context, '/api/effect-callback', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  {
    id: 'list_executions',
    name: 'List Executions',
    description: 'List recent executions for this organization.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 10)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/executions?limit=${encodeURIComponent(String(params.limit || 10))}`, { method: 'GET' }),
  },
  {
    id: 'get_execution_proof',
    name: 'Get Execution Proof',
    description: 'Get replay details and proof context for one execution.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/replay/${encodeURIComponent(String(params.execution_id || ''))}`, { method: 'GET' }),
  },
  {
    id: 'list_proofs',
    name: 'List Proofs',
    description: 'List recent proof artifacts from audit logs.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/proofs?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_ledger',
    name: 'Get Ledger',
    description: 'Get combined ledger and core-ledger snapshot.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/ledger?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_audit',
    name: 'Get Audit Events',
    description: 'Get audit events and determinism checks.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/audit?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_usage',
    name: 'Get Usage',
    description: 'Get current plan usage and projected overage.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'usage_read',
    execute: async (_params, context) => callJson(context, '/api/usage', { method: 'GET' }),
  },
  {
    id: 'get_metrics',
    name: 'Get Metrics',
    description: 'Get current day control-plane performance metrics.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/metrics', { method: 'GET' }),
  },
  {
    id: 'get_integration',
    name: 'Get Integration Status',
    description: 'Fetch integration status and source-of-truth posture.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/integration', { method: 'GET' }),
  },
  {
    id: 'get_agent_detail',
    name: 'Get Agent Detail',
    description: 'Get details and monthly usage for one agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(requiredAgentId(params))}`, { method: 'GET' }),
  },
  {
    id: 'update_agent',
    name: 'Update Agent',
    description: 'Update agent metadata, status, policy, or monthly limit.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
      name: { type: 'string', required: false, description: 'New name' },
      status: { type: 'string', required: false, description: 'active or disabled' },
      policy_id: { type: 'string', required: false, description: 'New policy ID; omit/null for backend default' },
      monthly_limit: { type: 'number', required: false, description: 'New monthly limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) => {
      const { agent_id: _agentId, ...patch } = params;
      return callJson(context, `/api/agents/${encodeURIComponent(requiredAgentId(params))}`, {
        method: 'PATCH',
        body: JSON.stringify(omitEmptyPolicy(patch)),
      });
    },
  },
  {
    id: 'rotate_agent_key',
    name: 'Rotate Agent API Key',
    description: 'Rotate and return a new one-time API key for an agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(requiredAgentId(params))}/rotate-key`, {
        method: 'POST',
      }),
  },
  {
    id: 'delete_agent',
    name: 'Disable Agent',
    description: 'Disable an agent (soft delete).',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(requiredAgentId(params))}`, {
        method: 'DELETE',
      }),
  },
  {
    id: 'get_enterprise_proof',
    name: 'Get Enterprise Proof Report',
    description: 'Fetch public enterprise proof and attestation report.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/enterprise-proof/report', { method: 'GET' }),
  },
  {
    id: 'auto_setup',
    name: 'Run Org Auto Setup',
    description: 'Auto-configure default policy, agent, seed execution, billing, onboarding, and runtime roles.',
    parameters: {},
    riskLevel: 'critical',
    requiredRole: 'org_admin',
    execute: async (_params, context) =>
      callJson(context, '/api/setup/auto', {
        method: 'POST',
      }),
  },

  // ── Code execution tools ──────────────────────────────────────────────────
  {
    id: 'write_code_file',
    name: 'Write Code File',
    description: 'Write a code file into the sandbox (/tmp/dsg-code/). Supports any language. Secret injection is blocked.',
    parameters: {
      filename: { type: 'string', required: true, description: 'Filename (e.g. script.py, index.js)' },
      content: { type: 'string', required: true, description: 'File content' },
      language: { type: 'string', required: false, description: 'Language hint (node | python3 | bash)' },
    },
    riskLevel: 'write',
    requiredRole: 'operator',
    execute: async (params, context) =>
      callJson(context, '/api/dsg/code/write', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },
  {
    id: 'run_code',
    name: 'Run Code (Hermes Brain)',
    description: 'Execute inline code or a sandbox file through the Hermes Brain governance gate. Supports node, python3, bash. Returns stdout.',
    parameters: {
      runtime: { type: 'string', required: true, description: 'node | python3 | bash' },
      code: { type: 'string', required: false, description: 'Inline code to run' },
      file: { type: 'string', required: false, description: 'Filename already in /tmp/dsg-code/ (use after write_code_file)' },
    },
    riskLevel: 'critical',
    requiredRole: 'org_admin',
    execute: async (params, context) => {
      const runtime = String(params.runtime ?? 'node') as 'node' | 'python3' | 'bash';
      const code = typeof params.code === 'string' ? params.code : undefined;
      const file = typeof params.file === 'string' ? params.file : undefined;
      const input = code
        ? `Run this ${runtime} code: ${code.slice(0, 200)}`
        : `Run file ${file ?? '(unknown)'} with ${runtime}`;
      return callJson(context, '/api/dsg/brain/execute', {
        method: 'POST',
        body: JSON.stringify({ input, code, filename: file, runtime }),
      });
    },
  },

  // ── Compliance & delivery proof ───────────────────────────────────────────
  {
    id: 'get_compliance_status',
    name: 'CCVS Compliance Status',
    description: 'Get live CCVS compliance status — mutation score, claim gates, evidence chain.',
    parameters: {
      run_id: { type: 'string', required: false, description: 'Optional CI run ID for a specific report' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) => {
      const qs = params.run_id ? `?run_id=${encodeURIComponent(String(params.run_id))}` : '';
      return callJson(context, `/api/ccvs/compliance-status${qs}`);
    },
  },
  {
    id: 'get_delivery_proof',
    name: 'Delivery Proof Scan',
    description: 'Run a live Delivery Proof scan against a production URL — checks readiness, health, auth gates.',
    parameters: {
      production_url: { type: 'string', required: false, description: 'Production URL to scan (defaults to this deployment)' },
      readiness_path: { type: 'string', required: false, description: 'Readiness path (default: /api/readiness)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, '/api/delivery-proof/scan', {
        method: 'POST',
        body: JSON.stringify({
          production_url: params.production_url ?? context.origin,
          readiness_path: params.readiness_path ?? '/api/readiness',
        }),
      }),
  },

  // ── Web / browser tools ───────────────────────────────────────────────────
  {
    id: 'fetch_url',
    name: 'Fetch URL',
    description: 'Fetch a public URL and return its text content (lightweight, no JavaScript rendering). Use for reading docs, APIs, and pages.',
    parameters: {
      url: { type: 'string', required: true, description: 'HTTPS URL to fetch' },
      selector: { type: 'string', required: false, description: 'Optional: keyword to search in the response text' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params) => {
      const url = String(params.url ?? '');
      if (!url.startsWith('https://')) return { ok: false, error: 'only https:// URLs allowed' };
      try {
        const r = await fetch(url, { headers: { 'user-agent': 'DSG-Agent/1.0' }, signal: AbortSignal.timeout(10_000) });
        const text = await r.text();
        const trimmed = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
        const selector = typeof params.selector === 'string' ? params.selector : '';
        const found = selector ? trimmed.toLowerCase().includes(selector.toLowerCase()) : null;
        return { ok: r.ok, status: r.status, content: trimmed, found, url };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' };
      }
    },
  },
];
