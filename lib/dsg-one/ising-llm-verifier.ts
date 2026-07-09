/**
 * Ising LLM Advisory Verifier (NVIDIA ising-calibration-1-35b-a3b)
 *
 * SECONDARY analysis layer for the DSG determinism pipeline. The LLM is an
 * advisor, never a decision-maker:
 *
 *   Problem → Deterministic Solver (Z3/QUBO — source of truth)
 *           → LLM Verifier (analysis & explanation, THIS module)
 *           → DSG Policy Gate (compares both; disagreement = flag, not override)
 *
 * Hard guarantees:
 * - The LLM NEVER modifies the solution. Its output is advisory metadata only.
 * - The deterministic verdict always wins. If the LLM disagrees, the result is
 *   flagged for human review — never auto-changed.
 * - This module never throws: any transport/parse failure degrades to verdict
 *   'unavailable' so the deterministic pipeline is unaffected.
 * - Prompt and response are SHA-256 hashed into the audit trail so every
 *   advisory opinion is reconstructible years later.
 *
 * Configuration (all optional — module is inert without them):
 * - NVIDIA_API_KEY (or legacy NVIDIA_ISING_API_KEY): bearer token
 * - NVIDIA_LLM_VERIFIER_MODE=advisory: explicit opt-in switch
 * - NVIDIA_LLM_VERIFIER_URL: override endpoint
 *   (default https://integrate.api.nvidia.com/v1/chat/completions)
 * - NVIDIA_LLM_VERIFIER_MODEL: override model id
 *   (default nvidia/ising-calibration-1-35b-a3b)
 */

import type { QUBOMatrix } from './qubo-builder';
import type { Z3VerificationResult } from './ising-to-z3-verifier';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

export const DEFAULT_LLM_VERIFIER_URL =
  'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_LLM_VERIFIER_MODEL = 'nvidia/ising-calibration-1-35b-a3b';

export interface LLMVerifierConfig {
  url: string;
  model: string;
  apiKey: string;
}

export interface LLMAnalysisRequest {
  /** Binary assignment produced by the deterministic solver */
  solution: Record<string, number | boolean>;

  /** QUBO matrix the solution was solved from */
  quboMatrix: QUBOMatrix;

  /** Task list (constraint context) */
  tasks: Task[];

  /** Agent capacities (constraint context) */
  agentCapacities: AgentCapacity[];

  /** Timeout in milliseconds (default 15000, capped at 30000) */
  timeout?: number;
}

export type LLMVerdict =
  | 'agrees' // LLM found no constraint violations
  | 'flags_violations' // LLM believes constraints are violated
  | 'uncertain' // LLM responded but output could not be parsed reliably
  | 'unavailable'; // Not configured, or transport/HTTP failure

export interface LLMAnalysisResult {
  verdict: LLMVerdict;

  /** Constraint violations the LLM claims to have found (advisory only) */
  claimedViolations: string[];

  /** LLM's natural-language explanation of the solution */
  explanation: string;

  /** Optional improvement suggestions (advisory only, never applied) */
  suggestions: string[];

  /** Wall-clock analysis time in milliseconds */
  analysisTimeMs: number;

  /** Model identifier that produced the analysis */
  model: string;

  /** Audit trail: SHA-256 of the exact prompt sent */
  promptHash: string;

  /** Audit trail: SHA-256 of the raw response (empty string when unavailable) */
  responseHash: string;

  /** Present when verdict is 'unavailable' or 'uncertain' */
  failureReason?: string;
}

/** DSG gate outcome comparing deterministic verdict with LLM advisory. */
export interface DSGGateResult {
  /**
   * - confirmed: deterministic solver and LLM agree the solution is valid
   * - flagged_for_review: they disagree — deterministic verdict STANDS, but a
   *   human should look at it
   * - deterministic_only: LLM advisory unavailable/uncertain; deterministic
   *   verdict stands alone
   * - rejected: the deterministic solver itself said the solution is invalid
   *   (LLM opinion is irrelevant — invalid is invalid)
   */
  status: 'confirmed' | 'flagged_for_review' | 'deterministic_only' | 'rejected';

  /** The verdict that decides the outcome — always the deterministic one */
  deterministicValid: boolean;

  llmVerdict: LLMVerdict;

  /** Human-readable rationale for the gate decision */
  rationale: string;

  /** Combined audit hash: deterministic proofHash + LLM promptHash/responseHash */
  gateProofHash: string;
}

/** Read verifier configuration from the environment. Null = advisory disabled. */
export function resolveLLMVerifierConfig(): LLMVerifierConfig | null {
  if (process.env.NVIDIA_LLM_VERIFIER_MODE !== 'advisory') return null;
  const apiKey =
    process.env.NVIDIA_API_KEY?.trim() ||
    process.env.NVIDIA_ISING_API_KEY?.trim() ||
    '';
  if (!apiKey) return null;
  return {
    url: process.env.NVIDIA_LLM_VERIFIER_URL?.trim() || DEFAULT_LLM_VERIFIER_URL,
    model:
      process.env.NVIDIA_LLM_VERIFIER_MODEL?.trim() || DEFAULT_LLM_VERIFIER_MODEL,
    apiKey,
  };
}

/**
 * Ask the NVIDIA LLM to analyze a deterministic solver's solution.
 *
 * Never throws. Never modifies the solution. Returns advisory metadata only.
 */
export async function analyzeSolutionWithLLM(
  req: LLMAnalysisRequest,
): Promise<LLMAnalysisResult> {
  const startTime = Date.now();
  const config = resolveLLMVerifierConfig();

  const prompt = buildAnalysisPrompt(req);
  const promptHash = sha256Json(prompt);

  if (!config) {
    return {
      verdict: 'unavailable',
      claimedViolations: [],
      explanation: '',
      suggestions: [],
      analysisTimeMs: Date.now() - startTime,
      model: 'none',
      promptHash,
      responseHash: '',
      failureReason:
        'LLM advisory not configured (set NVIDIA_LLM_VERIFIER_MODE=advisory and NVIDIA_API_KEY)',
    };
  }

  const timeoutMs = Math.min(req.timeout ?? 15000, 30000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let rawContent: string;
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        // Low temperature: we want stable, analytical output, not creativity.
        temperature: 0.2,
        top_p: 1.0,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LLM HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('LLM response has no message content');
    }
    rawContent = content;
  } catch (error) {
    const reason = controller.signal.aborted
      ? `LLM timed out after ${timeoutMs}ms`
      : error instanceof Error
        ? error.message
        : String(error);
    return {
      verdict: 'unavailable',
      claimedViolations: [],
      explanation: '',
      suggestions: [],
      analysisTimeMs: Date.now() - startTime,
      model: config.model,
      promptHash,
      responseHash: '',
      failureReason: reason,
    };
  } finally {
    clearTimeout(timer);
  }

  const responseHash = sha256Json(rawContent);
  const parsed = parseAnalysisResponse(rawContent);

  return {
    ...parsed,
    analysisTimeMs: Date.now() - startTime,
    model: config.model,
    promptHash,
    responseHash,
  };
}

/**
 * DSG Policy Gate: combine the deterministic verdict with the LLM advisory.
 *
 * The deterministic result ALWAYS decides validity. The LLM can only cause a
 * review flag — it can never flip an invalid solution to valid or vice versa.
 */
export function gateWithDSG(
  deterministic: Z3VerificationResult,
  llm: LLMAnalysisResult,
): DSGGateResult {
  const gateProofHash = sha256Json({
    deterministicProofHash: deterministic.proofHash,
    llmPromptHash: llm.promptHash,
    llmResponseHash: llm.responseHash,
    llmVerdict: llm.verdict,
  });

  if (!deterministic.isValid) {
    return {
      status: 'rejected',
      deterministicValid: false,
      llmVerdict: llm.verdict,
      rationale:
        'Deterministic solver rejected the solution (UNSAT). LLM advisory cannot override a formal rejection.',
      gateProofHash,
    };
  }

  if (llm.verdict === 'agrees') {
    return {
      status: 'confirmed',
      deterministicValid: true,
      llmVerdict: llm.verdict,
      rationale:
        'Deterministic solver verified the solution and LLM advisory found no violations.',
      gateProofHash,
    };
  }

  if (llm.verdict === 'flags_violations') {
    return {
      status: 'flagged_for_review',
      deterministicValid: true,
      llmVerdict: llm.verdict,
      rationale:
        `Deterministic solver verified the solution but LLM advisory claims violations: ` +
        `${llm.claimedViolations.join('; ') || '(unspecified)'}. ` +
        'Deterministic verdict stands; human review recommended.',
      gateProofHash,
    };
  }

  return {
    status: 'deterministic_only',
    deterministicValid: true,
    llmVerdict: llm.verdict,
    rationale:
      llm.verdict === 'unavailable'
        ? `LLM advisory unavailable (${llm.failureReason ?? 'not configured'}); deterministic verdict stands alone.`
        : 'LLM advisory response could not be parsed reliably; deterministic verdict stands alone.',
    gateProofHash,
  };
}

/** Build the analysis prompt. Kept deterministic: sorted keys, no timestamps. */
export function buildAnalysisPrompt(req: LLMAnalysisRequest): string {
  const assignments = Object.entries(req.solution)
    .map(([k, v]) => [k, Number(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  const taskLines = req.tasks
    .map((t) => `- ${t.id}`)
    .sort()
    .join('\n');
  const agentLines = req.agentCapacities
    .map((a) => `- agent ${a.agentId}: maxTotalTasks=${a.maxTotalTasks}`)
    .sort()
    .join('\n');
  const assignmentLines = assignments
    .map(([k, v]) => `- ${k} = ${v}`)
    .join('\n');

  return [
    'You are a constraint-verification analyst. A deterministic solver produced a',
    'binary assignment for a task-assignment QUBO problem. Analyze it. Do NOT',
    'propose a different assignment — only verify and explain this one.',
    '',
    'Constraints:',
    '1. Every task must be assigned to exactly one agent.',
    '2. No agent may exceed its maxTotalTasks capacity.',
    '',
    'Tasks:',
    taskLines,
    '',
    'Agents:',
    agentLines,
    '',
    'Assignment variables (1 = assigned, 0 = not assigned):',
    assignmentLines,
    '',
    'Respond with ONLY a JSON object, no other text:',
    '{',
    '  "violations": ["<constraint violated and why>", ...] (empty array if none),',
    '  "explanation": "<2-3 sentence analysis of the assignment>",',
    '  "suggestions": ["<optional improvement>", ...] (empty array if none)',
    '}',
  ].join('\n');
}

/** Parse the LLM's JSON reply; malformed output degrades to 'uncertain'. */
function parseAnalysisResponse(
  raw: string,
): Pick<
  LLMAnalysisResult,
  'verdict' | 'claimedViolations' | 'explanation' | 'suggestions' | 'failureReason'
> {
  // Models often wrap JSON in prose or code fences; extract the first object.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      verdict: 'uncertain',
      claimedViolations: [],
      explanation: raw.slice(0, 500),
      suggestions: [],
      failureReason: 'no JSON object found in LLM response',
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      violations?: unknown;
      explanation?: unknown;
      suggestions?: unknown;
    };

    const violations = Array.isArray(parsed.violations)
      ? parsed.violations.filter((v): v is string => typeof v === 'string')
      : [];
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string')
      : [];
    const explanation =
      typeof parsed.explanation === 'string' ? parsed.explanation : '';

    return {
      verdict: violations.length > 0 ? 'flags_violations' : 'agrees',
      claimedViolations: violations,
      explanation,
      suggestions,
    };
  } catch {
    return {
      verdict: 'uncertain',
      claimedViolations: [],
      explanation: raw.slice(0, 500),
      suggestions: [],
      failureReason: 'LLM response JSON failed to parse',
    };
  }
}
