/**
 * Hermes Orchestrator — DSG ONE Multi-Agent Router
 * Capability-first routing over OpenRouter candidates.
 * Default mode: full parallel mesh (all 5 agents run simultaneously).
 */

import { AGENTS, type AgentRole } from './agent-registry';

export type OrchestratorInput = {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type AgentResult = {
  role: AgentRole;
  model: string;
  ok: boolean;
  output: string;
  latencyMs: number;
};

export type OrchestratorResult = {
  ok: boolean;
  response: string;
  agentsUsed: AgentResult[];
  primaryRole: AgentRole | null;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function resolveApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY ?? null;
}

function resolveModelForRole(role: AgentRole): string {
  return AGENTS[role].defaultModel;
}

/**
 * Full mesh: always route to all 5 roles for parallel execution.
 * Each agent contributes its perspective; the orchestrator synthesizes results.
 */
function meshRouter(): AgentRole[] {
  return Object.keys(AGENTS) as AgentRole[];
}

async function callOpenRouter(model: string, messages: Array<Record<string, unknown>>): Promise<string> {
  const apiKey = resolveApiKey();
  if (!apiKey) return '[OPENROUTER_API_KEY is missing — model ' + model + ']';

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
      'HTTP-Referer': 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'X-Title': 'DSG ONE ProofGate',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      stream: false,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');

    // Provide clearer error message for auth failures
    if (response.status === 401) {
      throw new Error(
        'OpenRouter authentication error (HTTP 401): Check that OPENROUTER_API_KEY is valid and the account exists.',
      );
    } else if (response.status === 403) {
      throw new Error(
        'OpenRouter access forbidden (HTTP 403): The API key may lack required permissions.',
      );
    }

    throw new Error('OpenRouter ' + response.status + ': ' + text.slice(0, 200));
  }

  const json = (await response.json()) as Record<string, unknown>;
  const choices = (json.choices as Array<Record<string, unknown>> | undefined) ?? [];
  const first = choices[0];
  const message = (first?.message as Record<string, unknown> | undefined) ?? {};
  const content = message.content;
  if (typeof content === 'string' && content.length > 0) return content;
  return '[No completion output]';
}

export async function orchestrateChat(input: OrchestratorInput): Promise<OrchestratorResult> {
  const roles = meshRouter();
  const apiKey = resolveApiKey();

  const systemPrompt = process.env.HERMES_ORCHESTRATOR_SYSTEM_PROMPT ??
    'You are DSG ONE Orchestrator. Be concise and actionable.';

  const messages: Array<Record<string, unknown>> = [{ role: 'system', content: systemPrompt }];
  if (input.conversationHistory?.length) {
    messages.push(...input.conversationHistory.map((m) => ({ role: m.role, content: m.content })));
  }
  messages.push({ role: 'user', content: input.message });

  if (!apiKey) {
    return {
      ok: false,
      response: 'Missing OPENROUTER_API_KEY',
      agentsUsed: [],
      primaryRole: null,
    };
  }

  const settledResults = await Promise.allSettled(
    roles.map<Promise<AgentResult>>(async (role) => {
      const startMs = Date.now();
      const model = resolveModelForRole(role);
      const output = await callOpenRouter(model, messages);
      return {
        role,
        model,
        ok: output !== '[OPENROUTER_API_KEY is missing — model ' + model + ']',
        output,
        latencyMs: Date.now() - startMs,
      } satisfies AgentResult;
    })
  );

  const results: AgentResult[] = settledResults.map((item, idx) => {
    if (item.status === 'fulfilled') return item.value;
    const role = roles[idx];
    return {
      role,
      model: resolveModelForRole(role),
      ok: false,
      output: '',
      latencyMs: 0,
    } satisfies AgentResult;
  });

  const ok = results.some((r) => r.ok && r.output && r.output.length > 0);
  const joined = results
    .filter((r) => r.ok && r.output && r.output.length > 0)
    .map((r) => '[' + AGENTS[r.role].label + ']\n' + r.output)
    .join('\n\n');

  const response = joined || 'No agent returned output';

  return {
    ok,
    response,
    agentsUsed: results,
    primaryRole: roles[0] ?? null,
  };
}
