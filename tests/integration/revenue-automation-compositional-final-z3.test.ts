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
type Plan = Record<Category, string> & { modelKey: ModelKey };
type ComponentRating = { score: number; safe: boolean; reason: string };
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

const SYSTEM = [
  'ตอบภาษาไทยแบบใช้งานได้จริงและถูกกฎหมาย',
  'ห้ามการันตีรายได้ การพนัน สินค้าจำกัดอายุ หรือกิจกรรมผิดกฎหมาย',
  'เน้นโมเดลรายได้ ลูกค้า acquisition automation payment/fulfillment metrics risks และขั้นเริ่มต้น',
].join(' ');

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function chat(apiKey: string, model: string, body: Record<string, unknown>) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, ...body }),
  });
  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(payload?.error ?? null)}`);
  return payload;
}

async function makeBaseline(apiKey: string, model: string) {
  const payload = await chat(apiKey, model, {
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: QUESTION }],
    temperature: 0,
    max_tokens: 900,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

function validPlan(x: any): x is Plan {
  return MODEL_KEYS.includes(x?.modelKey)
    && CATEGORIES.every((category) => typeof x?.[category] === 'string' && x[category].trim().length > 0);
}

async function makePlanPool(apiKey: string, model: string): Promise<Plan[]> {
  const prompt = [
    SYSTEM,
    'สร้าง candidate plan 8 ชุดใน JSON เดียว รูปแบบ {"plans":[...]} เท่านั้น',
    `modelKey ใช้ได้เฉพาะ ${MODEL_KEYS.join(', ')}`,
    'ต้องมีอย่างละ 2 plans ต่อ modelKey รวม 8 plans',
    `ทุก plan ต้องมี fields: modelKey, ${CATEGORIES.join(', ')}`,
    'แต่ละ field ต้องเป็นองค์ประกอบที่นำไปผสมกับ plan อื่นที่ modelKey เดียวกันได้',
  ].join(' ');
  const payload = await chat(apiKey, model, {
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: QUESTION }],
    temperature: 0.7,
    max_tokens: 5000,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const plans = (Array.isArray(parsed?.plans) ? parsed.plans : []).filter(validPlan);
  return plans.slice(0, 8);
}

async function rateCategory(apiKey: string, model: string, category: Category, plans: Plan[]) {
  const items = plans.map((plan, index) => ({ index, modelKey: plan.modelKey, text: plan[category] }));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: [
          `ประเมินเฉพาะองค์ประกอบหมวด ${category} สำหรับคำถาม ${QUESTION}`,
          'score 0-100 วัดความเกี่ยวข้อง ความชัดเจน ความอัตโนมัติ และการนำไปทำได้',
          'safe=false ถ้ามีการันตีรายได้ ผิดกฎหมาย จำกัดอายุ หรือไม่ปลอดภัย',
          'คืน JSON เท่านั้น {"ratings":[{"index":0,"score":0,"safe":true,"reason":"..."}]} และต้องครบทุก index',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(items) },
    ],
    temperature: 0,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const ratings = new Map<number, ComponentRating>();
  for (const raw of Array.isArray(parsed?.ratings) ? parsed.ratings : []) {
    const index = Number(raw?.index);
    if (!Number.isInteger(index) || index < 0 || index >= plans.length) continue;
    ratings.set(index, {
      score: Math.max(0, Math.min(100, Math.round(Number(raw?.score) || 0))),
      safe: Boolean(raw?.safe),
      reason: String(raw?.reason ?? ''),
    });
  }
  return ratings;
}

async function buildOptions(apiKey: string, model: string, plans: Plan[]): Promise<Option[]> {
  const byCategory = new Map<Category, Map<number, ComponentRating>>();
  for (const category of CATEGORIES) byCategory.set(category, await rateCategory(apiKey, model, category, plans));

  const options: Option[] = [];
  for (let candidateIndex = 0; candidateIndex < plans.length; candidateIndex++) {
    for (const category of CATEGORIES) {
      const rating = byCategory.get(category)?.get(candidateIndex);
      if (!rating) throw new Error(`Missing rating for ${candidateIndex}:${category}`);
      options.push({
        variableIndex: options.length,
        candidateIndex,
        category,
        modelKey: plans[candidateIndex].modelKey,
        text: plans[candidateIndex][category],
        score: rating.score,
        safe: rating.safe,
        // Soft objective only: no Z3 pre-gating and no option is removed.
        linearCost: (100 - rating.score) * 100 + (rating.safe ? 0 : 500_000) + candidateIndex,
      });
    }
  }
  return options;
}

function addPair(Q: number[][], i: number, j: number, totalPenalty: number) {
  Q[i][j] += totalPenalty / 2;
  Q[j][i] += totalPenalty / 2;
}

function makeQubo(options: Option[]) {
  const Q = Array.from({ length: options.length }, () => Array(options.length).fill(0));
  const linear = options.map((option) => option.linearCost);
  const onePenalty = 10_000_000;
  const mismatchPenalty = 100_000;

  for (const category of CATEGORIES) {
    const indices = options.filter((o) => o.category === category).map((o) => o.variableIndex);
    for (const i of indices) Q[i][i] -= onePenalty;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) addPair(Q, indices[a], indices[b], onePenalty * 2);
    }
  }
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (options[i].category !== options[j].category && options[i].modelKey !== options[j].modelKey) {
        addPair(Q, i, j, mismatchPenalty);
      }
    }
  }
  return { Q, linear, onePenalty, mismatchPenalty };
}

function bitsToOptions(bits: number[], options: Option[]) {
  return options.filter((option) => bits[option.variableIndex] === 1);
}

async function finalZ3Optimize(isingBits: number[], options: Option[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('final-z3-compositional');

  const addHard = (solver: any, vars: any[]) => {
    for (const v of vars) { solver.add(v.ge(0)); solver.add(v.le(1)); }
    for (const category of CATEGORIES) {
      const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex);
      const sum = idx.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[idx[0]]);
      solver.add(sum.eq(1));
    }
    for (const option of options) if (!option.safe) solver.add(vars[option.variableIndex].eq(0));
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        if (options[i].category !== options[j].category && options[i].modelKey !== options[j].modelKey) {
          solver.add(vars[i].add(vars[j]).le(1));
        }
      }
    }
  };

  const feasible = new ctx.Solver();
  const pinned = options.map((_, i) => ctx.Int.const(`pinned_${i}`));
  addHard(feasible, pinned);
  for (let i = 0; i < pinned.length; i++) feasible.add(pinned[i].eq(isingBits[i]));
  const isingFeasibility = String(await feasible.check());

  const costOf = (bits: number[]) => options.reduce((sum, option) =>
    sum + (bits[option.variableIndex] === 1 ? option.linearCost : 0), 0);

  let bestBits: number[];
  let bestCost: number;
  if (isingFeasibility === 'sat') {
    bestBits = isingBits.slice();
    bestCost = costOf(bestBits);
  } else {
    const seedSolver = new ctx.Solver();
    const seedVars = options.map((_, i) => ctx.Int.const(`seed_${i}`));
    addHard(seedSolver, seedVars);
    const seedStatus = String(await seedSolver.check());
    if (seedStatus !== 'sat') return { isingFeasibility, finalStatus: seedStatus, bestBits: [], bestCost: null, improvements: 0, optimality: 'unknown', version: 'unknown' };
    const model0 = seedSolver.model();
    bestBits = seedVars.map((v) => Number(model0.eval(v).toString()));
    bestCost = costOf(bestBits);
  }

  let improvements = 0;
  while (true) {
    const better = new ctx.Solver();
    const vars = options.map((_, i) => ctx.Int.const(`opt_${improvements}_${i}`));
    addHard(better, vars);
    const totalCost = vars.slice(1).reduce(
      (acc, v, index) => acc.add(v.mul(options[index + 1].linearCost)),
      vars[0].mul(options[0].linearCost),
    );
    better.add(totalCost.lt(bestCost));
    const status = String(await better.check());
    if (status === 'unsat') {
      let version = 'unknown';
      try {
        const v = Z3.get_version?.();
        if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
      } catch {}
      return { isingFeasibility, finalStatus: 'sat', bestBits, bestCost, improvements, optimality: 'unsat_better_candidate', version };
    }
    if (status !== 'sat') return { isingFeasibility, finalStatus: status, bestBits, bestCost, improvements, optimality: status, version: 'unknown' };
    const modelN = better.model();
    bestBits = vars.map((v) => Number(modelN.eval(v).toString()));
    bestCost = costOf(bestBits);
    improvements++;
    if (improvements > 100) throw new Error('Z3 optimization loop exceeded 100 improvements');
  }
}

async function compile(apiKey: string, model: string, selected: Option[]) {
  const components = Object.fromEntries(selected.map((o) => [o.category, o.text]));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: `${SYSTEM} คุณเป็น compiler เท่านั้น เรียบเรียงองค์ประกอบที่ให้มาเป็นคำตอบเดียว ห้ามเปลี่ยน modelKey ห้ามเพิ่มการันตีรายได้หรือ claim ที่ไม่มีในข้อมูล`,
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, modelKey: selected[0]?.modelKey, components }) },
    ],
    temperature: 0,
    max_tokens: 1000,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

async function judgeOnce(apiKey: string, model: string, answers: string[]): Promise<AnswerScore[]> {
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: [
          'ให้คะแนนแต่ละคำตอบ 0-20 ใน relevance, revenueClarity, automationQuality, actionability, riskAndMetrics รวม 100',
          'feasible=false ถ้ามีการันตีรายได้ ผิดกฎหมาย จำกัดอายุ ไม่มีโมเดลรายได้ที่ทำได้ หรือไม่มี automation ชัดเจน',
          'อย่าให้คะแนนตามตำแหน่งคำตอบ',
          'คืน JSON เท่านั้น {"scores":[{"index":0,"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"riskAndMetrics":0,"total":0,"feasible":true,"reason":"..."}]}',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, answers: answers.map((answer, index) => ({ index, answer })) }) },
    ],
    temperature: 0,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return (Array.isArray(parsed?.scores) ? parsed.scores : []).map((x: any) => ({
    relevance: Number(x.relevance), revenueClarity: Number(x.revenueClarity), automationQuality: Number(x.automationQuality),
    actionability: Number(x.actionability), riskAndMetrics: Number(x.riskAndMetrics), total: Number(x.total),
    feasible: Boolean(x.feasible), reason: String(x.reason ?? ''),
  }));
}

async function judge3x(apiKey: string, model: string, baseline: string, composite: string) {
  const p1 = await judgeOnce(apiKey, model, [baseline, composite]);
  const p2 = await judgeOnce(apiKey, model, [baseline, composite]);
  const reversed = await judgeOnce(apiKey, model, [composite, baseline]);
  const passes = [p1, p2, [reversed[1], reversed[0]]];
  const avg = (index: number): AnswerScore => {
    const values = passes.map((p) => p[index]);
    const mean = (key: 'relevance' | 'revenueClarity' | 'automationQuality' | 'actionability' | 'riskAndMetrics' | 'total') =>
      Math.round((values.reduce((sum, v) => sum + v[key], 0) / values.length) * 100) / 100;
    return {
      relevance: mean('relevance'), revenueClarity: mean('revenueClarity'), automationQuality: mean('automationQuality'),
      actionability: mean('actionability'), riskAndMetrics: mean('riskAndMetrics'), total: mean('total'),
      feasible: values.every((v) => v.feasible), reason: values.map((v) => v.reason).join(' | '),
    };
  };
  return { passes, baseline: avg(0), composite: avg(1) };
}

async function finalZ3Choose(baseline: AnswerScore, composite: AnswerScore) {
  const { Context } = await init();
  const ctx = Context('final-answer-choice');
  const solver = new ctx.Solver();
  const b = ctx.Int.const('baseline');
  const c = ctx.Int.const('composite');
  for (const v of [b, c]) { solver.add(v.ge(0)); solver.add(v.le(1)); }
  solver.add(b.add(c).eq(1));
  if (!baseline.feasible) solver.add(b.eq(0));
  if (!composite.feasible) solver.add(c.eq(0));
  if (baseline.feasible && composite.feasible) {
    if (composite.total >= baseline.total) solver.add(c.eq(1)); else solver.add(b.eq(1));
  } else if (composite.feasible) solver.add(c.eq(1));
  else if (baseline.feasible) solver.add(b.eq(1));
  const status = String(await solver.check());
  if (status !== 'sat') return { status, decision: 'BLOCK' };
  return { status, decision: Number(solver.model().eval(c).toString()) === 1 ? 'USE_COMPOSITE' : 'USE_BASELINE' };
}

describe('Revenue automation compositional search with final-only Z3', () => {
  it.skipIf(!RUN_LIVE)('tests baseline + full component pool -> QUBO/Ising -> final Z3 -> score floor', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey).toBeTruthy();
    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

    const baseline = await makeBaseline(apiKey!, model);
    const plans = await makePlanPool(apiKey!, model);
    expect(plans.length, 'Need exactly 8 structured plans').toBe(8);
    expect(new Set(plans.map((p) => p.modelKey)).size, 'Need all four model keys represented').toBe(4);

    const options = await buildOptions(apiKey!, model, plans);
    expect(options.length).toBe(48);
    const { Q, linear, onePenalty, mismatchPenalty } = makeQubo(options);

    const seed = 777;
    const first = solveQubo({ Q, linear, numVariables: options.length, seed });
    const replay = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: options.length, seed }));
    const replay20 = replay.every((r) => r.energy === first.energy && JSON.stringify(r.solution) === JSON.stringify(first.solution));
    expect(replay20).toBe(true);

    // First Z3 invocation occurs here, only after Ising has searched the complete 48-option pool.
    const z3Plan = await finalZ3Optimize(first.solution, options);
    expect(z3Plan.finalStatus).toBe('sat');
    expect(z3Plan.optimality).toBe('unsat_better_candidate');
    const finalComponents = bitsToOptions(z3Plan.bestBits, options);
    expect(finalComponents.length).toBe(6);

    const composite = await compile(apiKey!, model, finalComponents);
    const judged = await judge3x(apiKey!, model, baseline, composite);
    const finalChoice = await finalZ3Choose(judged.baseline, judged.composite);
    expect(finalChoice.status).toBe('sat');

    const evidence = {
      schema: 'dsg-revenue-compositional-final-z3-v3',
      question: QUESTION,
      model,
      architecture: {
        z3PreGate: false,
        flow: 'baseline + full 48-option LLM pool -> QUBO/Ising -> final Z3 hard verification/exact improvement loop -> compile -> 3-pass score -> final Z3 score-floor decision',
      },
      baseline: { answer: baseline, hash: sha256(baseline), score: judged.baseline },
      pool: { plans, options: options.map((o) => ({ ...o })) },
      ising: {
        solverVersion: first.version, seed, onePenalty, mismatchPenalty, energy: first.energy, evaluations: first.evaluations,
        bits: first.solution, selected: bitsToOptions(first.solution, options), replay20,
      },
      z3Plan: {
        isingFeasibility: z3Plan.isingFeasibility,
        finalStatus: z3Plan.finalStatus,
        improvementsOverStartingCandidate: z3Plan.improvements,
        optimality: z3Plan.optimality,
        finalCost: z3Plan.bestCost,
        finalBits: z3Plan.bestBits,
        finalComponents,
        version: z3Plan.version,
      },
      composite: { answer: composite, hash: sha256(composite), score: judged.composite },
      scoring: {
        type: '3-pass fixed rubric; one pass uses reversed answer order',
        passes: judged.passes,
        caveat: 'LLM evaluator scores are judgments, not mathematical truth. Z3 proves only the encoded structured constraints and explicit comparison rule.',
      },
      comparison: {
        baselineTotal: judged.baseline.total,
        compositeTotal: judged.composite.total,
        delta: Math.round((judged.composite.total - judged.baseline.total) * 100) / 100,
        finalDecision: finalChoice.decision,
        deliveredTotal: finalChoice.decision === 'USE_COMPOSITE' ? judged.composite.total : judged.baseline.total,
      },
    };
    const withHash = { ...evidence, evidenceHash: sha256(evidence) };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/revenue-automation-compositional-final-z3.json', `${JSON.stringify(withHash, null, 2)}\n`);
    console.log('DSG_REVENUE_FINAL_Z3_SUMMARY', JSON.stringify({
      baselineTotal: evidence.comparison.baselineTotal,
      compositeTotal: evidence.comparison.compositeTotal,
      delta: evidence.comparison.delta,
      finalDecision: evidence.comparison.finalDecision,
      deliveredTotal: evidence.comparison.deliveredTotal,
      isingFeasibility: z3Plan.isingFeasibility,
      z3Improvements: z3Plan.improvements,
      z3Optimality: z3Plan.optimality,
      selectedModelKey: finalComponents[0]?.modelKey,
      selectedCandidateIndices: finalComponents.map((o) => o.candidateIndex),
      replay20,
      evidenceHash: withHash.evidenceHash,
    }));
  }, 240_000);
});
