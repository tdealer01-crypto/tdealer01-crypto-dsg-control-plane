import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { init } from 'z3-solver';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';
const QUESTION = 'วิธีสร้างรายได้แบบอัตโนมัติ';
const SYSTEM = [
  'ตอบภาษาไทยแบบใช้งานได้จริง กระชับ และมุ่งเน้นโมเดลรายได้ที่ถูกกฎหมายและปลอดภัย',
  'ห้ามอ้างว่ารายได้การันตี ห้ามแนะนำสินค้าหรือบริการที่จำกัดอายุ การพนัน หรือกิจกรรมผิดกฎหมาย',
  'ควรครอบคลุม: โมเดลรายได้, ลูกค้า/ข้อเสนอ, acquisition, automation flow, payment/fulfillment, metrics, risks, และแผนเริ่มต้น',
].join(' ');

type Score = {
  relevance: number;
  revenueClarity: number;
  automationQuality: number;
  actionability: number;
  riskAndMetrics: number;
  total: number;
  feasible: boolean;
  reason: string;
};

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function chat(apiKey: string, model: string, temperature: number, n = 1): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: QUESTION },
      ],
      max_tokens: 700,
      temperature,
      n,
    }),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(payload?.error ?? null)}`);
  return (payload?.choices ?? []).map((choice: any) => String(choice?.message?.content ?? '').trim()).filter(Boolean);
}

async function judge(apiKey: string, model: string, answers: string[]): Promise<Score[]> {
  const rubric = `ให้คะแนนคำตอบแต่ละข้ออย่างอิสระ 0-20 ใน 5 หมวด: relevance, revenueClarity, automationQuality, actionability, riskAndMetrics รวม 100 คะแนน\nfeasible=false ถ้าคำตอบมีการันตีรายได้, กิจกรรมผิดกฎหมาย/จำกัดอายุ, ไม่มีโมเดลรายได้ที่นำไปทำได้, หรือไม่มี automation ที่ชัดเจน\nคืน JSON เท่านั้นรูปแบบ {"scores":[{"index":0,"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"riskAndMetrics":0,"total":0,"feasible":true,"reason":"..."}]}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: rubric },
        { role: 'user', content: JSON.stringify({ question: QUESTION, answers: answers.map((answer, index) => ({ index, answer })) }) },
      ],
      max_tokens: 1200,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(`Judge HTTP ${response.status}: ${JSON.stringify(payload?.error ?? null)}`);
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const raw = Array.isArray(parsed?.scores) ? parsed.scores : [];
  return raw.map((x: any) => ({
    relevance: Number(x.relevance),
    revenueClarity: Number(x.revenueClarity),
    automationQuality: Number(x.automationQuality),
    actionability: Number(x.actionability),
    riskAndMetrics: Number(x.riskAndMetrics),
    total: Number(x.total),
    feasible: Boolean(x.feasible),
    reason: String(x.reason ?? ''),
  }));
}

function makeExactlyOneQubo(costs: number[]) {
  const n = costs.length;
  const maxCost = Math.max(1, ...costs.map((x) => Math.abs(x)));
  const penalty = Math.max(10_000_000, maxCost * 100 + 1);
  const Q = Array.from({ length: n }, () => Array(n).fill(0));
  const linear = costs.slice();
  for (let i = 0; i < n; i++) {
    Q[i][i] = -penalty;
    for (let j = i + 1; j < n; j++) {
      Q[i][j] = penalty;
      Q[j][i] = penalty;
    }
  }
  return { Q, linear, penalty };
}

async function z3VerifyWinner(solution: number[], costs: number[], feasible: boolean[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('revenue-benchmark');
  const selectedIndex = solution.findIndex((bit) => bit === 1);
  const selectedCost = selectedIndex >= 0 ? costs[selectedIndex] : Number.MAX_SAFE_INTEGER;

  const feasibility = new ctx.Solver();
  const xs = solution.map((_, i) => ctx.Int.const(`selected_${i}`));
  for (let i = 0; i < xs.length; i++) {
    feasibility.add(xs[i].ge(0));
    feasibility.add(xs[i].le(1));
    feasibility.add(xs[i].eq(solution[i]));
    if (!feasible[i]) feasibility.add(xs[i].eq(0));
  }
  feasibility.add(xs.slice(1).reduce((acc, x) => acc.add(x), xs[0]).eq(1));
  const feasibilityStatus = String(await feasibility.check());

  const better = new ctx.Solver();
  const ys = solution.map((_, i) => ctx.Int.const(`better_${i}`));
  for (let i = 0; i < ys.length; i++) {
    better.add(ys[i].ge(0));
    better.add(ys[i].le(1));
    if (!feasible[i]) better.add(ys[i].eq(0));
  }
  better.add(ys.slice(1).reduce((acc, y) => acc.add(y), ys[0]).eq(1));
  const totalCost = ys.slice(1).reduce((acc, y, index) => acc.add(y.mul(costs[index + 1])), ys[0].mul(costs[0]));
  better.add(totalCost.lt(selectedCost));
  const betterExistsStatus = String(await better.check());

  let version = 'unknown';
  try {
    const v = Z3.get_version?.();
    if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
  } catch {}
  return { feasibilityStatus, betterExistsStatus, selectedIndex, selectedCost, version };
}

describe('Revenue automation: baseline vs verified candidate selection', () => {
  it.skipIf(!RUN_LIVE)('compares the same question using one baseline answer vs QUBO/Ising+Z3 reranking', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey).toBeTruthy();
    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    const baselineAnswers = await chat(apiKey!, model, 0, 1);
    expect(baselineAnswers.length).toBe(1);
    const candidates = await chat(apiKey!, model, 0.8, 8);
    expect(candidates.length).toBe(8);

    const allAnswers = [baselineAnswers[0], ...candidates];
    const scores = await judge(apiKey!, model, allAnswers);
    expect(scores.length).toBe(9);
    const baselineScore = scores[0];
    const candidateScores = scores.slice(1);

    const costs = candidateScores.map((score, index) => {
      const qualityCost = Math.max(0, 100 - Math.round(score.total)) * 1000;
      const infeasiblePenalty = score.feasible ? 0 : 10_000_000;
      return infeasiblePenalty + qualityCost + index;
    });
    const feasible = candidateScores.map((score) => score.feasible);
    expect(feasible.some(Boolean), 'At least one generated candidate must be feasible').toBe(true);

    const { Q, linear, penalty } = makeExactlyOneQubo(costs);
    const seed = 777;
    const first = solveQubo({ Q, linear, numVariables: candidates.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: candidates.length, seed }));
    const replayDeterministic = replays.every((result) =>
      result.energy === first.energy && JSON.stringify(result.solution) === JSON.stringify(first.solution));
    expect(replayDeterministic).toBe(true);

    const z3 = await z3VerifyWinner(first.solution, costs, feasible);
    expect(z3.feasibilityStatus).toBe('sat');
    const verifiedScore = candidateScores[z3.selectedIndex];
    const finalDecision = z3.betterExistsStatus === 'unsat' ? 'VERIFIED_POOL_OPTIMUM' : 'REJECTED_BETTER_CANDIDATE_EXISTS';

    const evidence = {
      schema: 'dsg-revenue-automation-benchmark-v1',
      question: QUESTION,
      model,
      scoring: {
        type: 'llm-judge-fixed-rubric',
        note: 'Scores are evaluator judgments, not mathematical truth. Z3 proves only feasibility/optimality over the frozen scored candidate pool.',
      },
      baseline: {
        answer: baselineAnswers[0],
        answerHash: sha256(baselineAnswers[0]),
        score: baselineScore,
      },
      verified: {
        poolSize: candidates.length,
        answers: candidates.map((answer, index) => ({ index, answer, answerHash: sha256(answer), score: candidateScores[index], cost: costs[index] })),
        qubo: {
          solverVersion: first.version,
          seed,
          penalty,
          solution: first.solution,
          energy: first.energy,
          evaluations: first.evaluations,
          selectedIndex: z3.selectedIndex,
        },
        selectedAnswer: candidates[z3.selectedIndex],
        selectedAnswerHash: sha256(candidates[z3.selectedIndex]),
        selectedScore: verifiedScore,
        deterministicReplay: { runs: 20, passed: replayDeterministic },
        z3: {
          feasibility: z3.feasibilityStatus,
          betterCandidateExists: z3.betterExistsStatus,
          finalDecision,
          version: z3.version,
        },
      },
      comparison: {
        baselineTotal: baselineScore.total,
        verifiedTotal: verifiedScore.total,
        delta: verifiedScore.total - baselineScore.total,
      },
    };

    const evidenceWithHash = { ...evidence, evidenceHash: sha256(evidence) };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/revenue-automation-baseline-vs-verified.json', `${JSON.stringify(evidenceWithHash, null, 2)}\n`);
    console.log('DSG_REVENUE_BENCHMARK_SUMMARY', JSON.stringify({
      baselineTotal: evidence.comparison.baselineTotal,
      verifiedTotal: evidence.comparison.verifiedTotal,
      delta: evidence.comparison.delta,
      selectedIndex: z3.selectedIndex,
      replay20: replayDeterministic,
      z3Feasibility: z3.feasibilityStatus,
      z3BetterCandidateExists: z3.betterExistsStatus,
      finalDecision,
      evidenceHash: evidenceWithHash.evidenceHash,
    }));
  }, 120_000);
});
