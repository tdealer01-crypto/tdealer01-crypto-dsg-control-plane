import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { init } from 'z3-solver';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';

type Candidate = {
  token: string;
  logprob: number;
  bytes?: number[];
};

type CandidateSource = {
  endpoint: 'responses' | 'chat.completions';
  responseId: string | null;
  candidates: Candidate[];
};

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';
const PROMPT = 'Reply with exactly one uppercase word meaning that a verification succeeded.';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeCandidates(values: any[]): Candidate[] {
  return values
    .filter((x: any) => typeof x?.token === 'string' && Number.isFinite(x?.logprob))
    .map((x: any) => ({
      token: x.token,
      logprob: Number(x.logprob),
      bytes: Array.isArray(x.bytes) ? x.bytes.map(Number) : undefined,
    }));
}

function extractResponsesTopLogprobs(payload: any): Candidate[] {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const entries = Array.isArray(part?.logprobs) ? part.logprobs : [];
      for (const entry of entries) {
        const top = Array.isArray(entry?.top_logprobs) ? entry.top_logprobs : [];
        const candidates = normalizeCandidates(top);
        if (candidates.length >= 2) return candidates;
      }
      // Defensive support for implementations that expose the candidates directly.
      const direct = normalizeCandidates(entries);
      if (direct.length >= 2) return direct;
    }
  }
  return [];
}

function extractChatTopLogprobs(payload: any): Candidate[] {
  const content = payload?.choices?.[0]?.logprobs?.content;
  if (!Array.isArray(content)) return [];
  for (const entry of content) {
    const top = Array.isArray(entry?.top_logprobs) ? entry.top_logprobs : [];
    const candidates = normalizeCandidates(top);
    if (candidates.length >= 2) return candidates;
  }
  return [];
}

async function fetchRealCandidates(apiKey: string, model: string): Promise<CandidateSource> {
  const headers = {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  };

  const responses = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: PROMPT,
      max_output_tokens: 16,
      top_logprobs: 8,
    }),
  });
  const responsesPayload = await responses.json().catch(() => null) as any;
  if (!responses.ok) {
    throw new Error(`OpenAI Responses HTTP ${responses.status}: ${JSON.stringify(responsesPayload?.error ?? null)}`);
  }

  const responsesCandidates = extractResponsesTopLogprobs(responsesPayload).slice(0, 8);
  if (responsesCandidates.length >= 2) {
    return {
      endpoint: 'responses',
      responseId: typeof responsesPayload?.id === 'string' ? responsesPayload.id : null,
      candidates: responsesCandidates,
    };
  }

  // Fallback to Chat Completions because it exposes token-level logprobs with
  // logprobs=true + top_logprobs=N on models that support the legacy endpoint.
  const chat = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 8,
      temperature: 0,
      logprobs: true,
      top_logprobs: 8,
    }),
  });
  const chatPayload = await chat.json().catch(() => null) as any;
  if (!chat.ok) {
    throw new Error(`OpenAI Chat Completions HTTP ${chat.status}: ${JSON.stringify(chatPayload?.error ?? null)}`);
  }

  return {
    endpoint: 'chat.completions',
    responseId: typeof chatPayload?.id === 'string' ? chatPayload.id : null,
    candidates: extractChatTopLogprobs(chatPayload).slice(0, 8),
  };
}

function makeExactlyOneQubo(costs: number[]) {
  const n = costs.length;
  const maxCost = Math.max(1, ...costs.map((x) => Math.abs(x)));
  const penalty = Math.max(10_000_000, maxCost * 100 + 1);
  const Q = Array.from({ length: n }, () => Array(n).fill(0));
  const linear = costs.slice();

  // penalty * (sum(x)-1)^2, ignoring the constant term.
  // Existing solver evaluates x^T Q x + linear^T x and counts both Q[i][j]
  // and Q[j][i], so symmetric off-diagonal entries are `penalty`.
  for (let i = 0; i < n; i++) {
    Q[i][i] = -penalty;
    for (let j = i + 1; j < n; j++) {
      Q[i][j] = penalty;
      Q[j][i] = penalty;
    }
  }
  return { Q, linear, penalty };
}

async function z3VerifyExactlyOneAndOptimality(solution: number[], costs: number[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('verified-topk-live');

  const feasibility = new ctx.Solver();
  const xs = solution.map((_, i) => ctx.Int.const(`token_${i}`));
  for (let i = 0; i < xs.length; i++) {
    feasibility.add(xs[i].ge(0));
    feasibility.add(xs[i].le(1));
    feasibility.add(xs[i].eq(solution[i]));
  }
  const pinnedSum = xs.slice(1).reduce((acc, x) => acc.add(x), xs[0]);
  feasibility.add(pinnedSum.eq(1));
  const feasibilityStatus = String(await feasibility.check());

  const selectedIndex = solution.findIndex((bit) => bit === 1);
  const selectedCost = selectedIndex >= 0 ? costs[selectedIndex] : Number.MAX_SAFE_INTEGER;

  const better = new ctx.Solver();
  const ys = solution.map((_, i) => ctx.Int.const(`better_token_${i}`));
  for (const y of ys) {
    better.add(y.ge(0));
    better.add(y.le(1));
  }
  const betterSum = ys.slice(1).reduce((acc, y) => acc.add(y), ys[0]);
  better.add(betterSum.eq(1));
  const totalCost = ys
    .slice(1)
    .reduce((acc, y, index) => acc.add(y.mul(costs[index + 1])), ys[0].mul(costs[0]));
  better.add(totalCost.lt(selectedCost));
  const betterExistsStatus = String(await better.check());

  let version = 'unknown';
  try {
    const v = Z3.get_version?.();
    if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
  } catch {}

  return {
    feasibilityStatus,
    betterExistsStatus,
    selectedCost,
    version,
  };
}

describe('OpenAI real top-logprobs -> QUBO/Ising -> Z3', () => {
  it.skipIf(!RUN_LIVE)('uses real OpenAI top_logprobs and produces a replayable Z3-verified binary selection', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey, 'OPENAI_API_KEY is required for the live logprob probe').toBeTruthy();

    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
    const source = await fetchRealCandidates(apiKey!, model);
    const candidates = source.candidates;
    expect(candidates.length, 'OpenAI did not return at least two real top_logprobs candidates').toBeGreaterThanOrEqual(2);

    // Higher log probability (closer to zero) -> lower integer QUBO cost.
    const costs = candidates.map((candidate) => Math.max(0, Math.round(-candidate.logprob * 1_000_000)));
    const { Q, linear, penalty } = makeExactlyOneQubo(costs);
    const seed = 777;

    const first = solveQubo({ Q, linear, numVariables: candidates.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: candidates.length, seed }));
    const replayDeterministic = replays.every(
      (result) => result.energy === first.energy && JSON.stringify(result.solution) === JSON.stringify(first.solution),
    );
    expect(replayDeterministic).toBe(true);

    const selected = first.solution.flatMap((bit, index) => bit === 1 ? [index] : []);
    expect(selected.length, 'QUBO solution must be exactly one-hot before Z3').toBe(1);

    const z3 = await z3VerifyExactlyOneAndOptimality(first.solution, costs);
    expect(z3.feasibilityStatus).toBe('sat');

    const selectedIndex = selected[0];
    const argmaxIndex = candidates.reduce(
      (best, candidate, index) => candidate.logprob > candidates[best].logprob ? index : best,
      0,
    );
    const finalDecision = z3.betterExistsStatus === 'unsat'
      ? 'VERIFIED_TOPK_OPTIMUM'
      : 'REJECTED_BETTER_CANDIDATE_EXISTS';

    const evidence = {
      schema: 'dsg-verified-topk-live-v2',
      source: `openai-${source.endpoint}-top_logprobs`,
      model,
      responseId: source.responseId,
      topLogprobsCount: candidates.length,
      candidates,
      binaryEncoding: 'one-hot',
      integerCostScale: 1_000_000,
      qubo: {
        solverVersion: first.version,
        seed,
        penalty,
        solution: first.solution,
        energy: first.energy,
        evaluations: first.evaluations,
        selectedIndex,
        selectedToken: candidates[selectedIndex]?.token,
        selectedLogprob: candidates[selectedIndex]?.logprob,
        argmaxIndex,
        argmaxToken: candidates[argmaxIndex]?.token,
        matchedArgmax: selectedIndex === argmaxIndex,
      },
      deterministicReplay: {
        runs: 20,
        passed: replayDeterministic,
      },
      z3: {
        feasibility: z3.feasibilityStatus,
        betterCandidateExists: z3.betterExistsStatus,
        selectedCost: z3.selectedCost,
        finalDecision,
        version: z3.version,
      },
    };

    const evidenceWithHash = { ...evidence, evidenceHash: sha256(evidence) };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/verified-topk-real-logprobs.json', `${JSON.stringify(evidenceWithHash, null, 2)}\n`);
    console.log('DSG_VERIFIED_TOPK_EVIDENCE', JSON.stringify(evidenceWithHash));
  }, 60_000);
});
