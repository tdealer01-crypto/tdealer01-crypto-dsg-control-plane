import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { init } from 'z3-solver';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';
const QUESTION = 'วิธีสร้างรายได้แบบอัตโนมัติ';
const MODEL_KEYS = ['digital_product', 'subscription_service', 'affiliate_content', 'lead_generation'] as const;
const CATEGORIES = ['offer', 'acquisition', 'automation', 'paymentFulfillment', 'retention', 'metricsRisk'] as const;

type ModelKey = typeof MODEL_KEYS[number];
type Category = typeof CATEGORIES[number];

type PlanCandidate = {
  modelKey: ModelKey;
  offer: string;
  acquisition: string;
  automation: string;
  paymentFulfillment: string;
  retention: string;
  metricsRisk: string;
};

type ComponentScore = {
  id: string;
  score: number;
  safe: boolean;
  reason: string;
};

type AnswerScore = {
  relevance: number;
  revenueClarity: number;
  automationQuality: number;
  actionability: number;
  riskAndMetrics: number;
  total: number;
  feasible: boolean;
  reason: string;
};

type Option = {
  variableIndex: number;
  candidateIndex: number;
  category: Category;
  modelKey: ModelKey;
  text: string;
  score: number;
  safe: boolean;
  linearCost: number;
};

const BASE_SYSTEM = [
  'ตอบภาษาไทยแบบใช้งานได้จริง กระชับ และมุ่งเน้นโมเดลรายได้ที่ถูกกฎหมายและปลอดภัย',
  'ห้ามอ้างว่ารายได้การันตี ห้ามแนะนำสินค้าหรือบริการที่จำกัดอายุ การพนัน หรือกิจกรรมผิดกฎหมาย',
  'ควรครอบคลุม: โมเดลรายได้, ลูกค้า/ข้อเสนอ, acquisition, automation flow, payment/fulfillment, metrics, risks, และแผนเริ่มต้น',
].join(' ');

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function openAIChat(apiKey: string, model: string, body: Record<string, unknown>) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, ...body }),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(payload?.error ?? null)}`);
  return payload;
}

async function baselineAnswer(apiKey: string, model: string): Promise<string> {
  const payload = await openAIChat(apiKey, model, {
    messages: [
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user', content: QUESTION },
    ],
    max_tokens: 900,
    temperature: 0,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

function isPlanCandidate(x: any): x is PlanCandidate {
  return MODEL_KEYS.includes(x?.modelKey)
    && CATEGORIES.every((key) => typeof x?.[key] === 'string' && x[key].trim().length > 0);
}

async function generatePlanCandidates(apiKey: string, model: string, n = 8): Promise<PlanCandidate[]> {
  const system = [
    BASE_SYSTEM,
    'สร้างหนึ่งแผนต่อคำตอบใน JSON เท่านั้น',
    `modelKey ต้องเป็นหนึ่งใน ${MODEL_KEYS.join(', ')}`,
    `ต้องมี keys: modelKey, ${CATEGORIES.join(', ')}`,
    'แต่ละ field เป็นองค์ประกอบที่สามารถนำไปผสมกับองค์ประกอบของแผนอื่นที่ modelKey เดียวกันได้',
    'ห้ามใส่คำอธิบายนอก JSON',
  ].join(' ');

  const payload = await openAIChat(apiKey, model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: QUESTION },
    ],
    max_tokens: 900,
    temperature: 0.9,
    n,
    response_format: { type: 'json_object' },
  });

  return (payload?.choices ?? [])
    .map((choice: any) => {
      try { return JSON.parse(String(choice?.message?.content ?? '{}')); } catch { return null; }
    })
    .filter(isPlanCandidate);
}

async function scoreComponents(apiKey: string, model: string, candidates: PlanCandidate[]): Promise<Map<string, ComponentScore>> {
  const items = candidates.flatMap((candidate, candidateIndex) =>
    CATEGORIES.map((category) => ({
      id: `${candidateIndex}:${category}`,
      candidateIndex,
      category,
      modelKey: candidate.modelKey,
      text: candidate[category],
    })));

  const rubric = [
    'ประเมินองค์ประกอบแต่ละรายการอย่างอิสระสำหรับคำถาม วิธีสร้างรายได้แบบอัตโนมัติ',
    'score 0-100 วัดความเกี่ยวข้อง ความชัดเจน ความอัตโนมัติ การนำไปทำได้ และความสมเหตุสมผล',
    'safe=false หากมีการันตีรายได้ กิจกรรมผิดกฎหมาย/จำกัดอายุ หรือแนวทางที่ไม่ปลอดภัย',
    'คืน JSON เท่านั้น: {"scores":[{"id":"0:offer","score":0,"safe":true,"reason":"..."}]}',
    'ต้องคืนครบทุก id',
  ].join(' ');

  const payload = await openAIChat(apiKey, model, {
    messages: [
      { role: 'system', content: rubric },
      { role: 'user', content: JSON.stringify({ question: QUESTION, items }) },
    ],
    max_tokens: 5000,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const scores = new Map<string, ComponentScore>();
  for (const raw of Array.isArray(parsed?.scores) ? parsed.scores : []) {
    const id = String(raw?.id ?? '');
    if (!id) continue;
    scores.set(id, {
      id,
      score: Math.max(0, Math.min(100, Math.round(Number(raw?.score) || 0))),
      safe: Boolean(raw?.safe),
      reason: String(raw?.reason ?? ''),
    });
  }
  return scores;
}

function buildOptions(candidates: PlanCandidate[], scoreMap: Map<string, ComponentScore>): Option[] {
  const options: Option[] = [];
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex];
    for (const category of CATEGORIES) {
      const score = scoreMap.get(`${candidateIndex}:${category}`);
      if (!score) throw new Error(`Missing component score ${candidateIndex}:${category}`);
      options.push({
        variableIndex: options.length,
        candidateIndex,
        category,
        modelKey: candidate.modelKey,
        text: candidate[category],
        score: score.score,
        safe: score.safe,
        // Soft objective only. Nothing is removed before QUBO/Ising.
        linearCost: (100 - score.score) * 100 + (score.safe ? 0 : 500_000) + candidateIndex,
      });
    }
  }
  return options;
}

function addSymmetricInteraction(Q: number[][], i: number, j: number, totalPenalty: number) {
  // Existing solver evaluates both Q[i][j] and Q[j][i]. Split the intended total penalty.
  const half = totalPenalty / 2;
  Q[i][j] += half;
  Q[j][i] += half;
}

function makeCompositionalQubo(options: Option[]) {
  const n = options.length;
  const Q = Array.from({ length: n }, () => Array(n).fill(0));
  const linear = options.map((option) => option.linearCost);
  const exactlyOnePenalty = 10_000_000;
  const modelMismatchPenalty = 100_000;

  // Exactly one component per category. This is optimization encoding, not a Z3 pre-gate.
  for (const category of CATEGORIES) {
    const indices = options.filter((o) => o.category === category).map((o) => o.variableIndex);
    for (const i of indices) Q[i][i] -= exactlyOnePenalty;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        addSymmetricInteraction(Q, indices[a], indices[b], exactlyOnePenalty * 2);
      }
    }
  }

  // Softly prefer a coherent business model while still leaving all possibilities in the search space.
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (options[i].category !== options[j].category && options[i].modelKey !== options[j].modelKey) {
        addSymmetricInteraction(Q, i, j, modelMismatchPenalty);
      }
    }
  }

  return { Q, linear, exactlyOnePenalty, modelMismatchPenalty };
}

function selectedOptions(solution: number[], options: Option[]): Option[] {
  return options.filter((option) => solution[option.variableIndex] === 1);
}

async function z3FinalVerifyAndProveOptimality(solution: number[], options: Option[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('revenue-compositional-final');

  const addHardConstraints = (solver: any, vars: any[]) => {
    for (const v of vars) {
      solver.add(v.ge(0));
      solver.add(v.le(1));
    }

    for (const category of CATEGORIES) {
      const indices = options.filter((o) => o.category === category).map((o) => o.variableIndex);
      const first = vars[indices[0]];
      const sum = indices.slice(1).reduce((acc, index) => acc.add(vars[index]), first);
      solver.add(sum.eq(1));
    }

    // Safety and model coherence are HARD only here, after Ising has searched the full pool.
    for (const option of options) {
      if (!option.safe) solver.add(vars[option.variableIndex].eq(0));
    }
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        if (options[i].category !== options[j].category && options[i].modelKey !== options[j].modelKey) {
          solver.add(vars[i].add(vars[j]).le(1));
        }
      }
    }
  };

  const feasibility = new ctx.Solver();
  const xs = options.map((_, i) => ctx.Int.const(`selected_${i}`));
  addHardConstraints(feasibility, xs);
  for (let i = 0; i < xs.length; i++) feasibility.add(xs[i].eq(solution[i]));
  const feasibilityStatus = String(await feasibility.check());

  const selectedLinearCost = options.reduce((sum, option) =>
    sum + (solution[option.variableIndex] === 1 ? option.linearCost : 0), 0);

  const better = new ctx.Solver();
  const ys = options.map((_, i) => ctx.Int.const(`better_${i}`));
  addHardConstraints(better, ys);
  const totalLinearCost = ys.slice(1).reduce(
    (acc, y, index) => acc.add(y.mul(options[index + 1].linearCost)),
    ys[0].mul(options[0].linearCost),
  );
  better.add(totalLinearCost.lt(selectedLinearCost));
  const betterExistsStatus = String(await better.check());

  let version = 'unknown';
  try {
    const v = Z3.get_version?.();
    if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
  } catch {}

  return { feasibilityStatus, betterExistsStatus, selectedLinearCost, version };
}

async function compileAnswer(apiKey: string, model: string, selected: Option[]): Promise<string> {
  const modelKey = selected[0]?.modelKey;
  const components = Object.fromEntries(selected.map((option) => [option.category, option.text]));
  const system = [
    BASE_SYSTEM,
    'คุณเป็น compiler เท่านั้น: เรียบเรียงองค์ประกอบที่ได้รับให้เป็นคำตอบเดียว',
    'ห้ามเปลี่ยนโมเดลธุรกิจ ห้ามเพิ่มการันตีรายได้ ห้ามเพิ่มตัวเลขหรือ claim ที่ไม่มีในองค์ประกอบ',
    'ทำให้ผู้ใช้อ่านแล้วรู้ว่าจะเริ่มอย่างไรและระบบอัตโนมัติไหลอย่างไร',
  ].join(' ');
  const payload = await openAIChat(apiKey, model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify({ question: QUESTION, modelKey, components }) },
    ],
    max_tokens: 1000,
    temperature: 0,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

async function judgeAnswersOnce(apiKey: string, model: string, answers: string[]): Promise<AnswerScore[]> {
  const rubric = [
    'ให้คะแนนคำตอบแต่ละข้ออย่างอิสระ 0-20 ใน 5 หมวด: relevance, revenueClarity, automationQuality, actionability, riskAndMetrics รวม 100 คะแนน',
    'feasible=false ถ้ามีการันตีรายได้ กิจกรรมผิดกฎหมาย/จำกัดอายุ ไม่มีโมเดลรายได้ที่นำไปทำได้ หรือไม่มี automation ที่ชัดเจน',
    'ห้ามให้คะแนนตามตำแหน่งคำตอบหรือรู้ว่าคำตอบใดเป็น baseline',
    'คืน JSON เท่านั้น {"scores":[{"index":0,"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"riskAndMetrics":0,"total":0,"feasible":true,"reason":"..."}]}',
  ].join(' ');
  const payload = await openAIChat(apiKey, model, {
    messages: [
      { role: 'system', content: rubric },
      { role: 'user', content: JSON.stringify({ question: QUESTION, answers: answers.map((answer, index) => ({ index, answer })) }) },
    ],
    max_tokens: 1500,
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return (Array.isArray(parsed?.scores) ? parsed.scores : []).map((x: any) => ({
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

async function judgeAnswers3x(apiKey: string, model: string, baseline: string, composite: string) {
  const passes: AnswerScore[][] = [];
  // Two normal-order passes and one reversed-order pass reduce obvious position dependence.
  passes.push(await judgeAnswersOnce(apiKey, model, [baseline, composite]));
  passes.push(await judgeAnswersOnce(apiKey, model, [baseline, composite]));
  const reversed = await judgeAnswersOnce(apiKey, model, [composite, baseline]);
  passes.push([reversed[1], reversed[0]]);

  const average = (index: number): AnswerScore => {
    const values = passes.map((pass) => pass[index]);
    const mean = (key: keyof Pick<AnswerScore, 'relevance' | 'revenueClarity' | 'automationQuality' | 'actionability' | 'riskAndMetrics' | 'total'>) =>
      Math.round((values.reduce((sum, value) => sum + Number(value[key]), 0) / values.length) * 100) / 100;
    return {
      relevance: mean('relevance'),
      revenueClarity: mean('revenueClarity'),
      automationQuality: mean('automationQuality'),
      actionability: mean('actionability'),
      riskAndMetrics: mean('riskAndMetrics'),
      total: mean('total'),
      feasible: values.every((value) => value.feasible),
      reason: values.map((value) => value.reason).join(' | '),
    };
  };

  return { passes, baseline: average(0), composite: average(1) };
}

async function z3FinalChoose(baseline: AnswerScore, composite: AnswerScore) {
  const { Context } = await init();
  const ctx = Context('revenue-final-choice');
  const solver = new ctx.Solver();
  const useBaseline = ctx.Int.const('use_baseline');
  const useComposite = ctx.Int.const('use_composite');
  for (const v of [useBaseline, useComposite]) {
    solver.add(v.ge(0));
    solver.add(v.le(1));
  }
  solver.add(useBaseline.add(useComposite).eq(1));
  if (!baseline.feasible) solver.add(useBaseline.eq(0));
  if (!composite.feasible) solver.add(useComposite.eq(0));

  // Verified improvement-or-fallback rule. No candidate was pre-removed by Z3.
  if (baseline.feasible && composite.feasible) {
    if (composite.total >= baseline.total) solver.add(useComposite.eq(1));
    else solver.add(useBaseline.eq(1));
  } else if (composite.feasible) {
    solver.add(useComposite.eq(1));
  } else if (baseline.feasible) {
    solver.add(useBaseline.eq(1));
  }

  const status = String(await solver.check());
  if (status !== 'sat') return { status, decision: 'BLOCK_NO_VERIFIED_ANSWER' };
  const model = solver.model();
  const compositeValue = Number(model.eval(useComposite).toString());
  return { status, decision: compositeValue === 1 ? 'USE_COMPOSITE' : 'USE_BASELINE' };
}

describe('Revenue automation: baseline + compositional QUBO/Ising + final-only Z3', () => {
  it.skipIf(!RUN_LIVE)('keeps all possibilities through Ising, then lets Z3 verify/choose at the end', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey).toBeTruthy();
    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    const baseline = await baselineAnswer(apiKey!, model);
    expect(baseline.length).toBeGreaterThan(0);

    const candidates = await generatePlanCandidates(apiKey!, model, 8);
    expect(candidates.length, 'Need at least 6 valid structured plans').toBeGreaterThanOrEqual(6);

    const componentScoreMap = await scoreComponents(apiKey!, model, candidates);
    expect(componentScoreMap.size).toBe(candidates.length * CATEGORIES.length);
    const options = buildOptions(candidates, componentScoreMap);

    const { Q, linear, exactlyOnePenalty, modelMismatchPenalty } = makeCompositionalQubo(options);
    const seed = 777;
    const first = solveQubo({ Q, linear, numVariables: options.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: options.length, seed }));
    const replayDeterministic = replays.every((result) =>
      result.energy === first.energy && JSON.stringify(result.solution) === JSON.stringify(first.solution));
    expect(replayDeterministic).toBe(true);

    // IMPORTANT: Z3 is first invoked only AFTER QUBO/Ising returns its solution.
    const z3Plan = await z3FinalVerifyAndProveOptimality(first.solution, options);
    expect(z3Plan.feasibilityStatus, 'Ising winner must satisfy final Z3 constraints').toBe('sat');
    const selected = selectedOptions(first.solution, options);
    expect(selected.length).toBe(CATEGORIES.length);

    const compileRuns = [
      await compileAnswer(apiKey!, model, selected),
      await compileAnswer(apiKey!, model, selected),
      await compileAnswer(apiKey!, model, selected),
    ];
    const compileHashes = compileRuns.map(sha256);
    const compileReplayIdentical = compileHashes.every((hash) => hash === compileHashes[0]);
    const composite = compileRuns[0];

    const judged = await judgeAnswers3x(apiKey!, model, baseline, composite);
    const finalZ3 = await z3FinalChoose(judged.baseline, judged.composite);
    expect(finalZ3.status).toBe('sat');

    const evidence = {
      schema: 'dsg-revenue-compositional-final-z3-v2',
      question: QUESTION,
      model,
      architecture: {
        z3PreGate: false,
        flow: 'baseline + full LLM component pool -> binary QUBO/Ising -> final Z3 plan verification -> compile -> 3-pass scoring -> final Z3 improvement-or-fallback',
      },
      baseline: {
        answer: baseline,
        answerHash: sha256(baseline),
        score: judged.baseline,
      },
      candidatePool: {
        planCount: candidates.length,
        optionCount: options.length,
        modelKeys: candidates.map((candidate) => candidate.modelKey),
        candidates,
      },
      quboIsing: {
        solverVersion: first.version,
        seed,
        exactlyOnePenalty,
        modelMismatchPenalty,
        energy: first.energy,
        evaluations: first.evaluations,
        selectedBits: first.solution,
        selectedComponents: selected,
        deterministicReplay: { runs: 20, passed: replayDeterministic },
      },
      z3PlanFinal: {
        feasibility: z3Plan.feasibilityStatus,
        betterHardValidCombinationExists: z3Plan.betterExistsStatus,
        selectedLinearCost: z3Plan.selectedLinearCost,
        version: z3Plan.version,
      },
      composite: {
        answer: composite,
        answerHash: sha256(composite),
        compileReplay: { runs: 3, identical: compileReplayIdentical, hashes: compileHashes },
        score: judged.composite,
      },
      scoring: {
        type: '3-pass-llm-judge-fixed-rubric-with-reversed-order-pass',
        note: 'Scores are evaluator judgments, not mathematical truth. Z3 proves formal constraints over the frozen structured data and applies the explicit final selection rule.',
        passes: judged.passes,
      },
      comparison: {
        baselineTotal: judged.baseline.total,
        compositeTotal: judged.composite.total,
        delta: Math.round((judged.composite.total - judged.baseline.total) * 100) / 100,
        finalZ3Decision: finalZ3.decision,
        deliveredTotal: finalZ3.decision === 'USE_COMPOSITE' ? judged.composite.total : judged.baseline.total,
        qualityRegressionPrevented: finalZ3.decision === 'USE_BASELINE' && judged.composite.total < judged.baseline.total,
      },
    };

    const evidenceWithHash = { ...evidence, evidenceHash: sha256(evidence) };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/revenue-automation-baseline-vs-verified.json', `${JSON.stringify(evidenceWithHash, null, 2)}\n`);
    console.log('DSG_REVENUE_COMPOSITIONAL_SUMMARY', JSON.stringify({
      baselineTotal: evidence.comparison.baselineTotal,
      compositeTotal: evidence.comparison.compositeTotal,
      delta: evidence.comparison.delta,
      deliveredTotal: evidence.comparison.deliveredTotal,
      finalZ3Decision: evidence.comparison.finalZ3Decision,
      z3PlanFeasibility: z3Plan.feasibilityStatus,
      z3BetterHardValidCombinationExists: z3Plan.betterExistsStatus,
      selectedModelKey: selected[0]?.modelKey,
      selectedCandidateIndices: selected.map((option) => option.candidateIndex),
      replay20: replayDeterministic,
      compileReplay3Identical: compileReplayIdentical,
      evidenceHash: evidenceWithHash.evidenceHash,
    }));
  }, 180_000);
});
