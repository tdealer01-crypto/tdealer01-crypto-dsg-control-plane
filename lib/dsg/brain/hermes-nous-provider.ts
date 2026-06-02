/**
 * NousResearch Hermes model provider for DSG Brain.
 *
 * Hermes 3 (Llama 3.1 base) supports:
 *   - OpenAI-compatible function calling (tool_calls)
 *   - Native JSON mode
 *   - Advanced agentic reasoning with <tool_call>/<tool_response> XML
 *   - Multi-step planning with tool use loops
 *
 * Hosted via Together AI (TOGETHER_API_KEY) or OpenRouter (OPENROUTER_API_KEY).
 * API is OpenAI-compatible — no separate SDK required.
 */

import type { LLMPlanRequest, LLMPlanResponse, LLMRemediationRequest, LLMRemediationResponse } from './hermes-llm';
import type { ConformanceViolation } from './conformance-gate';

export type HermesNousModel =
  | 'NousResearch/Hermes-3-Llama-3.1-70B-FP8'
  | 'NousResearch/Hermes-3-Llama-3.1-405B-FP8'
  | 'NousResearch/Hermes-3-Llama-3.1-8B'
  | 'nousresearch/hermes-3-llama-3.1-70b'   // OpenRouter ID
  | 'nousresearch/hermes-3-llama-3.1-405b'; // OpenRouter ID

export type HermesNousHosting = 'together' | 'openrouter';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** DSG agentic tool definitions for Hermes function calling */
export const DSG_HERMES_TOOLS: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Execute a terminal command in the sandbox. Only safe-listed commands are allowed.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to execute (e.g. ls, cat, node)' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
          reason: { type: 'string', description: 'Why this command is needed' },
        },
        required: ['command', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Only allowed paths may be written.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch content from a public URL. Internal/sensitive URLs require approval.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method', default: 'GET' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_dsg_gate',
      description: 'Evaluate an action through the DSG safety gate before execution.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'Action name' },
          actionType: {
            type: 'string',
            enum: ['observe', 'read', 'write', 'delete', 'payment', 'deploy', 'admin'],
          },
          targetSystemId: { type: 'string', description: 'Target system identifier' },
          riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
        required: ['action', 'actionType', 'targetSystemId', 'riskLevel'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'emit_plan',
      description: 'Emit a structured execution plan as the final output.',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                args: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string' },
              },
              required: ['command', 'reason'],
            },
          },
          summary: { type: 'string', description: 'Overall plan summary' },
          riskTags: { type: 'array', items: { type: 'string' }, description: 'Risk classification tags' },
        },
        required: ['steps', 'summary'],
      },
    },
  },
];

function resolveEndpoint(hosting: HermesNousHosting): { baseUrl: string; authHeader: string } {
  if (hosting === 'together') {
    const key = process.env.TOGETHER_API_KEY;
    if (!key) throw new Error('TOGETHER_API_KEY not set');
    return { baseUrl: 'https://api.together.xyz/v1', authHeader: `Bearer ${key}` };
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  return { baseUrl: 'https://openrouter.ai/api/v1', authHeader: `Bearer ${key}` };
}

function normalizeModel(model: string, hosting: HermesNousHosting): string {
  if (hosting === 'openrouter') {
    if (model.startsWith('NousResearch/')) {
      return model.replace('NousResearch/', 'nousresearch/').toLowerCase();
    }
  }
  if (hosting === 'together') {
    if (model.startsWith('nousresearch/')) {
      return model.replace('nousresearch/', 'NousResearch/');
    }
  }
  return model;
}

async function callHermesAPI(
  messages: OpenAIMessage[],
  tools: OpenAITool[],
  model: string,
  hosting: HermesNousHosting,
  maxTokens = 2048,
): Promise<OpenAIResponse> {
  const { baseUrl, authHeader } = resolveEndpoint(hosting);
  const normalizedModel = normalizeModel(model, hosting);

  const headers: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };

  if (hosting === 'openrouter') {
    headers['HTTP-Referer'] = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    headers['X-Title'] = 'DSG ONE ProofGate';
  }

  const body = {
    model: normalizedModel,
    messages,
    tools,
    tool_choice: 'auto',
    max_tokens: maxTokens,
    temperature: 0.1,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Hermes API error ${response.status}: ${err}`);
  }

  return response.json() as Promise<OpenAIResponse>;
}

function buildHermesPlanSystemPrompt(allowedCommands: string[], allowedPaths: string[]): string {
  return `You are Hermes, an agentic planning system for DSG Brain — a deterministic governance platform.

Your role: generate safe, deterministic execution plans that comply with DSG policy.
The DSG Gate will inspect your proposed actions before execution. You are the worker; Gate is the inspector.

ALLOWED COMMANDS: ${allowedCommands.length > 0 ? allowedCommands.join(', ') : '(none)'}
ALLOWED PATHS: ${allowedPaths.length > 0 ? allowedPaths.join(', ') : '(none)'}

RULES:
- Only use commands from ALLOWED COMMANDS
- Only read/write paths from ALLOWED PATHS
- For each non-trivial action, call evaluate_dsg_gate first
- Always finalize with emit_plan when the plan is complete
- Be explicit: state what each step does and why

Use the provided tools to construct the plan step-by-step. End by calling emit_plan with the final structured plan.`;
}

function extractPlanFromToolCalls(toolCalls: OpenAIToolCall[]): {
  steps: Array<{ command: string; args: string[]; reason: string }>;
  summary: string;
  riskTags: string[];
} {
  for (const call of toolCalls) {
    if (call.function.name === 'emit_plan') {
      try {
        const parsed = JSON.parse(call.function.arguments);
        return {
          steps: parsed.steps ?? [],
          summary: parsed.summary ?? '',
          riskTags: parsed.riskTags ?? [],
        };
      } catch {
        // fall through
      }
    }
  }
  const allSteps: Array<{ command: string; args: string[]; reason: string }> = [];
  for (const call of toolCalls) {
    if (call.function.name === 'execute_command') {
      try {
        const parsed = JSON.parse(call.function.arguments);
        allSteps.push({
          command: parsed.command ?? 'unknown',
          args: parsed.args ?? [],
          reason: parsed.reason ?? '',
        });
      } catch {
        // skip malformed
      }
    }
  }
  return { steps: allSteps, summary: 'Plan derived from tool calls', riskTags: [] };
}

function stepsToCanonicalPlan(steps: Array<{ command: string; args?: string[]; reason: string }>): string {
  return steps
    .map((s) => `${s.command} ${(s.args ?? []).join(' ')} # ${s.reason}`.trim())
    .join('\n');
}

/**
 * Generate a plan using NousResearch Hermes with native function calling.
 */
export async function generatePlanViaNousHermes(
  request: LLMPlanRequest,
  model: HermesNousModel = 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
  hosting: HermesNousHosting = 'together',
): Promise<LLMPlanResponse> {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: buildHermesPlanSystemPrompt(request.allowedCommands, request.allowedPaths),
    },
    {
      role: 'user',
      content: `Policy Version: ${request.policyVersion}\nTool Manifest Hash: ${request.toolManifestHash}\n\nTask: ${request.userInput}`,
    },
  ];

  const result = await callHermesAPI(messages, DSG_HERMES_TOOLS, model, hosting);
  const choice = result.choices[0];
  if (!choice) throw new Error('No choices in Hermes response');

  const toolCalls = choice.message.tool_calls ?? [];
  const { steps, summary, riskTags } = extractPlanFromToolCalls(toolCalls);

  if (steps.length === 0 && choice.message.content) {
    return {
      canonicalPlan: choice.message.content,
      rationale: 'Hermes text plan (no tool calls)',
      riskTags: [],
    };
  }

  const canonicalPlan = stepsToCanonicalPlan(steps);
  const finalRiskTags = [...riskTags];
  if (request.allowedCommands.length === 0) finalRiskTags.push('no-commands');
  if (request.allowedPaths.length === 0) finalRiskTags.push('no-paths');

  return { canonicalPlan, rationale: summary, riskTags: finalRiskTags };
}

/**
 * Remediate a failed plan using NousResearch Hermes with function calling.
 */
export async function remediatePlanViaNousHermes(
  request: LLMRemediationRequest,
  model: HermesNousModel = 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
  hosting: HermesNousHosting = 'together',
): Promise<LLMRemediationResponse> {
  const violationText = request.violations
    .map((v: ConformanceViolation) => `- [${v.rule}] ${v.message}`)
    .join('\n');

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: buildHermesPlanSystemPrompt(request.allowedCommands, request.allowedPaths),
    },
    {
      role: 'user',
      content: `The following plan failed conformance. Fix ALL violations and emit_plan the corrected version.\n\nORIGINAL PLAN:\n${request.originalPlan}\n\nVIOLATIONS:\n${violationText}`,
    },
  ];

  const result = await callHermesAPI(messages, DSG_HERMES_TOOLS, model, hosting);
  const choice = result.choices[0];
  if (!choice) throw new Error('No choices in Hermes remediation response');

  const toolCalls = choice.message.tool_calls ?? [];
  const { steps, summary } = extractPlanFromToolCalls(toolCalls);

  if (steps.length === 0 && choice.message.content) {
    return { remediatedPlan: choice.message.content, changeDescription: 'Hermes text remediation' };
  }

  return {
    remediatedPlan: stepsToCanonicalPlan(steps),
    changeDescription: summary,
  };
}

/** Detect which hosting provider is available based on env vars. */
export function detectNousHosting(): HermesNousHosting | null {
  if (process.env.TOGETHER_API_KEY) return 'together';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}
