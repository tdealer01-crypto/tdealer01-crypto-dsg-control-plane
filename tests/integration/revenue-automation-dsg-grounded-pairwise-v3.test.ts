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
  { path: 'app/api/billing/checkout/route.ts', authority: 'implementation', keywords: ['checkout.sessions.create', 'allow_promotion_codes', 'trialDays', 'getMeteredBillingConfiguration', 'plan_key', 'isMCPSubscription', 'isSkillsBundle'] },
  { path: 'app/api/billing/webhook/route.ts', authority: 'implementation', keywords: ['claimEventProcessing', 'billing_events', 'fulfillSubscription', 'revokeSubscription', 'handleMCPSubscriptionActivation', 'lookupRefCode', 'sendUpgradeSuccess'] },
  { path: 'lib/billing/fulfillment.ts', authority: 'implementation', keywords: ['Idempotent', 'atomic', 'sync_dsg_paid_entitlement', 'fulfillSubscription', 'revokeSubscription'] },
  { path: 'lib/billing/metered.ts', authority: 'implementation', keywords: ['durable outbox', 'getMeteredBillingConfiguration', 'billing_meter_outbox', 'idempotencyKeyForExecution', 'reportMeterEvent'] },
  { path: 'lib/revenue/events.ts', authority: 'implementation', keywords: ['insertRevenueEvent', 'listRevenueEvents', 'idempotency_key', 'stripe_event_id', 'revenue_events'] },
  { path: 'app/api/billing/portal/route.ts', authority: 'implementation', keywords: ['billingPortal.sessions.create', 'billing_customers', 'dashboard/billing'] },
  { path: 'docs/REVENUE_SYSTEM_DESIGN.md', authority: 'planning-context', keywords: ['Revenue Flows', 'Delivery Proof Report Generation', 'Revenue Dashboard Widget', 'Implementation Roadmap'] },
] as const;
const VALID_SOURCES = new Set(SOURCE_SPECS.map((s) => s.path));
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
function excerpt(path: string, keywords: readonly string[]) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (!keywords.some((k) => lines[i].toLowerCase().includes(k.toLowerCase()))) continue;
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 7); j++) keep.add(j);
  }
  return [...keep].sort((a, b) => a - b).map((i) => `${i + 1}: ${lines[i]}`).join('\n').slice(0, 7000);
}
function loadEvidence() {
  const sources = SOURCE_SPECS.map((spec) => {
    const full = readFileSync(spec.path, 'utf8');
    return { path: spec.path, authority: spec.authority, sha256: sha256(full), excerpt: excerpt(spec.path, spec.keywords) };
  });
  return { sources, pack: sources.map((s) => `SOURCE: ${s.path}\nAUTHORITY: ${s.authority}\nSHA256: ${s.sha256}\n${s.excerpt}`).join('\n\n---\n\n').slice(0, 48000) };
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
  'สิ่งที่มีเพียงใน roadmap ต้องระบุว่า planned/not yet verified ไม่ใช่ live',
  'ห้ามแต่งยอดผู้ใช้ รายได้ conversion หรือ production status',
  'ห้ามการันตีรายได้',
].join(' ');

function groundedPlans(): Plan[] {
  const coreCheckout: Component = {
    text: 'ใช้ /api/billing/checkout สร้าง Stripe Checkout Session จาก pricing catalog; core plan ใช้ env-configured Price IDs แบบ fail-closed และ Skills Bundles ใช้ inline price_data',
    sourceRefs: ['app/api/billing/checkout/route.ts', 'lib/billing/pricing-catalog.ts'],
  };
  const coreFulfillment: Component = {
    text: 'หลัง Stripe event ให้ canonical webhook claim billing event แบบ idempotent แล้ว sync paid entitlement ผ่าน fulfillSubscription ซึ่งใช้ atomic database RPC; persistence failure ต้อง fail เพื่อให้ Stripe retry',
    sourceRefs: ['app/api/billing/webhook/route.ts', 'lib/billing/fulfillment.ts'],
  };
  const coreMetrics: Component = {
    text: 'บันทึก revenue_events โดยใช้ idempotency_key หรือ stripe_event_id เมื่อมี และ query รายการรายได้ตาม org; แยก implementation facts ออกจาก roadmap และ fail closed เมื่อ billing configuration ไม่ครบ',
    sourceRefs: ['lib/revenue/events.ts', 'lib/billing/metered.ts', 'docs/REVENUE_SYSTEM_DESIGN.md'],
  };
  const trialAcquisition: Component = {
    text: 'ใช้ trial ที่ pricing catalog กำหนด (Pro/Business 14 วัน, Enterprise 30 วัน) ร่วมกับ promotion codes ใน Checkout และ ref_code ที่ webhook resolve จาก trial/access records โดยไม่สมมติ conversion rate',
    sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/checkout/route.ts', 'app/api/billing/webhook/route.ts'],
  };
  const portalRetention: Component = {
    text: 'ให้ลูกค้าจัดการ billing แบบ self-service ผ่าน Stripe Billing Portal แล้วเสนอ add-on ที่ pricing catalog รองรับ โดยต้องตรวจ price/environment configuration ก่อนเปิดขายจริง',
    sourceRefs: ['app/api/billing/portal/route.ts', 'lib/billing/pricing-catalog.ts'],
  };

  return [
    {
      label: 'core-saas-subscription',
      components: {
        offer: { text: 'ขาย DSG ONE เป็น core SaaS subscription: Pro $99/เดือน, Business $199/เดือน, Enterprise $499/เดือน ตาม pricing catalog', sourceRefs: ['lib/billing/pricing-catalog.ts'] },
        acquisition: trialAcquisition,
        checkout: coreCheckout,
        fulfillment: coreFulfillment,
        usageRevenue: { text: 'เริ่มจาก subscription revenue ก่อน และเปิด usage overage เฉพาะเมื่อ Stripe metering contract ตั้งค่าครบตาม getMeteredBillingConfiguration', sourceRefs: ['lib/billing/metered.ts'] },
        retentionUpsell: portalRetention,
        metricsRisk: coreMetrics,
      },
    },
    {
      label: 'pro-plus-metered-overage',
      components: {
        offer: { text: 'ใช้ Pro $99/เดือนเป็นฐาน แล้วเพิ่ม usage-based overage เมื่อ metering configuration ครบ เพื่อให้รายได้โตตามจำนวน execution โดยไม่คิด usage ซ้ำ', sourceRefs: ['lib/billing/pricing-catalog.ts', 'lib/billing/metered.ts'] },
        acquisition: trialAcquisition,
        checkout: { text: 'Checkout ของ core plan อ่าน Pro price จาก environment และสามารถแนบ metered billing item ได้เมื่อ getMeteredBillingConfiguration รายงานว่าพร้อม', sourceRefs: ['app/api/billing/checkout/route.ts', 'lib/billing/metered.ts', 'lib/billing/pricing-catalog.ts'] },
        fulfillment: coreFulfillment,
        usageRevenue: { text: 'ทุก execution ที่คิดเงินต้องสร้าง durable billing_meter_outbox ก่อนส่ง Stripe Meter event และใช้ executionId เป็น idempotency key; ถ้าไม่มี durable evidence ให้ fail closed', sourceRefs: ['lib/billing/metered.ts'] },
        retentionUpsell: portalRetention,
        metricsRisk: { text: 'ติดตาม meter outbox/revenue events และอย่าเปิด metered revenue ถ้า STRIPE_SECRET_KEY, event name, meter id หรือ overage price ยังขาด', sourceRefs: ['lib/billing/metered.ts', 'lib/revenue/events.ts'] },
      },
    },
    {
      label: 'skills-bundle-upsell',
      components: {
        offer: { text: 'เพิ่มรายได้ต่อบัญชีด้วย Skills Bundles ที่มีใน pricing catalog เช่น Finance, Dev, Compliance, Ops และ Enterprise bundle; checkout ใช้ inline price_data', sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/checkout/route.ts'] },
        acquisition: { text: 'ใช้ skills marketplace link/checkout ร่วมกับ promotion codes และผูก org/user metadata เพื่อพาผู้ใช้จากการทดลอง core product ไปยัง bundle ที่ตรงงาน', sourceRefs: ['app/api/billing/checkout/route.ts'] },
        checkout: coreCheckout,
        fulfillment: { text: 'หลังชำระเงินต้องยืนยันว่า bundle-specific entitlement/fulfillment ถูกผูกกับ canonical webhook ก่อนถือว่า revenue flow จบ; อย่าอ้างว่า access ถูก provision แล้วถ้ายังไม่มี evidence ของ bundle entitlement', sourceRefs: ['app/api/billing/webhook/route.ts', 'lib/billing/fulfillment.ts'] },
        usageRevenue: { text: 'Skills Bundle เป็น recurring inline-price subscription; usage overage เป็นคนละ revenue stream และควรเปิดเฉพาะเมื่อ metering config ครบ', sourceRefs: ['app/api/billing/checkout/route.ts', 'lib/billing/metered.ts'] },
        retentionUpsell: portalRetention,
        metricsRisk: coreMetrics,
      },
    },
    {
      label: 'delivery-proof-upsell',
      components: {
        offer: { text: 'ใช้ Delivery Proof เป็น entry/upsell: pricing catalog มี free, pro_scan $49 แบบ one-time และ unlimited $199 ที่ผูกกับ Business plan', sourceRefs: ['lib/billing/pricing-catalog.ts'] },
        acquisition: { text: 'ใช้ free tier/one-time pro scan เป็น low-friction entry แล้วค่อยเสนอ unlimited/Business เมื่อผู้ใช้ต้องการใช้งานต่อเนื่อง โดยไม่สมมติ conversion rate', sourceRefs: ['lib/billing/pricing-catalog.ts'] },
        checkout: { text: 'ใช้ billing checkout/pricing catalog สำหรับรายการที่รองรับ และต้องตรวจเส้นทาง charge จริงของ Delivery Proof ก่อนประกาศว่า automated checkout ครบทุก tier', sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/checkout/route.ts'] },
        fulfillment: { text: 'อย่าอ้าง automatic report generation ว่า live จากเอกสาร roadmap; docs ระบุ Delivery Proof report generation เป็นงานที่ต้องทำ/ตรวจสอบ จึงต้องมี evidence เพิ่มก่อนเปิด fulfillment อัตโนมัติเต็มรูป', sourceRefs: ['docs/REVENUE_SYSTEM_DESIGN.md'] },
        usageRevenue: { text: 'Delivery Proof one-time/unlimited pricing เป็นคนละ stream กับ execution metering; metered overage เปิดแยกตาม contract ใน metered.ts', sourceRefs: ['lib/billing/pricing-catalog.ts', 'lib/billing/metered.ts'] },
        retentionUpsell: { text: 'ใช้ pro_scan เป็น entry แล้ว upsell ไป unlimited/Business หรือ Skills Bundles ที่ pricing catalog มี โดยให้ Billing Portal ดูแล subscription ที่มี Stripe customer', sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/portal/route.ts'] },
        metricsRisk: coreMetrics,
      },
    },
    {
      label: 'mcp-api-subscription',
      components: {
        offer: { text: 'ขาย MCP API subscription ที่ pricing catalog กำหนด 10,000 calls/เดือน โดยใช้ env-driven Stripe price; ห้าม hard-code ราคา charge จากข้อความอธิบายอัตราแลกเปลี่ยน', sourceRefs: ['lib/billing/pricing-catalog.ts'] },
        acquisition: { text: 'ใช้ core trial/referral flow พาผู้ใช้ที่ต้องการ API automation ไป MCP subscription และอย่าประกาศซื้อได้หาก STRIPE_PRICE_MCP_MONTHLY ยังไม่ตั้งค่า', sourceRefs: ['app/api/billing/checkout/route.ts', 'app/api/billing/webhook/route.ts', 'lib/billing/pricing-catalog.ts'] },
        checkout: { text: 'Checkout มี branch สำหรับ MCP subscription และจะคืน 503 ถ้า MCP Stripe price config ยังไม่พร้อม จึงเป็น fail-closed monetization path', sourceRefs: ['app/api/billing/checkout/route.ts', 'lib/billing/pricing-catalog.ts'] },
        fulfillment: { text: 'Canonical webhook มี handleMCPSubscriptionActivation สำหรับ activation path; ต้องอาศัย org/email resolution และ webhook evidence ก่อนถือว่า API access ถูกสร้างสำเร็จ', sourceRefs: ['app/api/billing/webhook/route.ts'] },
        usageRevenue: { text: 'MCP package limit 10,000 calls/เดือนมาจาก pricing catalog; execution metering ใน metered.ts เป็น revenue mechanism แยกและไม่ควรผสม billing unit โดยไม่มี contract ชัดเจน', sourceRefs: ['lib/billing/pricing-catalog.ts', 'lib/billing/metered.ts'] },
        retentionUpsell: portalRetention,
        metricsRisk: coreMetrics,
      },
    },
    {
      label: 'enterprise-self-service-and-audit',
      components: {
        offer: { text: 'ใช้ Enterprise $499/เดือนเป็น high-value core tier และเสนอ Enterprise Skills Bundle เป็น add-on ที่ catalog แยกไว้', sourceRefs: ['lib/billing/pricing-catalog.ts'] },
        acquisition: { text: 'Enterprise มี trial 30 วันตาม catalog; promotion codes/ref_code รองรับ acquisition mechanics แต่ต้องวัดผลจริงจาก revenue/events แทนการสมมติ conversion', sourceRefs: ['lib/billing/pricing-catalog.ts', 'app/api/billing/checkout/route.ts', 'app/api/billing/webhook/route.ts', 'lib/revenue/events.ts'] },
        checkout: coreCheckout,
        fulfillment: coreFulfillment,
        usageRevenue: { text: 'เก็บ recurring subscription เป็นหลัก; usage overage เปิดเฉพาะ contract ที่ metered.ts ระบุว่าคอนฟิกครบ และต้องมี durable outbox evidence', sourceRefs: ['lib/billing/metered.ts'] },
        retentionUpsell: { text: 'ใช้ Billing Portal ให้ลูกค้าจัดการ billing เอง ลดงาน manual และใช้ catalog เป็น source of truth สำหรับ upsell/add-on ที่มีอยู่', sourceRefs: ['app/api/billing/portal/route.ts', 'lib/billing/pricing-catalog.ts'] },
        metricsRisk: { text: 'ใช้ billing_events/revenue_events เป็น audit/revenue evidence และถือ revenue dashboard/reconciliation ที่อยู่ใน planning docs เป็น roadmap จนกว่าจะมี implementation evidence', sourceRefs: ['app/api/billing/webhook/route.ts', 'lib/revenue/events.ts', 'docs/REVENUE_SYSTEM_DESIGN.md'] },
      },
    },
  ];
}

async function rateComponents(apiKey: string, model: string, plans: Plan[], evidencePack: string) {
  const items = plans.flatMap((plan, candidateIndex) => CATEGORIES.map((category) => ({ id: `${candidateIndex}:${category}`, category, text: plan.components[category].text, sourceRefs: plan.components[category].sourceRefs })));
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: `${GROUND_RULES} ประเมิน component ทุกตัวจาก evidence: quality,grounding,coverage 0-100 และ safe true/false. คืน JSON เท่านั้น {"ratings":[{"id":"0:offer","quality":0,"grounding":0,"coverage":0,"safe":true}]}` },
      { role: 'user', content: JSON.stringify({ evidence: evidencePack, items }) },
    ],
    temperature: 0,
    max_tokens: 5000,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const map = new Map<string, Rating>();
  for (const raw of Array.isArray(parsed?.ratings) ? parsed.ratings : []) {
    const id = String(raw.id || ''); if (!id) continue;
    map.set(id, { quality: clamp100(raw.quality), grounding: clamp100(raw.grounding), coverage: clamp100(raw.coverage), safe: Boolean(raw.safe) });
  }
  return map;
}

function buildOptions(plans: Plan[], ratings: Map<string, Rating>) {
  const options: Option[] = [];
  plans.forEach((plan, candidateIndex) => CATEGORIES.forEach((category) => {
    const component = plan.components[category];
    const rating = ratings.get(`${candidateIndex}:${category}`) || { quality: 55, grounding: 70, coverage: 55, safe: true };
    const validRefs = component.sourceRefs.length > 0 && component.sourceRefs.every((ref) => VALID_SOURCES.has(ref as any));
    const linearCost = (100 - rating.quality) * 90 + (100 - rating.grounding) * 120 + (100 - rating.coverage) * 70 + (rating.safe ? 0 : 350_000) + (validRefs ? 0 : 300_000) + candidateIndex * 3;
    options.push({ ...component, ...rating, variableIndex: options.length, candidateIndex, label: plan.label, category, validRefs, linearCost });
  }));
  return options;
}

async function pairTerms(apiKey: string, model: string, options: Option[]) {
  const pairs = EDGES.flatMap(([left, right]) => {
    const a = options.filter((o) => o.category === left); const b = options.filter((o) => o.category === right);
    return a.flatMap((x) => b.map((y) => ({ i: x.variableIndex, j: y.variableIndex, left, right, a: x.text, b: y.text })));
  });
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: 'ให้คะแนน semantic compatibility 0-100 ของทุกคู่สำหรับ workflow รายได้ DSG ONE; 100=ต่อกันดี, 0=ขัดกัน. คืน JSON compact เท่านั้น {"pairs":[{"i":0,"j":1,"s":90}]}' },
      { role: 'user', content: JSON.stringify(pairs) },
    ],
    temperature: 0,
    max_tokens: 6500,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const scoreMap = new Map<string, number>();
  for (const raw of Array.isArray(parsed?.pairs) ? parsed.pairs : []) {
    const i = Number(raw.i); const j = Number(raw.j); if (Number.isInteger(i) && Number.isInteger(j)) scoreMap.set(`${i}:${j}`, clamp100(raw.s));
  }
  return pairs.map((p) => {
    const x = options[p.i]; const y = options[p.j]; const compatibility = scoreMap.get(`${p.i}:${p.j}`) ?? 55;
    const union = new Set([...x.sourceRefs, ...y.sourceRefs]); const maxSingle = Math.max(new Set(x.sourceRefs).size, new Set(y.sourceRefs).size);
    const diversityBonus = Math.min(900, Math.max(0, union.size - maxSingle) * 180);
    return { i: p.i, j: p.j, compatibility, diversityBonus, penalty: (100 - compatibility) * 85 - diversityBonus } satisfies PairTerm;
  });
}

function addPair(Q: number[][], i: number, j: number, total: number) { Q[i][j] += total / 2; Q[j][i] += total / 2; }
function makeQubo(options: Option[], pairs: PairTerm[]) {
  const Q = Array.from({ length: options.length }, () => Array(options.length).fill(0)); const linear = options.map((o) => o.linearCost); const exactPenalty = 7_000_000;
  for (const category of CATEGORIES) {
    const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex); idx.forEach((i) => { Q[i][i] -= exactPenalty; });
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) addPair(Q, idx[a], idx[b], exactPenalty * 2);
  }
  pairs.forEach((p) => addPair(Q, p.i, p.j, p.penalty)); return { Q, linear, exactPenalty };
}
function assignmentCost(bits: number[], options: Option[], pairs: PairTerm[]) {
  return options.reduce((s, o) => s + (bits[o.variableIndex] ? o.linearCost : 0), 0) + pairs.reduce((s, p) => s + (bits[p.i] && bits[p.j] ? p.penalty : 0), 0);
}
function selected(bits: number[], options: Option[]) { return options.filter((o) => bits[o.variableIndex] === 1); }
function baselineBits(options: Option[]) { return options.map((o) => o.candidateIndex === 0 ? 1 : 0); }

async function z3Optimize(isingBits: number[], options: Option[], pairs: PairTerm[]) {
  const { Context, Z3 } = await init(); const ctx = Context('dsg-revenue-v3'); const sourcePaths = [...VALID_SOURCES];
  const addHardAndCost = (solver: any, vars: any[], label: string) => {
    vars.forEach((v) => { solver.add(v.ge(0)); solver.add(v.le(1)); });
    for (const category of CATEGORIES) {
      const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex); solver.add(idx.slice(1).reduce((a, i) => a.add(vars[i]), vars[idx[0]]).eq(1));
    }
    options.forEach((o) => { if (!o.safe || !o.validRefs || o.grounding < 60) solver.add(vars[o.variableIndex].eq(0)); });
    pairs.forEach((p) => { if (p.compatibility < 40) solver.add(vars[p.i].add(vars[p.j]).le(1)); });
    const srcVars = sourcePaths.map((source, si) => {
      const sv = ctx.Int.const(`${label}_src_${si}`); solver.add(sv.ge(0)); solver.add(sv.le(1)); const idx = options.filter((o) => o.sourceRefs.includes(source)).map((o) => o.variableIndex);
      if (!idx.length) solver.add(sv.eq(0)); else { idx.forEach((i) => solver.add(sv.ge(vars[i]))); solver.add(sv.le(idx.slice(1).reduce((a, i) => a.add(vars[i]), vars[idx[0]]))); } return sv;
    });
    solver.add(srcVars.slice(1).reduce((a, s) => a.add(s), srcVars[0]).ge(3));
    const parts: any[] = options.map((o) => vars[o.variableIndex].mul(o.linearCost));
    pairs.forEach((p, pi) => { const z = ctx.Int.const(`${label}_p_${pi}`); solver.add(z.ge(0)); solver.add(z.le(1)); solver.add(z.le(vars[p.i])); solver.add(z.le(vars[p.j])); solver.add(z.ge(vars[p.i].add(vars[p.j]).sub(1))); parts.push(z.mul(p.penalty)); });
    return parts.slice(1).reduce((a, x) => a.add(x), parts[0]);
  };
  const check = async (bits: number[], label: string) => { const s = new ctx.Solver(); const v = options.map((_, i) => ctx.Int.const(`${label}_v_${i}`)); addHardAndCost(s, v, label); v.forEach((x, i) => s.add(x.eq(bits[i]))); return String(await s.check()); };
  const isingFeasibility = await check(isingBits, 'ising'); const baselineFeasibility = await check(baselineBits(options), 'baseline');
  let bestBits: number[]; let bestCost: number;
  if (isingFeasibility === 'sat') { bestBits = isingBits.slice(); bestCost = assignmentCost(bestBits, options, pairs); }
  else { const s = new ctx.Solver(); const v = options.map((_, i) => ctx.Int.const(`seed_v_${i}`)); addHardAndCost(s, v, 'seed'); const st = String(await s.check()); if (st !== 'sat') return { isingFeasibility, baselineFeasibility, finalStatus: st, bestBits: [], bestCost: null, improvements: 0, optimality: st, version: 'unknown' }; const m = s.model(); bestBits = v.map((x) => Number(m.eval(x).toString())); bestCost = assignmentCost(bestBits, options, pairs); }
  let improvements = 0;
  while (improvements < 40) {
    const s = new ctx.Solver(); const v = options.map((_, i) => ctx.Int.const(`b${improvements}_v_${i}`)); const total = addHardAndCost(s, v, `b${improvements}`); s.add(total.lt(bestCost)); const st = String(await s.check());
    if (st === 'unsat') { let version = 'unknown'; try { const zv = Z3.get_version?.(); if (zv) version = `${zv.major}.${zv.minor}.${zv.build_number}`; } catch {} return { isingFeasibility, baselineFeasibility, finalStatus: 'sat', bestBits, bestCost, improvements, optimality: 'unsat_better_candidate', version }; }
    if (st !== 'sat') return { isingFeasibility, baselineFeasibility, finalStatus: st, bestBits, bestCost, improvements, optimality: st, version: 'unknown' };
    const m = s.model(); bestBits = v.map((x) => Number(m.eval(x).toString())); bestCost = assignmentCost(bestBits, options, pairs); improvements++;
  }
  throw new Error('Z3 optimization exceeded 40 improvements');
}

async function compileBoth(apiKey: string, model: string, basePlan: Plan, chosen: Option[], evidencePack: string) {
  const composite = Object.fromEntries(chosen.map((o) => [o.category, { text: o.text, sourceRefs: o.sourceRefs }]));
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: `${GROUND_RULES} เรียบเรียง baselineComponents และ compositeComponents เป็นคำตอบภาษาไทย 2 คำตอบที่อ่านง่าย ใช้งานได้จริง และบอก implemented vs ต้องตั้งค่า/ตรวจสอบ ห้ามเพิ่ม claim ใหม่ คืน JSON {"baseline":"...","composite":"..."}` },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, baselineComponents: basePlan.components, compositeComponents: composite }) },
    ], temperature: 0, max_tokens: 3000, response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}')); return { baseline: String(parsed.baseline || '').trim(), composite: String(parsed.composite || '').trim() };
}

async function judge(apiKey: string, model: string, answers: string[], evidencePack: string): Promise<AnswerScore[]> {
  const payload = await chat(apiKey, model, {
    messages: [
      { role: 'system', content: 'ให้คะแนนแต่ละคำตอบ 0-20 ใน relevance,revenueClarity,automationQuality,actionability,groundingAndRisk รวม 100; feasible=false ถ้ามี claim สำคัญไม่รองรับ evidence หรือ flow ใช้ไม่ได้; implementation evidence สำคัญกว่า planning docs คืน JSON เท่านั้น' },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, schema: { scores: [{ index: 0, relevance: 0, revenueClarity: 0, automationQuality: 0, actionability: 0, groundingAndRisk: 0, total: 0, feasible: true, reason: '' }] }, answers: answers.map((answer, index) => ({ index, answer })) }) },
    ], temperature: 0, max_tokens: 2000, response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  return (Array.isArray(parsed?.scores) ? parsed.scores : []).map((x: any) => ({ relevance: Number(x.relevance), revenueClarity: Number(x.revenueClarity), automationQuality: Number(x.automationQuality), actionability: Number(x.actionability), groundingAndRisk: Number(x.groundingAndRisk), total: Number(x.total), feasible: Boolean(x.feasible), reason: String(x.reason || '') }));
}

describe('DSG ONE deterministic grounded revenue pool v3', () => {
  it.skipIf(!RUN_LIVE)('DSG repo -> deterministic candidate pool -> pairwise QUBO/Ising -> final-only Z3 -> grounded quality floor', async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim(); expect(apiKey).toBeTruthy(); const model = process.env.OPENAI_LOGPROB_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
    const evidence = loadEvidence(); const plans = groundedPlans(); expect(plans.length).toBe(6);
    const ratings = await rateComponents(apiKey!, model, plans, evidence.pack); const options = buildOptions(plans, ratings); const pairs = await pairTerms(apiKey!, model, options);
    const { Q, linear, exactPenalty } = makeQubo(options, pairs); const seed = 777; const first = solveQubo({ Q, linear, numVariables: options.length, seed });
    const replays = Array.from({ length: 20 }, () => solveQubo({ Q, linear, numVariables: options.length, seed })); const replay20 = replays.every((r) => r.energy === first.energy && JSON.stringify(r.solution) === JSON.stringify(first.solution)); expect(replay20).toBe(true);
    const z3 = await z3Optimize(first.solution, options, pairs); expect(z3.finalStatus).toBe('sat'); const chosen = selected(z3.bestBits, options); expect(chosen.length).toBe(CATEGORIES.length);
    const answers = await compileBoth(apiKey!, model, plans[0], chosen, evidence.pack); expect(answers.baseline.length).toBeGreaterThan(100); expect(answers.composite.length).toBeGreaterThan(100);
    const scores = await judge(apiKey!, model, [answers.baseline, answers.composite], evidence.pack); expect(scores.length).toBe(2); const baselineScore = scores[0]; const compositeScore = scores[1];
    let finalDecision: 'USE_COMPOSITE' | 'USE_BASELINE' | 'BLOCK';
    if (compositeScore.feasible && (compositeScore.total >= baselineScore.total || z3.baselineFeasibility !== 'sat' || !baselineScore.feasible)) finalDecision = 'USE_COMPOSITE'; else if (z3.baselineFeasibility === 'sat' && baselineScore.feasible) finalDecision = 'USE_BASELINE'; else finalDecision = 'BLOCK';
    const delivered = finalDecision === 'USE_COMPOSITE' ? answers.composite : finalDecision === 'USE_BASELINE' ? answers.baseline : ''; const deliveredTotal = finalDecision === 'USE_COMPOSITE' ? compositeScore.total : finalDecision === 'USE_BASELINE' ? baselineScore.total : 0; const selectedSources = [...new Set(chosen.flatMap((o) => o.sourceRefs))].sort();
    const report = { schema: 'dsg-revenue-grounded-pairwise-final-z3-v3', question: QUESTION, model, architecture: 'DSG implementation evidence -> deterministic Baseline+Top-K component pool -> pairwise+coverage QUBO/Ising -> final-only Z3 -> compile -> score floor', noPreZ3: true, sourceEvidence: evidence.sources, pool: { plans: plans.length, categories: CATEGORIES.length, binaryVariables: options.length, pairTerms: pairs.length }, baseline: { answer: answers.baseline, answerHash: sha256(answers.baseline), structuredFeasibility: z3.baselineFeasibility, score: baselineScore }, search: { seed, solverVersion: first.version, exactPenalty, isingEnergy: first.energy, isingEvaluations: first.evaluations, replay20, isingFeasibility: z3.isingFeasibility, z3Improvements: z3.improvements, z3Optimality: z3.optimality, z3Version: z3.version, bestCost: z3.bestCost }, selected: chosen.map((o) => ({ category: o.category, candidateIndex: o.candidateIndex, label: o.label, text: o.text, sourceRefs: o.sourceRefs, quality: o.quality, grounding: o.grounding, coverage: o.coverage })), selectedSources, composite: { answer: answers.composite, answerHash: sha256(answers.composite), score: compositeScore }, comparison: { baselineTotal: baselineScore.total, compositeTotal: compositeScore.total, delta: compositeScore.total - baselineScore.total }, finalDecision, delivered: { answer: delivered, answerHash: sha256(delivered), total: deliveredTotal } };
    const evidenceHash = sha256(report); mkdirSync('artifacts', { recursive: true }); writeFileSync('artifacts/revenue-automation-dsg-grounded-pairwise-v3.json', `${JSON.stringify({ ...report, evidenceHash }, null, 2)}\n`);
    console.log('DSG_REVENUE_GROUNDED_PAIRWISE_V3', JSON.stringify({ baselineTotal: baselineScore.total, compositeTotal: compositeScore.total, delta: compositeScore.total - baselineScore.total, finalDecision, deliveredTotal, plans: plans.length, binaryVariables: options.length, pairTerms: pairs.length, selectedSources, selectedLabels: chosen.map((o) => `${o.category}:${o.label}`), isingFeasibility: z3.isingFeasibility, baselineFeasibility: z3.baselineFeasibility, z3Improvements: z3.improvements, z3Optimality: z3.optimality, replay20, evidenceHash }));
  }, 300_000);
});
