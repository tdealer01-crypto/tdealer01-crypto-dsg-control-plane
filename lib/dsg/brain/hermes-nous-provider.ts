/**
 * NousResearch Hermes model provider for DSG Brain.
 *
 * Full feature set per official NousResearch/hermes-function-calling GitHub:
 *   - OpenAI-compatible function calling (tool_calls JSON)
 *   - Native XML function calling: <tool_call>{"name":...,"arguments":...}</tool_call>
 *   - Tool results via `tool` role: <tool_response>{"name":...,"content":...}</tool_response>
 *   - <tools> XML wrapping in system prompt (Hermes native format)
 *   - <scratch_pad> reasoning: Goal / Actions / Observation / Reflection
 *   - JSON mode via <schema> tags in system prompt
 *   - Parallel function calls (multiple <tool_call> in one response)
 *   - max_depth iteration limit for agentic loops
 *   - num_fewshot few-shot example injection
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
  | 'nousresearch/hermes-3-llama-3.1-70b'
  | 'nousresearch/hermes-3-llama-3.1-405b';

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

// ── Hermes XML format parsers ──────────────────────────────────────────────────

/**
 * Parse Hermes-native <tool_call>...</tool_call> XML blocks from a response.
 * Handles multiple parallel calls in one response.
 */
export function parseXmlToolCalls(text: string): Array<{ name: string; arguments: Record<string, unknown> }> {
  const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as { name?: string; arguments?: Record<string, unknown> };
      if (parsed.name) {
        calls.push({ name: parsed.name, arguments: parsed.arguments ?? {} });
      }
    } catch {
      // skip malformed block
    }
  }
  return calls;
}

/**
 * Parse <scratch_pad> reasoning block.
 * Returns Goal / Actions / Observation / Reflection sections.
 */
export function parseScratchPad(text: string): {
  goal?: string;
  actions?: string;
  observation?: string;
  reflection?: string;
} | null {
  const match = /<scratch_pad>([\s\S]*?)<\/scratch_pad>/i.exec(text);
  if (!match) return null;
  const body = match[1];
  const goal = /Goal:\s*([\s\S]*?)(?=\n[A-Z]|$)/i.exec(body)?.[1]?.trim();
  const actions = /Actions:\s*([\s\S]*?)(?=\nObservation:|$)/i.exec(body)?.[1]?.trim();
  const observation = /Observation:\s*([\s\S]*?)(?=\nReflection:|$)/i.exec(body)?.[1]?.trim();
  const reflection = /Reflection:\s*([\s\S]*?)$/i.exec(body)?.[1]?.trim();
  return { goal, actions, observation, reflection };
}

/**
 * Build <tool_response> block for passing results back to Hermes.
 * Used with `tool` role in the message array.
 */
export function buildToolResponseMessage(
  name: string,
  content: unknown,
): OpenAIMessage {
  return {
    role: 'tool',
    content: `<tool_response>\n${JSON.stringify({ name, content }, null, 2)}\n</tool_response>`,
  };
}

/**
 * Wrap tool definitions in <tools> XML tags for Hermes native system prompt format.
 */
export function buildToolsXml(tools: OpenAITool[]): string {
  return `<tools>\n${JSON.stringify(tools, null, 2)}\n</tools>`;
}

/**
 * Build a JSON mode system prompt using <schema> tags (Hermes native format).
 */
export function buildJsonModeSystemPrompt(schema: Record<string, unknown>): string {
  return `You are a helpful assistant that answers in JSON. Here's the json schema you must adhere to:\n<schema>\n${JSON.stringify(schema, null, 2)}\n</schema>`;
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

function buildHermesPlanSystemPrompt(allowedCommands: string[], allowedPaths: string[], tools: OpenAITool[] = DSG_HERMES_TOOLS): string {
  return `You are a function calling AI model for DSG Brain — a deterministic governance platform.
You are provided with function signatures within <tools></tools> XML tags.
You may call one or more functions to assist with the user query.
Don't make assumptions about what values to plug into functions.
Here are the available tools: ${buildToolsXml(tools)}
Use the following pydantic model json schema for each tool call you will make:
{"properties": {"arguments": {"title": "Arguments", "type": "object"}, "name": {"title": "Name", "type": "string"}}, "required": ["arguments", "name"], "title": "FunctionCall", "type": "object"}
For each function call return a json object with function name and arguments within <tool_call></tool_call> XML tags as follows:
<tool_call>
{"arguments": <args-dict>, "name": <function-name>}
</tool_call>

You may use <scratch_pad> to reason before calling tools:
<scratch_pad>
Goal: [restate the user request]
Actions: [list of function calls needed]
Observation: [summarize tool results]
Reflection: [evaluate whether tools addressed the task]
</scratch_pad>

ALLOWED COMMANDS: ${allowedCommands.length > 0 ? allowedCommands.join(', ') : '(none)'}
ALLOWED PATHS: ${allowedPaths.length > 0 ? allowedPaths.join(', ') : '(none)'}

RULES:
- Only use commands from ALLOWED COMMANDS
- Only read/write paths from ALLOWED PATHS
- For each non-trivial action, call evaluate_dsg_gate first
- Always finalize with emit_plan when the plan is complete`;
}

type NormalizedCall = { name: string; arguments: Record<string, unknown> };

/**
 * Extract normalized calls from either OpenAI tool_calls JSON or Hermes XML format.
 * XML fallback handles cases where the model emits <tool_call> instead of tool_calls array.
 */
function extractNormalizedCalls(choice: OpenAIResponse['choices'][0]): NormalizedCall[] {
  // Prefer OpenAI-style tool_calls if present
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    return choice.message.tool_calls.map((tc) => ({
      name: tc.function.name,
      arguments: (() => { try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { return {}; } })(),
    }));
  }
  // Fallback: parse native Hermes <tool_call> XML blocks from text content
  if (choice.message.content) {
    const xmlCalls = parseXmlToolCalls(choice.message.content);
    if (xmlCalls.length > 0) return xmlCalls;
  }
  return [];
}

function extractPlanFromCalls(calls: NormalizedCall[]): {
  steps: Array<{ command: string; args: string[]; reason: string }>;
  summary: string;
  riskTags: string[];
} {
  for (const call of calls) {
    if (call.name === 'emit_plan') {
      const p = call.arguments;
      return {
        steps: Array.isArray(p.steps) ? p.steps as Array<{ command: string; args: string[]; reason: string }> : [],
        summary: String(p.summary ?? ''),
        riskTags: Array.isArray(p.riskTags) ? p.riskTags as string[] : [],
      };
    }
  }
  const allSteps: Array<{ command: string; args: string[]; reason: string }> = [];
  for (const call of calls) {
    if (call.name === 'execute_command') {
      allSteps.push({
        command: String(call.arguments.command ?? 'unknown'),
        args: Array.isArray(call.arguments.args) ? call.arguments.args as string[] : [],
        reason: String(call.arguments.reason ?? ''),
      });
    }
  }
  return { steps: allSteps, summary: 'Plan derived from tool calls', riskTags: [] };
}

function stepsToCanonicalPlan(steps: Array<{ command: string; args?: string[]; reason: string }>): string {
  return steps
    .map((s) => `${s.command} ${(s.args ?? []).join(' ')} # ${s.reason}`.trim())
    .join('\n');
}

export type HermesNousOptions = {
  model?: HermesNousModel;
  hosting?: HermesNousHosting;
  /** Max agentic loop depth (default 5, matching NousResearch default) */
  maxDepth?: number;
  /** Number of few-shot examples to inject (0 = none) */
  numFewshot?: number;
  /** Additional tools beyond DSG_HERMES_TOOLS */
  extraTools?: OpenAITool[];
};

type FewShotExample = { user: string; assistantToolCall: string; toolName: string; toolResult: unknown };

/** Built-in few-shot examples for plan generation (from hermes-function-calling repo patterns) */
const PLAN_FEWSHOT_EXAMPLES: FewShotExample[] = [
  {
    user: 'List files in the current directory',
    assistantToolCall: '<tool_call>\n{"arguments": {"command": "ls", "args": ["-la"], "reason": "List all files including hidden"}, "name": "execute_command"}\n</tool_call>',
    toolName: 'execute_command',
    toolResult: { exit_code: 0, stdout: 'total 32\ndrwxr-xr-x  8 user user 4096 Jun  4 12:00 .\n-rw-r--r--  1 user user  512 Jun  4 12:00 package.json' },
  },
  {
    user: 'Check if tests pass',
    assistantToolCall: '<tool_call>\n{"arguments": {"command": "npm", "args": ["run", "test"], "reason": "Run test suite"}, "name": "execute_command"}\n</tool_call>',
    toolName: 'execute_command',
    toolResult: { exit_code: 0, stdout: 'All tests passed' },
  },
];

function injectFewShot(messages: OpenAIMessage[], numFewshot: number): OpenAIMessage[] {
  if (numFewshot <= 0) return messages;
  const system = messages[0];
  const rest = messages.slice(1);
  const examples = PLAN_FEWSHOT_EXAMPLES.slice(0, Math.min(numFewshot, PLAN_FEWSHOT_EXAMPLES.length));
  const fewShotMessages: OpenAIMessage[] = [];
  for (const ex of examples) {
    fewShotMessages.push({ role: 'user', content: ex.user });
    fewShotMessages.push({ role: 'assistant', content: ex.assistantToolCall });
    fewShotMessages.push(buildToolResponseMessage(ex.toolName, ex.toolResult));
  }
  return [system, ...fewShotMessages, ...rest];
}

/**
 * Generate a plan using NousResearch Hermes with native function calling.
 * Supports both OpenAI tool_calls JSON and native <tool_call> XML format.
 * Options: maxDepth (default 5), numFewshot (default 0), extraTools.
 */
export async function generatePlanViaNousHermes(
  request: LLMPlanRequest,
  modelOrOptions: HermesNousModel | HermesNousOptions = 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
  hosting: HermesNousHosting = 'together',
): Promise<LLMPlanResponse> {
  const opts: HermesNousOptions = typeof modelOrOptions === 'string'
    ? { model: modelOrOptions, hosting }
    : modelOrOptions;

  const model = opts.model ?? 'NousResearch/Hermes-3-Llama-3.1-70B-FP8';
  const host = opts.hosting ?? hosting;
  const maxDepth = opts.maxDepth ?? 5;
  const numFewshot = opts.numFewshot ?? 0;
  const tools = [...DSG_HERMES_TOOLS, ...(opts.extraTools ?? [])];

  let messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: buildHermesPlanSystemPrompt(request.allowedCommands, request.allowedPaths, tools),
    },
    {
      role: 'user',
      content: `Policy Version: ${request.policyVersion}\nTool Manifest Hash: ${request.toolManifestHash}\n\nTask: ${request.userInput}`,
    },
  ];

  messages = injectFewShot(messages, numFewshot);

  // Agentic loop — up to maxDepth iterations
  for (let depth = 0; depth < maxDepth; depth++) {
    const result = await callHermesAPI(messages, tools, model, host);
    const choice = result.choices[0];
    if (!choice) throw new Error('No choices in Hermes response');

    const calls = extractNormalizedCalls(choice);
    const scratchPad = choice.message.content ? parseScratchPad(choice.message.content) : null;

    // If emit_plan is in the calls, we're done
    const hasPlan = calls.some((c) => c.name === 'emit_plan');
    if (hasPlan || calls.length === 0) {
      const { steps, summary, riskTags } = extractPlanFromCalls(calls);
      if (steps.length === 0 && choice.message.content) {
        return {
          canonicalPlan: choice.message.content,
          rationale: scratchPad?.reflection ?? 'Hermes text plan (no tool calls)',
          riskTags: [],
        };
      }
      const canonicalPlan = stepsToCanonicalPlan(steps);
      const finalRiskTags = [...riskTags];
      if (request.allowedCommands.length === 0) finalRiskTags.push('no-commands');
      if (request.allowedPaths.length === 0) finalRiskTags.push('no-paths');
      return { canonicalPlan, rationale: scratchPad?.reflection ?? summary, riskTags: finalRiskTags };
    }

    // Continue loop: append assistant message + stub tool responses
    messages.push({ role: 'assistant', content: choice.message.content ?? '' });
    for (const call of calls) {
      messages.push(buildToolResponseMessage(call.name, { status: 'ok', note: `stub response for ${call.name}` }));
    }
  }

  throw new Error(`Hermes plan generation exceeded maxDepth=${maxDepth}`);
}

/**
 * Remediate a failed plan using NousResearch Hermes with function calling.
 */
export async function remediatePlanViaNousHermes(
  request: LLMRemediationRequest,
  modelOrOptions: HermesNousModel | HermesNousOptions = 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
  hosting: HermesNousHosting = 'together',
): Promise<LLMRemediationResponse> {
  const opts: HermesNousOptions = typeof modelOrOptions === 'string'
    ? { model: modelOrOptions, hosting }
    : modelOrOptions;

  const model = opts.model ?? 'NousResearch/Hermes-3-Llama-3.1-70B-FP8';
  const host = opts.hosting ?? hosting;
  const tools = [...DSG_HERMES_TOOLS, ...(opts.extraTools ?? [])];

  const violationText = request.violations
    .map((v: ConformanceViolation) => `- [${v.rule}] ${v.message}`)
    .join('\n');

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: buildHermesPlanSystemPrompt(request.allowedCommands, request.allowedPaths, tools),
    },
    {
      role: 'user',
      content: `The following plan failed conformance. Fix ALL violations and emit_plan the corrected version.\n\nORIGINAL PLAN:\n${request.originalPlan}\n\nVIOLATIONS:\n${violationText}`,
    },
  ];

  const result = await callHermesAPI(messages, tools, model, host);
  const choice = result.choices[0];
  if (!choice) throw new Error('No choices in Hermes remediation response');

  const calls = extractNormalizedCalls(choice);
  const scratchPad = choice.message.content ? parseScratchPad(choice.message.content) : null;
  const { steps, summary } = extractPlanFromCalls(calls);

  if (steps.length === 0 && choice.message.content) {
    return {
      remediatedPlan: choice.message.content,
      changeDescription: scratchPad?.reflection ?? 'Hermes text remediation',
    };
  }

  return {
    remediatedPlan: stepsToCanonicalPlan(steps),
    changeDescription: scratchPad?.reflection ?? summary,
  };
}

/**
 * Call Hermes in JSON mode using <schema> tags (NousResearch native format).
 * Returns parsed JSON matching the provided schema, or throws on parse failure.
 */
export async function callHermesJsonMode<T = unknown>(
  prompt: string,
  schema: Record<string, unknown>,
  opts: HermesNousOptions = {},
): Promise<T> {
  const model = opts.model ?? 'NousResearch/Hermes-3-Llama-3.1-70B-FP8';
  const host = opts.hosting ?? detectNousHosting() ?? 'together';

  const messages: OpenAIMessage[] = [
    { role: 'system', content: buildJsonModeSystemPrompt(schema) },
    { role: 'user', content: prompt },
  ];

  const result = await callHermesAPI(messages, [], model, host);
  const content = result.choices[0]?.message?.content ?? '';

  // Strip any markdown code fences and parse
  const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(stripped) as T;
}

/** Detect which hosting provider is available based on env vars. */
export function detectNousHosting(): HermesNousHosting | null {
  if (process.env.TOGETHER_API_KEY) return 'together';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}
