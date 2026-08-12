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

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function extractFirstTopLogprobs(payload: any): Candidate[] {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      const entries = Array.isArray(part?.logprobs) ? part.logprobs : [];
      for (const entry of entries) {
        const top = Array.isArray(entry?.top_logprobs) ? entry.top_logprobs : [];
        const candidates = top
          .filter((x: any) => typeof x?.token === 'string' && Number.isFinite(x?.logprob))
          .map((x: any) => ({
            token: x.token,
            logprob: Number(x.logprob),
            bytes: Array.isArray(x.bytes) ? x.bytes.map(Number) : undefined,
          }));
        if (candidates.length >= 2) return candidates;
      }
    }
  }
  return [];
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

async function z3VerifyExactlyOne(solution: number[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('verified-topk-live');
  const solver = new ctx.Solver();
  const xs = solution.map((_, i) => ctx.Int.const(`token_${i}`));

  for (let i = 0; i < xs.length; i++) {
    solver.add(xs[i].ge(0));
    solver.add(xs[i].le(1));
    solver.add(xs[i].eq(solution[i]));
  }
  const sum = xs.slice(1).reduce((acc, x) => acc.add(x), xs[0]);
  solver.add(sum.eq(1));
  const status = await solver.check();
  let version = 'unknown';
  try {
    const v = Z3.get_version?.();
    if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
  } catch {}
  return { status: String(status), version };
}

describe('OpenAI real top-logprobs -> QUBO/Ising -> Z3', () => {
  it.skipIf(!RUN_LIVE)('uses real OpenAI top_logprobs and produces a replayable Z3-verified binary selection', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey, 'OPENAI_API_KEY is required for the live logprob probe').toBeTruthy();

    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: 'Reply with exactly one uppercase word meaning that a verification succeeded.',
        max_output_tokens: 16,
        top_logprobs: 8,
      }),
    });

    const payload = await response.json().catch(() => null) as any;
    expect(response.ok, `OpenAI HTTP ${response.status}: ${JSON.stringify(payload?.error ?? null)}`).toBe(true);

    const candidates = extractFirstTopLogprobs(payload).slice(0, 8);
    expect(candidates.length, 'Responses API did not return at least two top_logprobs candidates').toBeGreaterThanOrEqual(2);

    // Convert real model log probabilities into integer QUBO costs.
    // Higher log probability (closer to zero) -> lower cost.
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

    const z3 = await z3VerifyExactlyOne(first.solution);
    expect(z3.status).toBe('sat');

    const selectedIndex = selected[0];
    const argmaxIndex = candidates.reduce(
      (best, candidate, index) => candidate.logprob > candidates[best].logprob ? index : best,
      0,
    );

    const evidence = {
      schema: 'dsg-verified-topk-live-v1',
      source: 'openai-responses-top_logprobs',
      model,
      responseId: typeof payload?.id === 'string' ? payload.id : null,
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
        feasibility: z3.status,
        version: z3.version,
      },
    };

    const evidenceWithHash = { ...evidence, evidenceHash: sha256(evidence) };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/verified-topk-real-logprobs.json', `${JSON.stringify(evidenceWithHash, null, 2)}\n`);
    console.log('DSG_VERIFIED_TOPK_EVIDENCE', JSON.stringify(evidenceWithHash));
  }, 60_000);
});
