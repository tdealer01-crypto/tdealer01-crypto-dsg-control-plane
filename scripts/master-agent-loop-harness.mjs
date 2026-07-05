#!/usr/bin/env node
/**
 * Master Agent Loop — runnable harness (demonstrator)
 *
 * Tests the orchestration parts of docs/MASTER_AGENT_LOOP.md that endpoint
 * probing can't show on its own: DAG + parallel worker pool, the Autonomy Dial
 * (L0–L3), risk routing (fast lane vs full lane), and the gate-decision cache.
 *
 * Full-lane (tier 1–2) steps call the REAL live DSG gate
 * (POST /api/dsg/v1/gates/evaluate) so gate decisions are genuine; the loop
 * scheduling/autonomy/cache is what this harness exercises.
 *
 * Self-contained: Node 22 ESM, global fetch, no repo imports, no deps.
 * Run:  node scripts/master-agent-loop-harness.mjs
 */

const BASE = process.env.DSG_BASE_URL
  || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const GATE_URL = `${BASE}/api/dsg/v1/gates/evaluate`;

// Evidence keys the live deterministic policy checks (from policies/manifest).
const EVIDENCE_KEYS = [
  'requirement_clear', 'tool_available', 'permission_granted', 'secret_bound',
  'dependency_resolved', 'testable', 'deploy_target_ready', 'audit_hook_available',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

// ── Live DSG gate (full lane) with a decision cache ─────────────────────────
const gateCache = new Map();
let gateCalls = 0;
let gateCacheHits = 0;

function buildContext(overrides = {}) {
  const ctx = {};
  for (const k of EVIDENCE_KEYS) ctx[k] = overrides[k] !== undefined ? overrides[k] : true;
  return ctx;
}

async function liveGate(context, riskLevel, tag) {
  const cacheKey = JSON.stringify({ context, riskLevel });
  if (gateCache.has(cacheKey)) { gateCacheHits++; return { ...gateCache.get(cacheKey), cached: true }; }
  gateCalls++;
  // nonce/idempotencyKey must match the gate's SAFE_TOKEN_RE: [A-Za-z0-9_-] only.
  const safeTag = String(tag).replace(/[^A-Za-z0-9_-]/g, '_');
  const nonce = `nonce_${safeTag}`.padEnd(16, '0').slice(0, 60);
  const idem = `idem_${safeTag}`.padEnd(16, '0').slice(0, 60);
  let out;
  try {
    const res = await fetch(GATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce, idempotencyKey: idem, riskLevel, context }),
    });
    const d = await res.json();
    out = { gateStatus: d.gateStatus, ok: d.ok, reason: d.reason, proofHash: (d.proof || {}).proofHash, cached: false };
  } catch (e) {
    out = { gateStatus: 'ERROR', ok: false, reason: `gate_unreachable:${e.message}`, cached: false };
  }
  gateCache.set(cacheKey, out);
  return out;
}

// ── Autonomy Dial: does this tier need a human at this level? ────────────────
// L0 manual: pause everything. L1: auto 0–1, pause 2. L2: auto 0–1 (notify), pause 2.
// L3: auto all (policy gate is the control, not a human).
function needsHuman(tier, autonomy) {
  if (autonomy === 0) return true;
  if (autonomy >= 3) return false;
  return tier === 2; // L1/L2 pause only tier-2
}

// ── Concurrency tracker (to prove parallelism is real) ──────────────────────
let live = 0, peak = 0;
function enter() { live++; peak = Math.max(peak, live); return live; }
function leave() { live--; }

// ── Run one step ────────────────────────────────────────────────────────────
async function runStep(step, autonomy, t0, log) {
  const conc = enter();
  const startedAt = now() - t0;

  // Stage 3: risk routing
  let lane, gate;
  if (step.tier === 0) {
    lane = 'FAST';                                  // heuristic gate, no LLM/network
    gate = { gateStatus: 'PASS', ok: true, reason: null, cached: false };
  } else {
    lane = 'FULL';
    // Stage 3/4: autonomy decision for higher tiers
    if (needsHuman(step.tier, autonomy)) {
      leave();
      log.push({ step: step.id, lane, decision: 'PAUSED_FOR_HUMAN', tier: step.tier, conc, startedAt, ms: 0 });
      return { id: step.id, status: 'paused' };
    }
    gate = await liveGate(buildContext(step.evidence), step.risk, `${step.id}_${autonomy}`);
  }

  // Stage 4: execute (simulated work; fast lane is quick, full lane a bit longer)
  await sleep(step.workMs ?? (step.tier === 0 ? 120 : 200));

  // Stage 4/5: gate result governs whether we "executed"
  let status;
  if (gate.gateStatus === 'PASS') status = 'done';
  else if (gate.gateStatus === 'REVIEW') status = 'review';
  else status = 'blocked';

  const ms = (now() - t0) - startedAt;
  leave();
  log.push({ step: step.id, lane, decision: gate.gateStatus, ok: gate.ok, reason: gate.reason,
             cached: gate.cached, tier: step.tier, conc, startedAt, ms });
  return { id: step.id, status };
}

// ── Scheduler: parallel DAG worker pool ─────────────────────────────────────
async function runLoop(plan, { autonomy, maxConcurrency }) {
  const t0 = now();
  live = 0; peak = 0; // per-run concurrency tracking
  const byId = Object.fromEntries(plan.map((s) => [s.id, s]));
  const doneSet = new Set();
  const results = {};
  const log = [];
  let halted = false;

  const remaining = new Set(plan.map((s) => s.id));
  while (remaining.size > 0 && !halted) {
    // frontier = steps whose deps are all done
    const ready = [...remaining].filter((id) => (byId[id].deps ?? []).every((d) => doneSet.has(d)));
    if (ready.length === 0) break; // blocked branch removed deps; nothing runnable
    const batch = ready.slice(0, maxConcurrency);

    const settled = await Promise.all(batch.map((id) => runStep(byId[id], autonomy, t0, log)));
    for (const r of settled) {
      results[r.id] = r.status;
      remaining.delete(r.id);
      if (r.status === 'done') doneSet.add(r.id);
      else {
        // blocked/review/paused: drop dependents (they can't proceed) — fail closed
        for (const id of [...remaining]) {
          if ((byId[id].deps ?? []).includes(r.id)) { remaining.delete(id); results[id] = 'skipped(dep)'; }
        }
        if (r.status === 'blocked') halted = true;
      }
    }
  }

  return { wallMs: now() - t0, peak, results, log };
}

// ── Demo plan (DAG): 3 independent reads -> analyze -> write -> verify ───────
function buildPlan({ badCritical = false } = {}) {
  return [
    { id: 'read.status',   tier: 0, deps: [], workMs: 150 },
    { id: 'read.health',   tier: 0, deps: [], workMs: 150 },
    { id: 'read.manifest', tier: 0, deps: [], workMs: 150 },
    { id: 'analyze',       tier: 1, risk: 'medium', deps: ['read.status', 'read.health', 'read.manifest'], evidence: {} },
    { id: 'write.report',  tier: 2, risk: 'high',
      deps: ['analyze'],
      evidence: badCritical ? { permission_granted: false } : {} },
    { id: 'verify',        tier: 0, deps: ['write.report'], workMs: 120 },
  ];
}

function printRun(title, plan, opts, out) {
  console.log(`\n================ ${title} ================`);
  console.log(`autonomy=L${opts.autonomy}  maxConcurrency=${opts.maxConcurrency}`);
  console.log('  step          lane  decision           tier  start(ms)  dur(ms)  conc  note');
  for (const e of out.log) {
    const note = e.cached ? 'cache-hit' : (e.reason ? `reason=${e.reason}` : '');
    console.log(`  ${pad(e.step,13)} ${pad(e.lane,4)}  ${pad(e.decision,18)} ${e.tier}     ${pad(String(e.startedAt),9)} ${pad(String(e.ms),8)} ${e.conc}     ${note}`);
  }
  console.log(`  -> wall=${out.wallMs}ms  peakConcurrency=${out.peak}  results=${JSON.stringify(out.results)}`);
}

async function main() {
  console.log(`Master Agent Loop harness — live gate: ${GATE_URL}`);

  // SCENARIO 1: L3 autonomous, good evidence -> tier-2 auto-proceeds via gate PASS
  let plan = buildPlan();
  let opts = { autonomy: 3, maxConcurrency: 4 };
  printRun('S1: L3 autonomous, evidence OK', plan, opts, await runLoop(plan, opts));

  // SCENARIO 2: L1 work-session, good evidence -> tier-2 PAUSES for human
  plan = buildPlan();
  opts = { autonomy: 1, maxConcurrency: 4 };
  printRun('S2: L1 work-session, evidence OK (tier-2 should pause)', plan, opts, await runLoop(plan, opts));

  // SCENARIO 3: L3 autonomous, tier-2 missing a CRITICAL -> BLOCK (floor holds at max autonomy)
  plan = buildPlan({ badCritical: true });
  opts = { autonomy: 3, maxConcurrency: 4 };
  printRun('S3: L3 autonomous, tier-2 missing critical (should BLOCK)', plan, opts, await runLoop(plan, opts));

  // SCENARIO 4: serial vs parallel wall-time on the 3 independent reads
  plan = buildPlan();
  const serial = await runLoop(plan, { autonomy: 3, maxConcurrency: 1 });
  const parallel = await runLoop(buildPlan(), { autonomy: 3, maxConcurrency: 4 });
  console.log(`\n================ S4: parallel speedup ================`);
  console.log(`  maxConcurrency=1 -> wall=${serial.wallMs}ms (peak=${serial.peak})`);
  console.log(`  maxConcurrency=4 -> wall=${parallel.wallMs}ms (peak=${parallel.peak})`);
  console.log(`  speedup ~= ${(serial.wallMs / parallel.wallMs).toFixed(2)}x`);

  console.log(`\n================ gate cache ================`);
  console.log(`  live gate calls=${gateCalls}  cacheHits=${gateCacheHits}`);
}

main().catch((e) => { console.error('harness error:', e); process.exit(1); });
