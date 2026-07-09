/**
 * Tests: Ising LLM Advisory Verifier + DSG Policy Gate
 *
 * Verifies the Option-B architecture invariants:
 * - LLM is advisory only: it never changes the solution or the verdict
 * - Deterministic solver verdict always decides validity
 * - Disagreement produces a review flag, never an auto-override
 * - Transport/parse failures degrade gracefully (never throw)
 * - All network calls are mocked — no real API usage in CI
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeSolutionWithLLM,
  buildAnalysisPrompt,
  gateWithDSG,
  resolveLLMVerifierConfig,
  DEFAULT_LLM_VERIFIER_MODEL,
  type LLMAnalysisRequest,
  type LLMAnalysisResult,
} from '../lib/dsg-one/ising-llm-verifier';
import type { Z3VerificationResult } from '../lib/dsg-one/ising-to-z3-verifier';
import { buildQUBOMatrix } from '../lib/dsg-one/qubo-builder';
import type { Task, AgentCapacity } from '../lib/dsg/multi-agent/types';

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Payment',
    domain: 'financial',
    operation: 'transfer',
    target: 'acct-1',
    dataSensitivity: 'high',
    externalEffect: true,
    reversibility: 'reversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: true,
  },
  {
    id: 'task-2',
    name: 'Audit',
    domain: 'compliance',
    operation: 'write',
    target: 'log',
    dataSensitivity: 'medium',
    externalEffect: false,
    reversibility: 'irreversible',
    userAuthorized: true,
    planAllowed: true,
    hasFreshEvidence: true,
    hasRollback: false,
  },
] as Task[];

const agents: AgentCapacity[] = [
  { agentId: 1, maxConcurrentTasks: 2, maxTotalTasks: 2, resourceAvailable: { cpu: 4, memory: 8 } },
  { agentId: 2, maxConcurrentTasks: 2, maxTotalTasks: 1, resourceAvailable: { cpu: 2, memory: 4 } },
] as AgentCapacity[];

async function makeRequest(): Promise<LLMAnalysisRequest> {
  const { qubo: quboMatrix } = await buildQUBOMatrix({
    tasks,
    agentCapacities: agents,
  });
  const solution: Record<string, number> = {};
  for (const v of quboMatrix.variables) solution[v.id] = 0;
  // Assign task-1 → agent 1, task-2 → agent 2
  const v1 = quboMatrix.variables.find(
    (v) => v.taskId === 'task-1' && v.agentId === 1,
  );
  const v2 = quboMatrix.variables.find(
    (v) => v.taskId === 'task-2' && v.agentId === 2,
  );
  if (v1) solution[v1.id] = 1;
  if (v2) solution[v2.id] = 1;
  return { solution, quboMatrix, tasks, agentCapacities: agents };
}

function llmChatResponse(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response;
}

const validDeterministic: Z3VerificationResult = {
  isSAT: 'sat',
  isValid: true,
  verifyTimeMs: 5,
  proof: 'SAT: verified',
  proofHash: 'proof-hash-sat',
  z3Version: 'z3-solver-wasm',
};

const invalidDeterministic: Z3VerificationResult = {
  isSAT: 'unsat',
  isValid: false,
  verifyTimeMs: 5,
  proof: 'UNSAT: violated',
  proofHash: 'proof-hash-unsat',
  violatedConstraints: ['task_task-1_count == 1 (got 0)'],
  z3Version: 'z3-solver-wasm',
};

describe('resolveLLMVerifierConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when advisory mode is not enabled', () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', '');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    expect(resolveLLMVerifierConfig()).toBeNull();
  });

  it('returns null when no API key is present', () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', '');
    vi.stubEnv('NVIDIA_ISING_API_KEY', '');
    expect(resolveLLMVerifierConfig()).toBeNull();
  });

  it('resolves defaults when enabled with a key', () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    const config = resolveLLMVerifierConfig();
    expect(config?.model).toBe(DEFAULT_LLM_VERIFIER_MODEL);
    expect(config?.url).toContain('integrate.api.nvidia.com');
  });

  it('falls back to legacy NVIDIA_ISING_API_KEY', () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', '');
    vi.stubEnv('NVIDIA_ISING_API_KEY', 'nvapi-legacy');
    expect(resolveLLMVerifierConfig()?.apiKey).toBe('nvapi-legacy');
  });
});

describe('analyzeSolutionWithLLM', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns unavailable (and does not call fetch) when not configured', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('unavailable');
    expect(result.failureReason).toContain('not configured');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.responseHash).toBe('');
  });

  it('returns agrees when LLM reports no violations', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        llmChatResponse(
          JSON.stringify({
            violations: [],
            explanation: 'Each task is assigned to exactly one agent within capacity.',
            suggestions: [],
          }),
        ),
      ),
    );

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('agrees');
    expect(result.claimedViolations).toEqual([]);
    expect(result.explanation).toContain('exactly one agent');
    expect(result.model).toBe(DEFAULT_LLM_VERIFIER_MODEL);
    expect(result.responseHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns flags_violations when LLM claims violations', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        llmChatResponse(
          'Analysis follows:\n' +
            JSON.stringify({
              violations: ['agent 2 exceeds maxTotalTasks'],
              explanation: 'Capacity issue detected.',
              suggestions: ['reassign task-2 to agent 1'],
            }),
        ),
      ),
    );

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('flags_violations');
    expect(result.claimedViolations).toEqual(['agent 2 exceeds maxTotalTasks']);
    expect(result.suggestions).toEqual(['reassign task-2 to agent 1']);
  });

  it('degrades to uncertain on unparseable LLM output', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(llmChatResponse('The assignment looks fine to me!')),
    );

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('uncertain');
    expect(result.failureReason).toContain('no JSON object');
  });

  it('degrades to unavailable on HTTP error without throwing', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429 } as Response),
    );

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('unavailable');
    expect(result.failureReason).toContain('429');
  });

  it('degrades to unavailable on network failure without throwing', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const result = await analyzeSolutionWithLLM(await makeRequest());

    expect(result.verdict).toBe('unavailable');
    expect(result.failureReason).toContain('ECONNREFUSED');
  });

  it('never mutates the input solution', async () => {
    vi.stubEnv('NVIDIA_LLM_VERIFIER_MODE', 'advisory');
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        llmChatResponse(
          JSON.stringify({
            violations: ['bogus claim'],
            explanation: 'x',
            suggestions: ['flip variable v0 to 1'],
          }),
        ),
      ),
    );

    const req = await makeRequest();
    const snapshot = JSON.stringify(req.solution);
    await analyzeSolutionWithLLM(req);

    expect(JSON.stringify(req.solution)).toBe(snapshot);
  });

  it('produces a deterministic prompt for identical input', async () => {
    const p1 = buildAnalysisPrompt(await makeRequest());
    const p2 = buildAnalysisPrompt(await makeRequest());
    expect(p1).toBe(p2);
    expect(p1).toContain('Do NOT');
  });
});

describe('gateWithDSG (DSG Policy Gate)', () => {
  const llmAgrees: LLMAnalysisResult = {
    verdict: 'agrees',
    claimedViolations: [],
    explanation: 'ok',
    suggestions: [],
    analysisTimeMs: 10,
    model: DEFAULT_LLM_VERIFIER_MODEL,
    promptHash: 'p'.repeat(64),
    responseHash: 'r'.repeat(64),
  };

  it('confirms when deterministic solver and LLM both approve', () => {
    const gate = gateWithDSG(validDeterministic, llmAgrees);
    expect(gate.status).toBe('confirmed');
    expect(gate.deterministicValid).toBe(true);
    expect(gate.gateProofHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('flags for review on disagreement — deterministic verdict stands', () => {
    const gate = gateWithDSG(validDeterministic, {
      ...llmAgrees,
      verdict: 'flags_violations',
      claimedViolations: ['claimed capacity violation'],
    });
    expect(gate.status).toBe('flagged_for_review');
    // The LLM does NOT flip validity:
    expect(gate.deterministicValid).toBe(true);
    expect(gate.rationale).toContain('Deterministic verdict stands');
  });

  it('rejects when deterministic solver says UNSAT, regardless of LLM opinion', () => {
    const gate = gateWithDSG(invalidDeterministic, llmAgrees);
    expect(gate.status).toBe('rejected');
    expect(gate.deterministicValid).toBe(false);
    expect(gate.rationale).toContain('cannot override');
  });

  it('falls back to deterministic_only when LLM is unavailable', () => {
    const gate = gateWithDSG(validDeterministic, {
      ...llmAgrees,
      verdict: 'unavailable',
      responseHash: '',
      failureReason: 'not configured',
    });
    expect(gate.status).toBe('deterministic_only');
    expect(gate.deterministicValid).toBe(true);
  });

  it('falls back to deterministic_only when LLM output is uncertain', () => {
    const gate = gateWithDSG(validDeterministic, {
      ...llmAgrees,
      verdict: 'uncertain',
      failureReason: 'parse error',
    });
    expect(gate.status).toBe('deterministic_only');
  });

  it('produces a stable gate proof hash for identical inputs', () => {
    const g1 = gateWithDSG(validDeterministic, llmAgrees);
    const g2 = gateWithDSG(validDeterministic, llmAgrees);
    expect(g1.gateProofHash).toBe(g2.gateProofHash);
  });
});
