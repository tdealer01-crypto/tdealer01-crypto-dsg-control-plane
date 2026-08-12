import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { init } from 'z3-solver';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';

const RUN_LIVE = process.env.RUN_LIVE_OPENAI_LOGPROBS === 'true';
const QUESTION = 'จากข้อมูล DSG ONE วิธีสร้างรายได้แบบอัตโนมัติที่ทำได้จริงควรเป็นอย่างไร';
const CATEGORIES = ['offer', 'acquisition', 'checkout', 'fulfillment', 'usageRevenue', 'retentionUpsell', 'metricsRisk'] as const;
type Category = typeof CATEGORIES[number];

const SOURCE_SPECS = [
  { path: 'lib/billing/pricing-catalog.ts', authority: 'implementation', keywords: ['displayMonthlyUsd', 'SKILLS_BUNDLES', 'MCP_SUBSCRIPTION', 'DELIVERY_PROOF_PRICING', 'getPriceId'] },
  { path: 'app/api/billing/checkout/route.ts', authority: 'implementation', keywords: ['checkout.sessions.create', 'allow_promotion_codes', 'trialDays', 'getMeteredBillingConfiguration', 'plan_key'] },
  { path: 'app/api/billing/webhook/route.ts', authority: 'implementation', keywords: ['claimEventProcessing', 'billing_events', 'fulfillSubscription', 'revokeSubscription', 'sendTrialWelcome', 'sendUpgradeSuccess', 'lookupRefCode'] },
  { path: 'lib/billing/fulfillment.ts', authority: 'implementation', keywords: ['Idempotent', 'atomic', 'sync_dsg_paid_entitlement', 'fulfillSubscription', 'revokeSubscription'] },
  { path: 'lib/billing/metered.ts', authority: 'implementation', keywords: ['durable outbox', 'getMeteredBillingConfiguration', 'billing_meter_outbox', 'idempotencyKeyForExecution', 'reportMeterEvent'] },
  { path: 'lib/revenue/events.ts', authority: 'implementation', keywords: ['insertRevenueEvent', 'listRevenueEvents', 'idempotency_key', 'stripe_event_id', 'revenue_events'] },
  { path: 'app/api/billing/portal/route.ts', authority: 'implementation', keywords: ['billingPortal.sessions.create', 'billing_customers', 'dashboard/billing'] },
  { path: 'docs/REVENUE_SYSTEM_DESIGN.md', authority: 'planning-context', keywords: ['Pricing Models', 'Revenue Flows', 'Revenue Event Tracking', 'Revenue Dashboard Widget', 'Implementation Roadmap'] },
] as const;
const VALID_SOURCE_PATHS = new Set(SOURCE_SPECS.map((s) => s.path));
const EDGES: Array<[Category, Category]> = CATEGORIES.slice(0, -1).map((c, i) => [c, CATEGORIES[i + 1]]);

type Component = { text: string; sourceRefs: string[] };
type Plan = { label: string; components: Record<Category, Component> };
type Rating = { quality: number; grounding: number; coverage: number; safe: boolean };
type Option = Component & Rating & {
  variableIndex: number;
  candidateIndex: number;
  label: string;
  category: Category;
  validRefs: boolean;
  linearCost: number;
};
type PairTerm = { i: number; j: number; compatibility: number; diversityBonus: number; penalty: number };
type AnswerScore = { relevance: number; revenueClarity: number; automationQuality: number; actionability: number; groundingAndRisk: number; total: number; feasible: boolean; reason: string };

function sha256(value: unknown) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
function clamp100(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}
function compactExcerpt(path: string, keywords: readonly string[]) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (!keywords.some((k) => lines[i].toLowerCase().includes(k.toLowerCase()))) continue;
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 7); j++) keep.add(j);
  }
  return [...keep].sort((a, b) => a - b).map((i) => `${i + 1}: ${lines[i]}`).join('\n').slice(0, 6500);
}
function loadEvidence() {
  const sources = SOURCE_SPECS.map((spec) => {
    const full = readFileSync(spec.path, 'utf8');
    return { path: spec.path, authority: spec.authority, sha256: sha256(full), excerpt: compactExcerpt(spec.path, spec.keywords) };
  });
  const pack = sources.map((s) => `SOURCE: ${s.path}\nAUTHORITY: ${s.authority}\nSHA256: ${s.sha256}\n${s.excerpt}`).join('\n\n---\n\n').slice(0, 45000);
  return { sources, pack };
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
  'ใช้เฉพาะ evidence ของ DSG ONE ที่ให้มา',
  'implementation source มีอำนาจเหนือ planning-context',
  'ห้ามอ้างสิ่งที่อยู่แค่แผนว่า implemented/live แล้ว',
  'ห้ามแต่งรายได้ จำนวนลูกค้า conversion หรือสถานะ production',
  'ห้ามการันตีรายได้',
].join(' ');

function canonicalBaseline(): Plan {
  return {
    label: 'canonical-dsg-baseline',
    components: {
      offer: {
        text: 'ขาย core SaaS subscription ของ DSG ONE ตาม pricing catalog: Pro $99/เดือน, Business $199/เดือน, Enterprise $499/เดือน และใช้ Skills Bundles/Delivery Proof เป็น add-on โดยถือ pricing-catalog.ts เป็น source of truth',
        sourceRefs: ['lib/billing/pricing-catalog.ts'],
      },
      acquisition: {
        text: 'ใช้ trial ที่กำหนดใน pricing catalog (Pro/Business 14 วัน, Enterprise 30 วัน), promotion codes ใน Stripe Checkout และ referral/ref_code ที่ webhook สามารถ resolve ได้ เป็นกลไกทดลอง/แนะนำต่อโดยไม่สมมติ conversion rate',
        sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/checkout/route.ts', 'app/api/billing/webhook/route.ts'],
      },
      checkout: {
        text: 'ให้ลูกค้าชำระผ่าน /api/billing/checkout ซึ่งสร้าง Stripe Checkout Session จาก price configuration แบบ fail-closed; Skills Bundles ใช้ inline price_data และ core plans ใช้ price IDs จาก environment',
        sourceRefs: ['app/api/billing/checkout/route.ts', 'lib/billing/pricing-catalog.ts'],
      },
      fulfillment: {
        text: 'หลัง Stripe webhook ยืนยัน event ให้ canonical webhook claim event แบบ idempotent แล้วเรียก fulfillSubscription เพื่อ sync paid entitlement แบบ atomic ผ่าน database RPC; ถ้าการ persistence ล้มเหลวให้ webhook fail เพื่อให้ Stripe retry',
        sourceRefs: ['app/api/billing/webhook/route.ts', 'lib/billing/fulfillment.ts'],
      },
      usageRevenue: {
        text: 'เปิด usage-based overage เฉพาะเมื่อ Stripe metering contract ตั้งค่าครบ; reportMeterEvent สร้าง durable billing_meter_outbox ก่อนส่ง meter event และใช้ executionId เป็น idempotency key เพื่อไม่ทำรายได้ซ้ำ',
        sourceRefs: ['lib/billing/metered.ts'],
      },
      retentionUpsell: {
        text: 'ให้ลูกค้าจัดการ billing แบบ self-service ผ่าน Stripe Billing Portal และเพิ่มรายได้ต่อบัญชีด้วย Skills Bundles, Delivery Proof หรือ MCP API subscription ที่ pricing catalog รองรับ โดยไม่อ้างว่าทุก price config พร้อมจนกว่าจะตรวจ environment',
        sourceRefs: ['app/api/billing/portal/route.ts', 'lib/billing/pricing-catalog.ts'],
      },
      metricsRisk: {
        text: 'บันทึก revenue_events แบบ idempotent เมื่อมี idempotency_key/stripe_event_id และใช้ listRevenueEvents สำหรับรายงาน; แยก implemented code ออกจาก roadmap ในเอกสาร และไม่ถือ metering/price ที่ขาด environment ว่าพร้อมขาย',
        sourceRefs: ['lib/revenue/events.ts', 'lib/billing/metered.ts', 'docs/REVENUE_SYSTEM_DESIGN.md'],
      },
    },
  };
}

function normalizeComponent(raw: any): Component | null {
  if (typeof raw?.text !== 'string' || !raw.text.trim()) return null;
  const refs = Array.isArray(raw.sourceRefs) ? raw.sourceRefs.map(String).filter(Boolean) : [];
  return { text: raw.text.trim(), sourceRefs: refs };
}
function normalizePlan(raw: any, fallbackLabel: string): Plan | null {
  const components = {} as Record<Category, Component>;
  for (const category of CATEGORIES) {
    const c = normalizeComponent(raw?.components?.[category]);
    if (!c) return null;
    components[category] = c;
  }
  return { label: String(raw?.label || fallbackLabel), components };
}

async function generatePlans(apiKey: string, model: string, evidencePack: string): Promise<Plan[]> {
  const system = [
    GROUND_RULES,
    `สร้าง candidate revenue plans 8 แผนสำหรับ DSG ONE จาก evidence นี้ โดยมีหมวด ${CATEGORIES.join(', ')}`,
    'แต่ละ component ต้องเป็น {"text":"...","sourceRefs":["exact/path"]}; sourceRefs ใช้ path จาก evidence เท่านั้น',
    'ให้แผนหลากหลายและสามารถผสม component ข้ามแผนได้',
    'คืน JSON เท่านั้น {"plans":[{"label":"...","components":{...}}]}',
  ].join(' ');
  let best: Plan[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const payload = await chat(apiKey, model, {
      messages: [{ role: 'system', content: system }, { role: 'user', content: `${QUESTION}\n\nEVIDENCE:\n${evidencePack}` }],
      temperature: attempt === 0 ? 0.7 : 0.35,
      max_tokens: 6500,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
    const plans = (Array.isArray(parsed?.plans) ? parsed.plans : []).map((x: any, i: number) => normalizePlan(x, `candidate-${i + 1}`)).filter(Boolean) as Plan[];
    if (plans.length > best.length) best = plans;
    if (best.length >= 5) break;
  }
  return best.slice(0, 8);
}

async function rateComponents(apiKey: string, model: string, plans: Plan[], evidencePack: string) {
  const items = plans.flatMap((plan, candidateIndex) => CATEGORIES.map((category) => ({
    id: `${candidateIndex}:${category}`,
    candidateIndex,
    category,
    text: plan.components[category].text,
    sourceRefs: plan.components[category].sourceRefs,
  })));
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: `${GROUND_RULES} ประเมินทุก component: quality, grounding, coverage 0-100 และ safe true/false. คืน JSON เท่านั้น {"ratings":[{"id":"0:offer","quality":0,"grounding":0,"coverage":0,"safe":true}]}`,
      },
      { role: 'user', content: JSON.stringify({ evidence: evidencePack, items }) },
    ],
    temperature: 0,
    max_tokens: 5000,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const map = new Map<string, Rating>();
  for (const raw of Array.isArray(parsed?.ratings) ? parsed.ratings : []) {
    const id = String(raw?.id || '');
    if (!id) continue;
    map.set(id, { quality: clamp100(raw.quality), grounding: clamp100(raw.grounding), coverage: clamp100(raw.coverage), safe: Boolean(raw.safe) });
  }
  return map;
}

function buildOptions(plans: Plan[], ratings: Map<string, Rating>): Option[] {
  const options: Option[] = [];
  plans.forEach((plan, candidateIndex) => {
    CATEGORIES.forEach((category) => {
      const component = plan.components[category];
      const rating = ratings.get(`${candidateIndex}:${category}`) || { quality: 50, grounding: 0, coverage: 0, safe: false };
      const validRefs = component.sourceRefs.length > 0 && component.sourceRefs.every((ref) => VALID_SOURCE_PATHS.has(ref as any));
      const linearCost = (100 - rating.quality) * 90 + (100 - rating.grounding) * 120 + (100 - rating.coverage) * 70 + (rating.safe ? 0 : 350_000) + (validRefs ? 0 : 300_000) + candidateIndex * 3;
      options.push({ ...component, ...rating, variableIndex: options.length, candidateIndex, label: plan.label, category, validRefs, linearCost });
    });
  });
  return options;
}

async function ratePairs(apiKey: string, model: string, options: Option[]) {
  const pairs = EDGES.flatMap(([left, right]) => {
    const a = options.filter((o) => o.category === left);
    const b = options.filter((o) => o.category === right);
    return a.flatMap((x) => b.map((y) => ({ i: x.variableIndex, j: y.variableIndex, left, right, a: x.text, b: y.text })));
  });
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: 'ให้คะแนน semantic compatibility 0-100 ของทุกคู่สำหรับ workflow รายได้ DSG ONE; 100=ต่อกันเป็น flow เดียวกันชัดเจน, 0=ขัดกัน คืน JSON เท่านั้น {"pairs":[{"i":0,"j":1,"s":90}]}' },
      { role: 'user', content: JSON.stringify(pairs) },
    ],
    temperature: 0,
    max_tokens: 7500,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const scores = new Map<string, number>();
  for (const raw of Array.isArray(parsed?.pairs) ? parsed.pairs : []) {
    const i = Number(raw.i); const j = Number(raw.j);
    if (Number.isInteger(i) && Number.isInteger(j)) scores.set(`${i}:${j}`, clamp100(raw.s));
  }
  const terms: PairTerm[] = [];
  for (const pair of pairs) {
    const x = options[pair.i]; const y = options[pair.j];
    const compatibility = scores.get(`${pair.i}:${pair.j}`) ?? 50;
    const union = new Set([...x.sourceRefs, ...y.sourceRefs]);
    const maxSingle = Math.max(new Set(x.sourceRefs).size, new Set(y.sourceRefs).size);
    const diversityBonus = Math.min(900, Math.max(0, union.size - maxSingle) * 180);
    terms.push({ i: pair.i, j: pair.j, compatibility, diversityBonus, penalty: (100 - compatibility) * 85 - diversityBonus });
  }
  return terms;
}

function addPair(Q: number[][], i: number, j: number, total: number) {
  Q[i][j] += total / 2; Q[j][i] += total / 2;
}
function makeQubo(options: Option[], pairs: PairTerm[]) {
  const Q = Array.from({ length: options.length }, () => Array(options.length).fill(0));
  const linear = options.map((o) => o.linearCost);
  const exactPenalty = 7_000_000;
  for (const category of CATEGORIES) {
    const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex);
    idx.forEach((i) => { Q[i][i] -= exactPenalty; });
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) addPair(Q, idx[a], idx[b], exactPenalty * 2);
  }
  pairs.forEach((p) => addPair(Q, p.i, p.j, p.penalty));
  return { Q, linear, exactPenalty };
}
function cost(bits: number[], options: Option[], pairs: PairTerm[]) {
  return options.reduce((sum, o) => sum + (bits[o.variableIndex] ? o.linearCost : 0), 0) + pairs.reduce((sum, p) => sum + (bits[p.i] && bits[p.j] ? p.penalty : 0), 0);
}
function selected(bits: number[], options: Option[]) { return options.filter((o) => bits[o.variableIndex] === 1); }
function baselineBits(options: Option[]) { return options.map((o) => o.candidateIndex === 0 ? 1 : 0); }

async function z3Optimize(isingBits: number[], options: Option[], pairs: PairTerm[]) {
  const { Context, Z3 } = await init();
  const ctx = Context('dsg-grounded-pairwise-v2');
  const sources = [...VALID_SOURCE_PATHS];

  const addHardAndCost = (solver: any, vars: any[], label: string) => {
    vars.forEach((v) => { solver.add(v.ge(0)); solver.add(v.le(1)); });
    for (const category of CATEGORIES) {
      const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex);
      solver.add(idx.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[idx[0]]).eq(1));
    }
    for (const o of options) if (!o.safe || !o.validRefs || o.grounding < 65) solver.add(vars[o.variableIndex].eq(0));
    for (const p of pairs) if (p.compatibility < 45) solver.add(vars[p.i].add(vars[p.j]).le(1));

    const srcVars = sources.map((source, si) => {
      const s = ctx.Int.const(`${label}_src_${si}`); solver.add(s.ge(0)); solver.add(s.le(1));
      const idx = options.filter((o) => o.sourceRefs.includes(source)).map((o) => o.variableIndex);
      if (!idx.length) solver.add(s.eq(0));
      else {
        idx.forEach((i) => solver.add(s.ge(vars[i])));
        solver.add(s.le(idx.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[idx[0]])));
      }
      return s;
    });
    solver.add(srcVars.slice(1).reduce((acc, s) => acc.add(s), srcVars[0]).ge(3));

    const parts: any[] = options.map((o) => vars[o.variableIndex].mul(o.linearCost));
    pairs.forEach((p, pi) => {
      const z = ctx.Int.const(`${label}_pair_${pi}`); solver.add(z.ge(0)); solver.add(z.le(1));
      solver.add(z.le(vars[p.i])); solver.add(z.le(vars[p.j])); solver.add(z.ge(vars[p.i].add(vars[p.j]).sub(1)));
      parts.push(z.mul(p.penalty));
    });
    return parts.slice(1).reduce((acc, x) => acc.add(x), parts[0]);
  };

  const checkBits = async (bits: number[], label: string) => {
    const solver = new ctx.Solver(); const vars = options.map((_, i) => ctx.Int.const(`${label}_v_${i}`));
    addHardAndCost(solver, vars, label); vars.forEach((v, i) => solver.add(v.eq(bits[i])));
    return String(await solver.check());
  };

  const isingFeasibility = await checkBits(isingBits, 'ising');
  const baselineFeasibility = await checkBits(baselineBits(options), 'baseline');
  let bestBits: number[]; let bestCost: number;
  if (isingFeasibility === 'sat') { bestBits = isingBits.slice(); bestCost = cost(bestBits, options, pairs); }
  else {
    const seed = new ctx.Solver(); const vars = options.map((_, i) => ctx.Int.const(`seed_v_${i}`)); addHardAndCost(seed, vars, 'seed');
    const status = String(await seed.check()); if (status !== 'sat') return { isingFeasibility, baselineFeasibility, finalStatus: status, bestBits: [], bestCost: null, improvements: 0, optimality: status, version: 'unknown' };
    const m = seed.model(); bestBits = vars.map((v) => Number(m.eval(v).toString())); bestCost = cost(bestBits, options, pairs);
  }

  let improvements = 0;
  while (improvements < 50) {
    const solver = new ctx.Solver(); const vars = options.map((_, i) => ctx.Int.const(`better_${improvements}_v_${i}`));
    const total = addHardAndCost(solver, vars, `better_${improvements}`); solver.add(total.lt(bestCost));
    const status = String(await solver.check());
    if (status === 'unsat') {
      let version = 'unknown'; try { const v = Z3.get_version?.(); if (v) version = `${v.major}.${v.minor}.${v.build_number}`; } catch {}
      return { isingFeasibility, baselineFeasibility, finalStatus: 'sat', bestBits, bestCost, improvements, optimality: 'unsat_better_candidate', version };
    }
    if (status !== 'sat') return { isingFeasibility, baselineFeasibility, finalStatus: status, bestBits, bestCost, improvements, optimality: status, version: 'unknown' };
    const m = solver.model(); bestBits = vars.map((v) => Number(m.eval(v).toString())); bestCost = cost(bestBits, options, pairs); improvements++;
  }
  throw new Error('Z3 optimization exceeded 50 improvements');
}

async function compileBoth(apiKey: string, model: string, baselinePlan: Plan, compositeOptions: Option[], evidencePack: string) {
  const composite = Object.fromEntries(compositeOptions.map((o) => [o.category, { text: o.text, sourceRefs: o.sourceRefs }]));
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: `${GROUND_RULES} เรียบเรียงสองชุด components เป็นคำตอบภาษาไทยที่อ่านง่ายและใช้งานได้จริง ห้ามเพิ่ม claim ใหม่ ต้องบอก implemented vs ต้องตั้งค่า/ตรวจสอบ คืน JSON เท่านั้น {"baseline":"...","composite":"..."}` },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, baselineComponents: baselinePlan.components, compositeComponents: composite }) },
    ],
    temperature: 0,
    max_tokens: 2800,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return { baseline: String(parsed.baseline || '').trim(), composite: String(parsed.composite || '').trim() };
}

async function judge(apiKey: string, model: string, answers: string[], evidencePack: string): Promise<AnswerScore[]> {
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: 'ให้คะแนนคำตอบแต่ละข้ออย่างอิสระ 0-20 ใน relevance,revenueClarity,automationQuality,actionability,groundingAndRisk รวม 100; feasible=false ถ้ามี claim สำคัญไม่รองรับ evidence หรือ flow ใช้ไม่ได้ คืน JSON เท่านั้น {"scores":[{"index":0,"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"groundingAndRisk":0,"total":0,"feasible":true,"reason":"..."}]}' },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, answers: answers.map((answer, index) => ({ index, answer })) }) },
    ],
    temperature: 0,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return (Array.isArray(parsed?.scores) ? parsed.scores : []).map((x: any) => ({ relevance: Number(x.relevance), revenueClarity: Number(x.revenueClarity), automationQuality: Number(x.automationQuality), actionability: Number(x.actionability), groundingAndRisk: Number(x.groundingAndRisk), total: Number(x.total), feasible: Boolean(x.feasible), reason: String(x.reason || '') }));
}

describe('DSG ONE grounded pairwise revenue benchmark v2', () => {
  it.skipIf(!RUN_LIVE)('uses DSG ONE repo data -> Baseline+Top-K -> QUBO/Ising -> final-only Z3 -> quality floor', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim(); expect(apiKey).toBeTruthy();
    const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
    const evidence = loadEvidence();
    const basePlan = canonicalBaseline();
    const generated = await generatePlans(apiKey!, model, evidence.pack); expect(generated.length, 'Need >=4 generated plans').toBeGreaterThanOrEqual(4);
    const plans = [basePlan, ...generated];
    const ratings = await rateComponents(apiKey!, model, plans, evidence.pack);
    const options = buildOptions(plans, ratings);
    const pairs = await ratePairs(apiKey!, model, options);
    const { Q, linear, exactPenalty } = makeQubo(options, pairs);
    const seed = 777;
    const first = solveQubo({ Q, linear, numVariables: options.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: options.length, seed }));
    const replay20 = replays.every((r) => r.energy === first.energy && JSON.stringify(r.solution) === JSON.stringify(first.solution)); expect(replay20).toBe(true);

    const z3 = await z3Optimize(first.solution, options, pairs); expect(z3.finalStatus).toBe('sat'); expect(z3.bestBits.length).toBe(options.length);
    const chosen = selected(z3.bestBits, options); expect(chosen.length).toBe(CATEGORIES.length);
    const answers = await compileBoth(apiKey!, model, basePlan, chosen, evidence.pack); expect(answers.baseline.length).toBeGreaterThan(100); expect(answers.composite.length).toBeGreaterThan(100);
    const scores = await judge(apiKey!, model, [answers.baseline, answers.composite], evidence.pack); expect(scores.length).toBe(2);
    const baselineScore = scores[0]; const compositeScore = scores[1];

    let finalDecision: 'USE_COMPOSITE' | 'USE_BASELINE' | 'BLOCK';
    if (compositeScore.feasible && (compositeScore.total >= baselineScore.total || z3.baselineFeasibility !== 'sat' || !baselineScore.feasible)) finalDecision = 'USE_COMPOSITE';
    else if (z3.baselineFeasibility === 'sat' && baselineScore.feasible) finalDecision = 'USE_BASELINE';
    else finalDecision = 'BLOCK';
    const delivered = finalDecision === 'USE_COMPOSITE' ? answers.composite : finalDecision === 'USE_BASELINE' ? answers.baseline : '';
    const deliveredTotal = finalDecision === 'USE_COMPOSITE' ? compositeScore.total : finalDecision === 'USE_BASELINE' ? baselineScore.total : 0;
    const selectedSources = [...new Set(chosen.flatMap((o) => o.sourceRefs))].sort();

    const report = {
      schema: 'dsg-revenue-grounded-pairwise-final-z3-v2', question: QUESTION, model,
      architecture: 'DSG repo evidence -> canonical baseline + top-k -> full binary pool -> pairwise+coverage QUBO/Ising -> final-only Z3 -> compile -> score floor',
      noPreZ3: true, sourceEvidence: evidence.sources,
      pool: { plans: plans.length, generatedPlans: generated.length, categories: CATEGORIES.length, binaryVariables: options.length, pairTerms: pairs.length },
      baseline: { answer: answers.baseline, answerHash: sha256(answers.baseline), structuredFeasibility: z3.baselineFeasibility, score: baselineScore },
      search: { seed, solverVersion: first.version, exactPenalty, isingEnergy: first.energy, isingEvaluations: first.evaluations, replay20, isingFeasibility: z3.isingFeasibility, z3Improvements: z3.improvements, z3Optimality: z3.optimality, z3Version: z3.version, bestCost: z3.bestCost },
      selected: chosen.map((o) => ({ category: o.category, candidateIndex: o.candidateIndex, label: o.label, text: o.text, sourceRefs: o.sourceRefs, quality: o.quality, grounding: o.grounding, coverage: o.coverage })),
      selectedSources,
      composite: { answer: answers.composite, answerHash: sha256(answers.composite), score: compositeScore },
      comparison: { baselineTotal: baselineScore.total, compositeTotal: compositeScore.total, delta: compositeScore.total - baselineScore.total },
      finalDecision,
      delivered: { answer: delivered, answerHash: sha256(delivered), total: deliveredTotal },
    };
    const evidenceHash = sha256(report); const output = { ...report, evidenceHash };
    mkdirSync('artifacts', { recursive: true }); writeFileSync('artifacts/revenue-automation-dsg-grounded-pairwise-v2.json', `${JSON.stringify(output, null, 2)}\n`);
    console.log('DSG_REVENUE_GROUNDED_PAIRWISE_V2', JSON.stringify({ baselineTotal: baselineScore.total, compositeTotal: compositeScore.total, delta: compositeScore.total - baselineScore.total, finalDecision, deliveredTotal, plans: plans.length, binaryVariables: options.length, pairTerms: pairs.length, selectedSources, isingFeasibility: z3.isingFeasibility, baselineFeasibility: z3.baselineFeasibility, z3Improvements: z3.improvements, z3Optimality: z3.optimality, replay20, evidenceHash }));
  }, 300_000);
});
