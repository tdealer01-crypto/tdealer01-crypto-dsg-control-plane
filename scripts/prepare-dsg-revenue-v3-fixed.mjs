import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'tests/integration/revenue-automation-dsg-grounded-pairwise-v3.test.ts';
const targetPath = 'tests/integration/revenue-automation-dsg-grounded-pairwise-v3-fixed.test.ts';
let source = readFileSync(sourcePath, 'utf8');

// The WASM z3-solver build aborted when the benchmark repeatedly rebuilt a
// large quadratic objective with hundreds of auxiliary pair-product terms.
// Keep the architecture honest and simpler:
//   1) Ising sees the full pool.
//   2) Deterministic exhaustive search over the finite 6^7 pool establishes
//      the best hard-feasible encoded assignment and gives a checkable count.
//   3) Z3 is invoked only after search, as the final SMT feasibility judge for
//      the selected assignment (and separately for baseline/Ising evidence).
// This preserves "no pre-Z3 pruning" and avoids calling a heuristic result a
// formal optimum when the runtime cannot stably prove the full QUBO objective.
const oldZ3 = /async function z3Optimize\([\s\S]*?\n}\n\nasync function compileBoth/;
const newZ3 = `async function z3Optimize(isingBits: number[], options: Option[], pairs: PairTerm[]) {
  const pairMap = new Map(pairs.map((p) => [\`${'${p.i}:${p.j}'}\`, p]));
  const byCategory = CATEGORIES.map((category) =>
    options
      .filter((o) => o.category === category && o.safe && o.validRefs && o.grounding >= 60)
      .sort((a, b) => a.variableIndex - b.variableIndex),
  );

  function hardFeasibleBits(bits: number[]) {
    const chosen = selected(bits, options);
    if (chosen.length !== CATEGORIES.length) return false;
    for (const category of CATEGORIES) {
      if (chosen.filter((o) => o.category === category).length !== 1) return false;
    }
    if (chosen.some((o) => !o.safe || !o.validRefs || o.grounding < 60)) return false;
    for (let i = 0; i < chosen.length - 1; i++) {
      const left = chosen.find((o) => o.category === CATEGORIES[i]);
      const right = chosen.find((o) => o.category === CATEGORIES[i + 1]);
      if (!left || !right) return false;
      const p = pairMap.get(\`${'${left.variableIndex}:${right.variableIndex}'}\`);
      if (p && p.compatibility < 40) return false;
    }
    const sourceCount = new Set(chosen.flatMap((o) => o.sourceRefs)).size;
    return sourceCount >= 3;
  }

  let enumerated = 0;
  let feasibleCount = 0;
  let bestBits: number[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  let bestKey = '';
  const working: Option[] = [];

  function dfs(depth: number, runningCost: number) {
    if (depth === CATEGORIES.length) {
      enumerated++;
      const sourceCount = new Set(working.flatMap((o) => o.sourceRefs)).size;
      if (sourceCount < 3) return;
      feasibleCount++;
      const key = working.map((o) => String(o.variableIndex).padStart(4, '0')).join(':');
      if (runningCost < bestCost || (runningCost === bestCost && (!bestKey || key < bestKey))) {
        bestCost = runningCost;
        bestKey = key;
        const bits = Array(options.length).fill(0);
        for (const o of working) bits[o.variableIndex] = 1;
        bestBits = bits;
      }
      return;
    }

    for (const option of byCategory[depth]) {
      let nextCost = runningCost + option.linearCost;
      if (depth > 0) {
        const prev = working[depth - 1];
        const pair = pairMap.get(\`${'${prev.variableIndex}:${option.variableIndex}'}\`);
        if (pair && pair.compatibility < 40) continue;
        if (pair) nextCost += pair.penalty;
      }
      working.push(option);
      dfs(depth + 1, nextCost);
      working.pop();
    }
  }
  dfs(0, 0);
  if (!bestBits) {
    return {
      isingFeasibility: hardFeasibleBits(isingBits) ? 'sat' : 'unsat',
      baselineFeasibility: hardFeasibleBits(baselineBits(options)) ? 'sat' : 'unsat',
      finalStatus: 'unsat',
      bestBits: [],
      bestCost: null,
      improvements: 0,
      optimality: 'exhaustive_search_no_feasible_candidate',
      version: 'not-invoked',
      enumerated,
      feasibleCount,
    };
  }

  const { Context, Z3 } = await init();
  const ctx = Context('dsg-revenue-v3-final-only');
  let checkCounter = 0;
  async function z3CheckPinned(bits: number[], label: string) {
    if (!hardFeasibleBits(bits)) return 'unsat';
    const solver = new ctx.Solver();
    const vars = options.map((_, i) => ctx.Int.const(\`${'${label}'}_\${checkCounter}_v_\${i}\`));
    checkCounter++;
    for (let i = 0; i < vars.length; i++) {
      solver.add(vars[i].ge(0));
      solver.add(vars[i].le(1));
      solver.add(vars[i].eq(bits[i]));
    }
    for (const category of CATEGORIES) {
      const idx = options.filter((o) => o.category === category).map((o) => o.variableIndex);
      solver.add(idx.slice(1).reduce((acc, i) => acc.add(vars[i]), vars[idx[0]]).eq(1));
    }
    for (const o of options) {
      if (!o.safe || !o.validRefs || o.grounding < 60) solver.add(vars[o.variableIndex].eq(0));
    }
    for (const p of pairs) {
      if (p.compatibility < 40) solver.add(vars[p.i].add(vars[p.j]).le(1));
    }
    return String(await solver.check());
  }

  const isingFeasibility = await z3CheckPinned(isingBits, 'ising');
  const baselineFeasibility = await z3CheckPinned(baselineBits(options), 'baseline');
  const finalStatus = await z3CheckPinned(bestBits, 'best');
  let version = 'unknown';
  try {
    const zv = Z3.get_version?.();
    if (zv) version = \`${'${zv.major}.${zv.minor}.${zv.build_number}'}\`;
  } catch {}
  const isingCost = hardFeasibleBits(isingBits) ? assignmentCost(isingBits, options, pairs) : Number.POSITIVE_INFINITY;
  return {
    isingFeasibility,
    baselineFeasibility,
    finalStatus,
    bestBits,
    bestCost,
    improvements: bestCost < isingCost ? 1 : 0,
    optimality: 'exhaustive_enumeration_no_better_candidate',
    version,
    enumerated,
    feasibleCount,
  };
}

async function compileBoth`;
if (!oldZ3.test(source)) throw new Error('Could not locate v3 z3Optimize block');
source = source.replace(oldZ3, newZ3);

const oldJudge = /async function judge\([\s\S]*?\n}\n\ndescribe\('DSG ONE deterministic grounded revenue pool v3'/;
const newJudge = `async function judgeOne(apiKey: string, model: string, answer: string, evidencePack: string): Promise<AnswerScore> {
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: 'ประเมินคำตอบเดียว 0-20 ใน relevance,revenueClarity,automationQuality,actionability,groundingAndRisk รวม 100; feasible=false ถ้ามี claim สำคัญไม่รองรับ evidence หรือ flow ใช้ไม่ได้; implementation evidence สำคัญกว่า planning docs. คืน JSON เท่านั้น {"score":{"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"groundingAndRisk":0,"total":0,"feasible":true,"reason":"..."}}',
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, answer }) },
    ],
    temperature: 0,
    max_tokens: 1100,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const x = parsed?.score ?? (Array.isArray(parsed?.scores) ? parsed.scores[0] : null);
  if (!x) throw new Error('Judge did not return a score object');
  return {
    relevance: Number(x.relevance),
    revenueClarity: Number(x.revenueClarity),
    automationQuality: Number(x.automationQuality),
    actionability: Number(x.actionability),
    groundingAndRisk: Number(x.groundingAndRisk),
    total: Number(x.total),
    feasible: Boolean(x.feasible),
    reason: String(x.reason || ''),
  };
}

describe('DSG ONE deterministic grounded revenue pool v3'`;
if (!oldJudge.test(source)) throw new Error('Could not locate v3 judge block');
source = source.replace(oldJudge, newJudge);

const oldCall = `const scores = await judge(apiKey!, model, [answers.baseline, answers.composite], evidence.pack); expect(scores.length).toBe(2); const baselineScore = scores[0]; const compositeScore = scores[1];`;
const newCall = `const baselineScore = await judgeOne(apiKey!, model, answers.baseline, evidence.pack); const compositeScore = await judgeOne(apiKey!, model, answers.composite, evidence.pack);`;
if (!source.includes(oldCall)) throw new Error('Could not locate v3 judge invocation');
source = source.replace(oldCall, newCall);

// Keep evidence terminology precise: Z3 is the final SMT feasibility judge;
// finite-pool optimality is established by deterministic exhaustive search.
source = source.replaceAll('z3Improvements: z3.improvements', 'exactSearchImprovedIsing: z3.improvements');
source = source.replaceAll('z3Optimality: z3.optimality', 'finitePoolOptimality: z3.optimality');
source = source.replace('bestCost: z3.bestCost }', 'bestCost: z3.bestCost, enumerated: z3.enumerated, feasibleCount: z3.feasibleCount }');

writeFileSync(targetPath, source);
console.log(`prepared ${targetPath}`);
