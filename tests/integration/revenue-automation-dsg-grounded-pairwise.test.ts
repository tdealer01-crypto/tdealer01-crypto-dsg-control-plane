import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { init } from 'z3-solver';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';
const QUESTION = 'จากข้อมูล DSG ONE วิธีสร้างรายได้แบบอัตโนมัติที่ทำได้จริงควรเป็นอย่างไร';
const CATEGORIES = [
  'offer',
  'acquisition',
  'checkout',
  'fulfillment',
  'usageRevenue',
  'retentionUpsell',
  'metricsRisk',
] as const;
type Category = typeof CATEGORIES[number];

const SOURCE_SPECS = [
  {
    path: 'lib/billing/pricing-catalog.ts',
    authority: 'implementation',
    keywords: ['displayMonthlyUsd', 'SKILLS_BUNDLES', 'MCP_SUBSCRIPTION', 'DELIVERY_PROOF_PRICING', 'getPriceId'],
  },
  {
    path: 'app/api/billing/checkout/route.ts',
    authority: 'implementation',
    keywords: ['checkout.sessions.create', 'allow_promotion_codes', 'trialDays', 'getMeteredBillingConfiguration', 'plan_key'],
  },
  {
    path: 'app/api/billing/webhook/route.ts',
    authority: 'implementation',
    keywords: ['claimEventProcessing', 'billing_events', 'fulfillSubscription', 'revokeSubscription', 'sendTrialWelcome', 'sendUpgradeSuccess', 'lookupRefCode'],
  },
  {
    path: 'lib/billing/fulfillment.ts',
    authority: 'implementation',
    keywords: ['Idempotent', 'atomic', 'sync_dsg_paid_entitlement', 'fulfillSubscription', 'revokeSubscription'],
  },
  {
    path: 'lib/billing/metered.ts',
    authority: 'implementation',
    keywords: ['durable outbox', 'getMeteredBillingConfiguration', 'billing_meter_outbox', 'idempotencyKeyForExecution', 'reportMeterEvent'],
  },
  {
    path: 'lib/revenue/events.ts',
    authority: 'implementation',
    keywords: ['insertRevenueEvent', 'listRevenueEvents', 'idempotency_key', 'stripe_event_id', 'revenue_events'],
  },
  {
    path: 'app/api/billing/portal/route.ts',
    authority: 'implementation',
    keywords: ['billingPortal.sessions.create', 'billing_customers', 'dashboard/billing'],
  },
  {
    path: 'docs/REVENUE_SYSTEM_DESIGN.md',
    authority: 'planning-context',
    keywords: ['Pricing Models', 'Revenue Flows', 'Revenue Event Tracking', 'Revenue Dashboard Widget', 'Implementation Roadmap'],
  },
] as const;

const VALID_SOURCE_PATHS = new Set(SOURCE_SPECS.map((source) => source.path));
const ADJACENT_EDGES: Array<[Category, Category]> = CATEGORIES.slice(0, -1).map((category, index) => [category, CATEGORIES[index + 1]]);

type Component = { text: string; sourceRefs: string[] };
type Plan = { label: string; components: Record<Category, Component> };
type ComponentRating = {
  quality: number;
  grounding: number;
  coverage: number;
  safe: boolean;
  reason: string;
};
type Option = {
  variableIndex: number;
  candidateIndex: number;
  label: string;
  category: Category;
  text: string;
  sourceRefs: string[];
  quality: number;
  grounding: number;
  coverage: number;
  safe: boolean;
  validRefs: boolean;
  linearCost: number;
};
type PairTerm = {
  i: number;
  j: number;
  compatibility: number;
  diversityBonus: number;
  penalty: number;
};
type AnswerScore = {
  relevance: number;
  revenueClarity: number;
  automationQuality: number;
  actionability: number;
  groundingAndRisk: number;
  total: number;
  feasible: boolean;
  reason: string;
};

function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function clampScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function compactExcerpt(path: string, keywords: readonly string[]): string {
  const full = readFileSync(path, 'utf8');
  const lines = full.split(/\r?\n/);
  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (!keywords.some((keyword) => lines[i].toLowerCase().includes(keyword.toLowerCase()))) continue;
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 7); j++) keep.add(j);
  }
  return [...keep].sort((a, b) => a - b).map((i) => `${i + 1}: ${lines[i]}`).join('\n').slice(0, 7000);
}

function loadEvidence() {
  const sources = SOURCE_SPECS.map((spec) => {
    const full = readFileSync(spec.path, 'utf8');
    return {
      path: spec.path,
      authority: spec.authority,
      sha256: sha256(full),
      excerpt: compactExcerpt(spec.path, spec.keywords),
    };
  });
  const pack = sources.map((source) => [
    `SOURCE: ${source.path}`,
    `AUTHORITY: ${source.authority}`,
    `SHA256: ${source.sha256}`,
    source.excerpt,
  ].join('\n')).join('\n\n---\n\n');
  return { sources, pack: pack.slice(0, 46000) };
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

const GROUND_RULES = [
  'ใช้เฉพาะข้อมูลจาก evidence ของ DSG ONE ที่ให้มา',
  'implementation source มีอำนาจเหนือ planning-context; ห้ามอ้างของที่อยู่แค่เอกสารแผนว่า live แล้ว',
  'ห้ามแต่งยอดผู้ใช้ รายได้ conversion หรือสถานะ production ที่ evidence ไม่ได้ให้',
  'แยกสิ่งที่ implemented แล้วออกจากสิ่งที่ยังต้องตั้งค่า/ตรวจสอบ',
  'ห้ามการันตีรายได้',
].join(' ');

async function makeBaseline(apiKey: string, model: string, evidencePack: string) {
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: `${GROUND_RULES} ตอบภาษาไทยแบบใช้งานได้จริง ให้แผนสร้างรายได้อัตโนมัติสำหรับ DSG ONE โดยอิงโค้ดจริง` },
      { role: 'user', content: `${QUESTION}\n\nEVIDENCE:\n${evidencePack}` },
    ],
    temperature: 0,
    max_tokens: 1300,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

function normalizeComponent(raw: any): Component | null {
  if (!raw || typeof raw.text !== 'string' || raw.text.trim().length === 0) return null;
  const sourceRefs = Array.isArray(raw.sourceRefs) ? raw.sourceRefs.map(String).filter(Boolean) : [];
  return { text: raw.text.trim(), sourceRefs };
}

function normalizePlan(raw: any, fallbackLabel: string): Plan | null {
  const components = {} as Record<Category, Component>;
  for (const category of CATEGORIES) {
    const component = normalizeComponent(raw?.components?.[category]);
    if (!component) return null;
    components[category] = component;
  }
  return { label: String(raw?.label || fallbackLabel), components };
}

async function extractBaselinePlan(apiKey: string, model: string, baseline: string, evidencePack: string): Promise<Plan> {
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: `${GROUND_RULES} แปลงคำตอบ baseline เป็นโครงสร้าง 7 หมวด ห้ามเพิ่มข้อเท็จจริงใหม่ ทุก component ต้องมี sourceRefs ที่เป็น path จริงจาก evidence; ถ้า claim ไม่รองรับให้ใส่ sourceRefs=[] คืน JSON เท่านั้น`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          categories: CATEGORIES,
          baseline,
          evidence: evidencePack,
          schema: { label: 'baseline', components: Object.fromEntries(CATEGORIES.map((c) => [c, { text: '...', sourceRefs: ['path'] }])) },
        }),
      },
    ],
    temperature: 0,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const plan = normalizePlan(parsed, 'baseline');
  if (!plan) throw new Error('Could not structure baseline plan');
  plan.label = 'baseline';
  return plan;
}

async function makeCandidatePlans(apiKey: string, model: string, evidencePack: string): Promise<Plan[]> {
  const prompt = [
    GROUND_RULES,
    'สร้างทางเลือกแผนรายได้อัตโนมัติของ DSG ONE จำนวน 8 แผน เพื่อให้ optimizer สามารถผสม component ข้ามแผนได้',
    `หมวดที่ต้องมี: ${CATEGORIES.join(', ')}`,
    'แต่ละ component = {"text":"...","sourceRefs":["exact/repo/path"]}',
    'sourceRefs ต้องใช้ path จาก evidence เท่านั้น',
    'ให้แผนมีความหลากหลาย เช่น core SaaS subscriptions, skills bundles, MCP API subscription, Delivery Proof, usage overage, self-service billing, revenue events แต่ห้ามอ้างสิ่งที่ evidence ไม่รองรับ',
    'คืน JSON เท่านั้นรูปแบบ {"plans":[{"label":"...","components":{...}}]}',
  ].join(' ');

  let best: Plan[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const payload = await chat(apiKey, model, {
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `${QUESTION}\n\nEVIDENCE:\n${evidencePack}` },
      ],
      temperature: attempt === 0 ? 0.65 : 0.35,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
    const plans = (Array.isArray(parsed?.plans) ? parsed.plans : [])
      .map((raw: any, index: number) => normalizePlan(raw, `candidate-${index + 1}`))
      .filter(Boolean) as Plan[];
    if (plans.length > best.length) best = plans;
    if (best.length >= 6) break;
  }
  return best.slice(0, 8);
}

async function rateCategory(
  apiKey: string,
  model: string,
  category: Category,
  plans: Plan[],
  evidencePack: string,
): Promise<Map<number, ComponentRating>> {
  const items = plans.map((plan, index) => ({ index, label: plan.label, ...plan.components[category] }));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: [
          GROUND_RULES,
          `ประเมิน component หมวด ${category} ของ DSG ONE`,
          'quality 0-100 = ชัดเจน/ทำได้จริง/ช่วยรายได้อัตโนมัติ',
          'grounding 0-100 = claim รองรับโดย sourceRefs และ evidence จริงแค่ไหน',
          'coverage 0-100 = ครอบคลุมหน้าที่ของหมวดนี้ดีแค่ไหน',
          'safe=false ถ้ามี claim เกินหลักฐาน/ผิดกฎหมาย/การันตีรายได้',
          'คืน JSON เท่านั้น {"ratings":[{"index":0,"quality":0,"grounding":0,"coverage":0,"safe":true,"reason":"..."}]} ให้ครบทุก index',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify({ items, evidence: evidencePack }) },
    ],
    temperature: 0,
    max_tokens: 2600,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const map = new Map<number, ComponentRating>();
  for (const raw of Array.isArray(parsed?.ratings) ? parsed.ratings : []) {
    const index = Number(raw?.index);
    if (!Number.isInteger(index) || index < 0 || index >= plans.length) continue;
    map.set(index, {
      quality: clampScore(raw?.quality),
      grounding: clampScore(raw?.grounding),
      coverage: clampScore(raw?.coverage),
      safe: Boolean(raw?.safe),
      reason: String(raw?.reason ?? ''),
    });
  }
  return map;
}

async function buildOptions(apiKey: string, model: string, plans: Plan[], evidencePack: string): Promise<Option[]> {
  const ratings = new Map<Category, Map<number, ComponentRating>>();
  for (const category of CATEGORIES) ratings.set(category, await rateCategory(apiKey, model, category, plans, evidencePack));

  const options: Option[] = [];
  for (let candidateIndex = 0; candidateIndex < plans.length; candidateIndex++) {
    for (const category of CATEGORIES) {
      const component = plans[candidateIndex].components[category];
      const rating = ratings.get(category)?.get(candidateIndex);
      if (!rating) throw new Error(`Missing rating for ${candidateIndex}:${category}`);
      const validRefs = component.sourceRefs.length > 0 && component.sourceRefs.every((ref) => VALID_SOURCE_PATHS.has(ref as any));
      const linearCost =
        (100 - rating.quality) * 90 +
        (100 - rating.grounding) * 120 +
        (100 - rating.coverage) * 70 +
        (rating.safe ? 0 : 350_000) +
        (validRefs ? 0 : 300_000) +
        candidateIndex * 3;
      options.push({
        variableIndex: options.length,
        candidateIndex,
        label: plans[candidateIndex].label,
        category,
        text: component.text,
        sourceRefs: component.sourceRefs,
        quality: rating.quality,
        grounding: rating.grounding,
        coverage: rating.coverage,
        safe: rating.safe,
        validRefs,
        linearCost,
      });
    }
  }
  return options;
}

async function ratePairEdge(
  apiKey: string,
  model: string,
  left: Category,
  right: Category,
  options: Option[],
): Promise<Map<string, number>> {
  const leftOptions = options.filter((o) => o.category === left);
  const rightOptions = options.filter((o) => o.category === right);
  const pairs = leftOptions.flatMap((a) => rightOptions.map((b) => ({
    i: a.variableIndex,
    j: b.variableIndex,
    left: a.text,
    right: b.text,
    leftSources: a.sourceRefs,
    rightSources: b.sourceRefs,
  })));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: [
          `ให้คะแนน semantic compatibility 0-100 ระหว่าง ${left} -> ${right} สำหรับแผนรายได้ DSG ONE`,
          '100 = ต่อกันเป็น workflow เดียวกันได้ชัดเจน, 0 = ขัดกันหรือคนละตรรกะธุรกิจ',
          'อย่าตัดตัวเลือก แค่ให้คะแนน pairwise',
          'คืน JSON เท่านั้น {"pairs":[{"i":0,"j":1,"score":0}]} ให้ครบทุกคู่',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify(pairs) },
    ],
    temperature: 0,
    max_tokens: 4200,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const map = new Map<string, number>();
  for (const raw of Array.isArray(parsed?.pairs) ? parsed.pairs : []) {
    const i = Number(raw?.i);
    const j = Number(raw?.j);
    if (!Number.isInteger(i) || !Number.isInteger(j)) continue;
    map.set(`${i}:${j}`, clampScore(raw?.score));
  }
  return map;
}

async function buildPairTerms(apiKey: string, model: string, options: Option[]): Promise<PairTerm[]> {
  const terms: PairTerm[] = [];
  for (const [left, right] of ADJACENT_EDGES) {
    const compatibility = await ratePairEdge(apiKey, model, left, right, options);
    const leftOptions = options.filter((o) => o.category === left);
    const rightOptions = options.filter((o) => o.category === right);
    for (const a of leftOptions) {
      for (const b of rightOptions) {
        const score = compatibility.get(`${a.variableIndex}:${b.variableIndex}`) ?? 0;
        const union = new Set([...a.sourceRefs, ...b.sourceRefs]);
        const maxSingle = Math.max(new Set(a.sourceRefs).size, new Set(b.sourceRefs).size);
        const diversityGain = Math.max(0, union.size - maxSingle);
        const diversityBonus = Math.min(900, diversityGain * 180);
        const penalty = (100 - score) * 85 - diversityBonus;
        terms.push({ i: a.variableIndex, j: b.variableIndex, compatibility: score, diversityBonus, penalty });
      }
    }
  }
  return terms;
}

function addSymmetricPair(Q: number[][], i: number, j: number, total: number) {
  Q[i][j] += total / 2;
  Q[j][i] += total / 2;
}

function makeQubo(options: Option[], pairTerms: PairTerm[]) {
  const Q = Array.from({ length: options.length }, () => Array(options.length).fill(0));
  const linear = options.map((o) => o.linearCost);
  const exactlyOnePenalty = 7_000_000;
  for (const category of CATEGORIES) {
    const indices = options.filter((o) => o.category === category).map((o) => o.variableIndex);
    for (const i of indices) Q[i][i] -= exactlyOnePenalty;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) addSymmetricPair(Q, indices[a], indices[b], exactlyOnePenalty * 2);
    }
  }
  for (const pair of pairTerms) addSymmetricPair(Q, pair.i, pair.j, pair.penalty);
  return { Q, linear, exactlyOnePenalty };
}

function assignmentCost(bits: number[], options: Option[], pairTerms: PairTerm[]): number {
  let cost = 0;
  for (const option of options) if (bits[option.variableIndex] === 1) cost += option.linearCost;
  for (const pair of pairTerms) if (bits[pair.i] === 1 && bits[pair.j] === 1) cost += pair.penalty;
  return cost;
}

function selectedOptions(bits: number[], options: Option[]): Option[] {
  return options.filter((option) => bits[option.variableIndex] === 1);
}

function baselineBits(options: Option[]): number[] {
  return options.map((option) => option.candidateIndex === 0 ? 1 : 0);
}

async function z3FinalOptimize(isingBits: number[], options: Option[], pairTerms: PairTerm[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('dsg-grounded-final-z3');
  const sourcePaths = [...VALID_SOURCE_PATHS];

  const addHardAndCost = (solver: any, vars: any[], label: string) => {
    for (const v of vars) { solver.add(v.ge(0)); solver.add(v.le(1)); }
    for (const category of CATEGORIES) {
      const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex);
      const sum = idx.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[idx[0]]);
      solver.add(sum.eq(1));
    }
    for (const option of options) {
      if (!option.safe || !option.validRefs || option.grounding < 65) solver.add(vars[option.variableIndex].eq(0));
    }
    for (const pair of pairTerms) {
      if (pair.compatibility < 45) solver.add(vars[pair.i].add(vars[pair.j]).le(1));
    }

    const sourceVars = sourcePaths.map((source, sourceIndex) => {
      const src = ctx.Int.const(`${label}_src_${sourceIndex}`);
      solver.add(src.ge(0)); solver.add(src.le(1));
      const refs = options.filter((o) => o.sourceRefs.includes(source)).map((o) => o.variableIndex);
      if (refs.length === 0) {
        solver.add(src.eq(0));
      } else {
        for (const i of refs) solver.add(src.ge(vars[i]));
        const sum = refs.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[refs[0]]);
        solver.add(src.le(sum));
      }
      return src;
    });
    solver.add(sourceVars.slice(1).reduce((acc, v) => acc.add(v), sourceVars[0]).ge(3));

    const parts: any[] = options.map((option) => vars[option.variableIndex].mul(option.linearCost));
    pairTerms.forEach((pair, index) => {
      const p = ctx.Int.const(`${label}_pair_${index}`);
      solver.add(p.ge(0)); solver.add(p.le(1));
      solver.add(p.le(vars[pair.i]));
      solver.add(p.le(vars[pair.j]));
      solver.add(p.ge(vars[pair.i].add(vars[pair.j]).sub(1)));
      parts.push(p.mul(pair.penalty));
    });
    return parts.slice(1).reduce((acc, part) => acc.add(part), parts[0]);
  };

  const checkPinned = async (bits: number[], label: string) => {
    const solver = new ctx.Solver();
    const vars = options.map((_, i) => ctx.Int.const(`${label}_v_${i}`));
    addHardAndCost(solver, vars, label);
    for (let i = 0; i < vars.length; i++) solver.add(vars[i].eq(bits[i]));
    return String(await solver.check());
  };

  const isingFeasibility = await checkPinned(isingBits, 'ising');
  const baselineFeasibility = await checkPinned(baselineBits(options), 'baseline');

  let bestBits: number[];
  let bestCost: number;
  if (isingFeasibility === 'sat') {
    bestBits = isingBits.slice();
    bestCost = assignmentCost(bestBits, options, pairTerms);
  } else {
    const seed = new ctx.Solver();
    const vars = options.map((_, i) => ctx.Int.const(`seed_v_${i}`));
    addHardAndCost(seed, vars, 'seed');
    const status = String(await seed.check());
    if (status !== 'sat') {
      return { isingFeasibility, baselineFeasibility, finalStatus: status, bestBits: [], bestCost: null, improvements: 0, optimality: status, version: 'unknown' };
    }
    const model0 = seed.model();
    bestBits = vars.map((v) => Number(model0.eval(v).toString()));
    bestCost = assignmentCost(bestBits, options, pairTerms);
  }

  let improvements = 0;
  while (improvements < 60) {
    const solver = new ctx.Solver();
    const vars = options.map((_, i) => ctx.Int.const(`better_${improvements}_v_${i}`));
    const total = addHardAndCost(solver, vars, `better_${improvements}`);
    solver.add(total.lt(bestCost));
    const status = String(await solver.check());
    if (status === 'unsat') {
      let version = 'unknown';
      try {
        const v = Z3.get_version?.();
        if (v) version = `${v.major}.${v.minor}.${v.build_number}`;
      } catch {}
      return { isingFeasibility, baselineFeasibility, finalStatus: 'sat', bestBits, bestCost, improvements, optimality: 'unsat_better_candidate', version };
    }
    if (status !== 'sat') return { isingFeasibility, baselineFeasibility, finalStatus: status, bestBits, bestCost, improvements, optimality: status, version: 'unknown' };
    const modelN = solver.model();
    bestBits = vars.map((v) => Number(modelN.eval(v).toString()));
    bestCost = assignmentCost(bestBits, options, pairTerms);
    improvements++;
  }
  throw new Error('Z3 improvement loop exceeded 60 iterations');
}

async function compileAnswer(apiKey: string, model: string, selected: Option[], evidencePack: string) {
  const components = Object.fromEntries(selected.map((o) => [o.category, { text: o.text, sourceRefs: o.sourceRefs }]));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: `${GROUND_RULES} คุณเป็น deterministic-style compiler: เรียบเรียง component ที่เลือกเป็นคำตอบไทยที่ชัดเจน ห้ามเพิ่ม claim หรือราคา/สถานะที่ไม่ได้อยู่ใน component/evidence ต้องบอกด้วยว่าอะไรพร้อมแล้วและอะไรยังต้องตั้งค่าหรือทดสอบ`,
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, components, evidence: evidencePack }) },
    ],
    temperature: 0,
    max_tokens: 1500,
  });
  return String(payload?.choices?.[0]?.message?.content ?? '').trim();
}

async function judgeAnswers(apiKey: string, model: string, baseline: string, composite: string, evidencePack: string): Promise<AnswerScore[]> {
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: [
          'ให้คะแนนคำตอบสองคำตอบอย่างอิสระสำหรับคำถามวิธีสร้างรายได้แบบอัตโนมัติจากข้อมูล DSG ONE',
          '5 หมวด หมวดละ 0-20: relevance, revenueClarity, automationQuality, actionability, groundingAndRisk รวม 100',
          'groundingAndRisk ต้องลงโทษ claim ที่ไม่มี evidence หรือเอา planning-context ไปอ้างว่า implemented',
          'feasible=false ถ้ามี claim สำคัญไม่รองรับหลักฐาน การันตีรายได้ หรือ flow ใช้งานไม่ได้',
          'คืน JSON เท่านั้น {"scores":[{"index":0,"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"groundingAndRisk":0,"total":0,"feasible":true,"reason":"..."}]}',
        ].join(' '),
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, answers: [{ index: 0, answer: baseline }, { index: 1, answer: composite }] }) },
    ],
    temperature: 0,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return (Array.isArray(parsed?.scores) ? parsed.scores : []).map((raw: any) => ({
    relevance: Number(raw.relevance),
    revenueClarity: Number(raw.revenueClarity),
    automationQuality: Number(raw.automationQuality),
    actionability: Number(raw.actionability),
    groundingAndRisk: Number(raw.groundingAndRisk),
    total: Number(raw.total),
    feasible: Boolean(raw.feasible),
    reason: String(raw.reason ?? ''),
  }));
}

describe('DSG ONE grounded revenue automation: Baseline + Top-K -> pairwise QUBO/Ising -> final-only Z3', () => {
  it.skipIf(!RUN_LIVE)('searches real DSG ONE repo evidence without pre-Z3 pruning and preserves a verified quality floor', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    expect(apiKey).toBeTruthy();
    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
    const evidence = loadEvidence();

    const baseline = await makeBaseline(apiKey!, model, evidence.pack);
    expect(baseline.length).toBeGreaterThan(100);
    const baselinePlan = await extractBaselinePlan(apiKey!, model, baseline, evidence.pack);
    const generatedPlans = await makeCandidatePlans(apiKey!, model, evidence.pack);
    expect(generatedPlans.length, 'Need at least 4 structured grounded plans').toBeGreaterThanOrEqual(4);
    const plans = [baselinePlan, ...generatedPlans];

    const options = await buildOptions(apiKey!, model, plans, evidence.pack);
    const pairTerms = await buildPairTerms(apiKey!, model, options);
    const { Q, linear, exactlyOnePenalty } = makeQubo(options, pairTerms);
    const seed = 777;
    const first = solveQubo({ Q, linear, numVariables: options.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: options.length, seed }));
    const replay20 = replays.every((result) => result.energy === first.energy && JSON.stringify(result.solution) === JSON.stringify(first.solution));
    expect(replay20).toBe(true);

    const z3 = await z3FinalOptimize(first.solution, options, pairTerms);
    expect(z3.finalStatus).toBe('sat');
    expect(z3.bestBits.length).toBe(options.length);
    const selected = selectedOptions(z3.bestBits, options);
    expect(selected.length).toBe(CATEGORIES.length);

    const composite = await compileAnswer(apiKey!, model, selected, evidence.pack);
    const scores = await judgeAnswers(apiKey!, model, baseline, composite, evidence.pack);
    expect(scores.length).toBe(2);
    const baselineScore = scores[0];
    const compositeScore = scores[1];

    let finalDecision: 'USE_COMPOSITE' | 'USE_BASELINE' | 'BLOCK';
    if (compositeScore.feasible && (compositeScore.total >= baselineScore.total || z3.baselineFeasibility !== 'sat' || !baselineScore.feasible)) {
      finalDecision = 'USE_COMPOSITE';
    } else if (z3.baselineFeasibility === 'sat' && baselineScore.feasible) {
      finalDecision = 'USE_BASELINE';
    } else {
      finalDecision = 'BLOCK';
    }
    const delivered = finalDecision === 'USE_COMPOSITE' ? composite : finalDecision === 'USE_BASELINE' ? baseline : '';
    const deliveredTotal = finalDecision === 'USE_COMPOSITE' ? compositeScore.total : finalDecision === 'USE_BASELINE' ? baselineScore.total : 0;
    const selectedSources = [...new Set(selected.flatMap((option) => option.sourceRefs))].sort();

    const report = {
      schema: 'dsg-revenue-grounded-pairwise-final-z3-v1',
      question: QUESTION,
      model,
      sourceEvidence: evidence.sources,
      architecture: 'baseline+top-k -> full component pool -> pairwise QUBO/Ising -> final-only Z3 -> compile -> grounded score floor',
      noPreZ3: true,
      pool: { plans: plans.length, generatedPlans: generatedPlans.length, categories: CATEGORIES.length, binaryVariables: options.length, pairTerms: pairTerms.length },
      baseline: { answer: baseline, answerHash: sha256(baseline), structuredFeasibility: z3.baselineFeasibility, score: baselineScore },
      search: {
        seed,
        solverVersion: first.version,
        exactlyOnePenalty,
        isingEnergy: first.energy,
        isingEvaluations: first.evaluations,
        replay20,
        isingFeasibility: z3.isingFeasibility,
        z3Improvements: z3.improvements,
        z3Optimality: z3.optimality,
        z3Version: z3.version,
        bestCost: z3.bestCost,
      },
      selected: selected.map((option) => ({
        category: option.category,
        candidateIndex: option.candidateIndex,
        label: option.label,
        text: option.text,
        sourceRefs: option.sourceRefs,
        quality: option.quality,
        grounding: option.grounding,
        coverage: option.coverage,
      })),
      selectedSources,
      composite: { answer: composite, answerHash: sha256(composite), score: compositeScore },
      comparison: { baselineTotal: baselineScore.total, compositeTotal: compositeScore.total, delta: compositeScore.total - baselineScore.total },
      finalDecision,
      delivered: { answer: delivered, answerHash: sha256(delivered), total: deliveredTotal },
    };
    const evidenceHash = sha256(report);
    const output = { ...report, evidenceHash };
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/revenue-automation-dsg-grounded-pairwise.json', `${JSON.stringify(output, null, 2)}\n`);
    console.log('DSG_REVENUE_GROUNDED_PAIRWISE_SUMMARY', JSON.stringify({
      baselineTotal: baselineScore.total,
      compositeTotal: compositeScore.total,
      delta: compositeScore.total - baselineScore.total,
      finalDecision,
      deliveredTotal,
      plans: plans.length,
      binaryVariables: options.length,
      pairTerms: pairTerms.length,
      selectedSources,
      isingFeasibility: z3.isingFeasibility,
      baselineFeasibility: z3.baselineFeasibility,
      z3Improvements: z3.improvements,
      z3Optimality: z3.optimality,
      replay20,
      evidenceHash,
    }));
  }, 300_000);
});
