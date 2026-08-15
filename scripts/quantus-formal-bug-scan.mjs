#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const targetRoot = path.resolve(args['target-root'] || '.');
const targetName = args['target-name'] || 'unknown';
const includePrefix = args['include-prefix'] || '.';
const outDir = path.resolve(args.out || 'artifacts/quantus-formal-scan');
const budgetArg = Number(args.budget || 24);
const budget = Number.isFinite(budgetArg) && budgetArg > 0 ? Math.floor(budgetArg) : 24;
const seed = Number(args.seed || 1337) >>> 0;

const RULES = [
  {
    id: 'unchecked-memory-api',
    regex: /\b(?:get_unchecked(?:_mut)?|unwrap_unchecked|from_utf8_unchecked|transmute)\b/g,
    weight: 10,
    simulation: ['length-boundary', 'malformed-input'],
    rationale: 'Unchecked memory/conversion APIs deserve manual safety review in security-sensitive Rust.',
  },
  {
    id: 'unsafe-block',
    regex: /\bunsafe\s*\{/g,
    weight: 8,
    simulation: ['length-boundary', 'aliasing-boundary'],
    rationale: 'Unsafe blocks bypass compiler-enforced memory safety and need explicit invariants.',
  },
  {
    id: 'panic-path',
    regex: /\b(?:panic|unreachable|unimplemented|todo)!\s*\(/g,
    weight: 7,
    simulation: ['malformed-input', 'unexpected-state'],
    rationale: 'Reachable panic paths can become availability or consensus-risk candidates.',
  },
  {
    id: 'unwrap-expect-path',
    regex: /\.(?:unwrap|expect)\s*\(/g,
    weight: 5,
    simulation: ['missing-value', 'malformed-input'],
    rationale: 'Unchecked Result/Option extraction can expose panic paths if external state reaches it.',
  },
  {
    id: 'debug-only-guard',
    regex: /\bdebug_assert(?:_eq|_ne)?!\s*\(/g,
    weight: 6,
    simulation: ['release-build', 'invalid-state'],
    rationale: 'debug_assert is absent in release builds; security invariants must not rely on it alone.',
  },
  {
    id: 'allow-default-fallback',
    regex: /\bunwrap_or\s*\(\s*true\s*\)|\bunwrap_or_default\s*\(\s*\)/g,
    weight: 8,
    simulation: ['missing-value', 'fallback-path'],
    rationale: 'Permissive/default fallback near validation code can accidentally fail open.',
  },
  {
    id: 'wrapping-arithmetic',
    regex: /\bwrapping_(?:add|sub|mul|div|rem|shl|shr)\s*\(/g,
    weight: 5,
    simulation: ['numeric-min', 'numeric-max'],
    rationale: 'Wrapping arithmetic is often intentional but deserves invariant review in value/consensus paths.',
  },
  {
    id: 'saturating-arithmetic',
    regex: /\bsaturating_(?:add|sub|mul|div|pow)\s*\(/g,
    weight: 3,
    simulation: ['numeric-min', 'numeric-max'],
    rationale: 'Saturation can hide boundary-condition mistakes in balances, counters, or difficulty logic.',
  },
  {
    id: 'release-assert',
    regex: /\bassert(?:_eq|_ne)?!\s*\(/g,
    weight: 4,
    simulation: ['invalid-state', 'boundary-value'],
    rationale: 'Assertions in non-test runtime code should be checked for attacker-controlled reachability.',
  },
];

const SECURITY_TERMS = [
  'verify', 'verifier', 'signature', 'dilithium', 'ml-dsa', 'proof', 'plonky',
  'poseidon', 'hash', 'merkle', 'nullifier', 'key', 'seed', 'mnemonic', 'wallet',
  'nonce', 'transaction', 'extrinsic', 'runtime', 'consensus', 'pow', 'difficulty',
  'balance', 'mint', 'burn', 'transfer', 'wormhole', 'governance', 'block', 'chain',
];

await main();

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const sourceRoot = path.resolve(targetRoot, includePrefix);
  const files = await collectRustFiles(sourceRoot);
  const findings = [];

  for (const file of files) {
    const relativeToTarget = normalize(path.relative(targetRoot, file));
    if (isOutOfScopePath(targetName, relativeToTarget)) continue;

    const text = await fs.readFile(file, 'utf8');
    const lines = text.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const context = lines.slice(Math.max(0, lineIndex - 2), Math.min(lines.length, lineIndex + 3)).join('\n');
      const contextLower = `${relativeToTarget}\n${context}`.toLowerCase();
      const matchedTerms = SECURITY_TERMS.filter((term) => contextLower.includes(term));

      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        if (!rule.regex.test(line)) continue;

        const contextBoost = Math.min(6, matchedTerms.length * 1.5);
        const scopeConfidence = targetName === 'chain' ? 'manual-upstream-diff-review' : 'target-path-in-scope';
        const score = Number((rule.weight + contextBoost).toFixed(2));

        findings.push({
          id: sha256(`${targetName}:${relativeToTarget}:${lineIndex + 1}:${rule.id}`).slice(0, 16),
          target: targetName,
          file: relativeToTarget,
          line: lineIndex + 1,
          rule: rule.id,
          score,
          scopeConfidence,
          matchedTerms,
          simulationScenarios: enrichSimulation(rule.simulation, matchedTerms),
          snippet: line.trim().slice(0, 240),
          rationale: rule.rationale,
          status: 'REVIEW',
        });
      }
    }
  }

  findings.sort(compareFinding);
  const maxSelected = Math.min(budget, findings.length);
  const ising = runDeterministicIsingSimulation(findings, maxSelected, seed);
  const repairedSelection = repairSelection(findings, ising.selectedIndices, maxSelected);
  const z3 = await validateSelectionWithZ3(findings, repairedSelection, maxSelected);

  const selected = repairedSelection.map((index) => findings[index]);
  const scannerIntegrity = z3.status === 'sat';
  const verdict = !scannerIntegrity
    ? 'BLOCK_SCANNER_INTEGRITY'
    : selected.length > 0
      ? 'REVIEW_CANDIDATES'
      : 'PASS_NO_CANDIDATES';

  const report = {
    schema: 'dsg-quantus-formal-bug-scan-v1',
    generatedAt: new Date().toISOString(),
    target: targetName,
    sourceRoot: normalize(sourceRoot),
    filesScanned: files.length,
    candidateCount: findings.length,
    selectedCount: selected.length,
    verdict,
    ising: {
      engine: 'deterministic-classical-simulated-annealing',
      representation: 'binary QUBO/Ising-style candidate prioritization',
      seed,
      budget: maxSelected,
      energy: ising.energy,
      iterations: ising.iterations,
    },
    z3: {
      purpose: 'formal validation of triage hard constraints; not proof that a vulnerability exists',
      status: z3.status,
      constraints: z3.constraints,
      error: z3.error,
    },
    dsgGate: {
      failClosed: true,
      scannerIntegrity,
      submissionAllowed: false,
      nextRequiredEvidence: ['scope-confirmation', 'runnable-local-poc', 'impact-demonstration', 'human-review'],
    },
    claimBoundary: [
      'A REVIEW_CANDIDATES result means suspicious code locations were prioritized, not that a vulnerability was proven.',
      'Ising/QUBO simulation ranks candidates; it is not a quantum solver and does not establish exploitability.',
      'Z3/SMT validates scanner selection constraints and scope gates; target-specific security properties still require explicit models or a runnable local PoC.',
      'Do not test against mainnet, public testnet, project infrastructure, or third-party systems.',
    ],
    selected,
    allCandidates: findings,
  };

  const canonical = JSON.stringify(report);
  report.proofHash = sha256(canonical);

  await fs.writeFile(path.join(outDir, 'formal-scan.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'formal-scan.md'), renderMarkdown(report));
  await fs.writeFile(path.join(outDir, 'triage-model.smt2'), renderSelectionSmt2(findings, repairedSelection, maxSelected));

  console.log(JSON.stringify({
    target: targetName,
    filesScanned: files.length,
    candidates: findings.length,
    selected: selected.length,
    verdict,
    proofHash: report.proofHash,
  }, null, 2));

  if (!scannerIntegrity) process.exitCode = 2;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) parsed[key] = true;
    else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

async function collectRustFiles(root) {
  const result = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = normalize(path.relative(root, full)).toLowerCase();
      if (entry.isDirectory()) {
        if (['.git', 'target', 'node_modules', 'vendor', 'benches', 'examples', 'tests', 'test'].includes(entry.name.toLowerCase())) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.rs')) {
        if (/(^|\/)tests?\//.test(rel) || /(?:^|\/)test_[^/]*\.rs$/.test(rel) || /_test\.rs$/.test(rel)) continue;
        result.push(full);
      }
    }
  }
  await walk(root);
  return result;
}

function isOutOfScopePath(target, rel) {
  const lower = rel.toLowerCase();
  if (lower.includes('/target/') || lower.includes('/vendor/')) return true;
  if (target === 'zk-circuits' && /(^|\/)voting(\/|$)/.test(lower)) return true;
  if ((target === 'dilithium' || target === 'hdwallet') && /(^|\/)threshold(\/|$)/.test(lower)) return true;
  return false;
}

function enrichSimulation(base, matchedTerms) {
  const set = new Set(base);
  if (matchedTerms.some((term) => ['verify', 'verifier', 'signature', 'dilithium', 'ml-dsa', 'proof', 'plonky'].includes(term))) {
    set.add('malformed-signature-or-proof');
  }
  if (matchedTerms.includes('nonce') || matchedTerms.includes('nullifier')) set.add('duplicate-or-replay');
  if (matchedTerms.some((term) => ['balance', 'mint', 'burn', 'transfer', 'difficulty'].includes(term))) set.add('numeric-boundary');
  return [...set].sort();
}

function compareFinding(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const fileCmp = a.file.localeCompare(b.file);
  if (fileCmp !== 0) return fileCmp;
  if (a.line !== b.line) return a.line - b.line;
  return a.rule.localeCompare(b.rule);
}

function runDeterministicIsingSimulation(findings, selectBudget, initialSeed) {
  const n = findings.length;
  if (n === 0 || selectBudget === 0) return { selectedIndices: [], energy: 0, iterations: 0 };

  const rand = xorshift32(initialSeed || 1);
  const state = Array(n).fill(false);
  findings.slice(0, selectBudget).forEach((finding) => {
    const idx = findings.indexOf(finding);
    state[idx] = true;
  });

  let currentEnergy = energy(state, findings, selectBudget);
  let bestState = [...state];
  let bestEnergy = currentEnergy;
  const iterations = Math.max(2000, Math.min(12000, n * 220));

  for (let step = 0; step < iterations; step += 1) {
    const idx = Math.floor(rand() * n);
    state[idx] = !state[idx];
    const nextEnergy = energy(state, findings, selectBudget);
    const temperature = Math.max(0.05, 6 * (1 - step / iterations));
    const delta = nextEnergy - currentEnergy;
    const accept = delta <= 0 || rand() < Math.exp(-delta / temperature);
    if (accept) {
      currentEnergy = nextEnergy;
      if (nextEnergy < bestEnergy) {
        bestEnergy = nextEnergy;
        bestState = [...state];
      }
    } else {
      state[idx] = !state[idx];
    }
  }

  return {
    selectedIndices: bestState.map((on, index) => (on ? index : -1)).filter((index) => index >= 0),
    energy: Number(bestEnergy.toFixed(4)),
    iterations,
  };
}

function energy(state, findings, selectBudget) {
  let selectedCount = 0;
  let score = 0;
  const byFile = new Map();
  const byRule = new Map();

  for (let i = 0; i < state.length; i += 1) {
    if (!state[i]) continue;
    selectedCount += 1;
    score += findings[i].score;
    byFile.set(findings[i].file, (byFile.get(findings[i].file) || 0) + 1);
    byRule.set(findings[i].rule, (byRule.get(findings[i].rule) || 0) + 1);
  }

  let penalty = 0;
  const overflow = Math.max(0, selectedCount - selectBudget);
  penalty += overflow * overflow * 100;
  for (const count of byFile.values()) penalty += Math.max(0, count - 3) ** 2 * 4;
  for (const count of byRule.values()) penalty += Math.max(0, count - 5) ** 2 * 1.5;
  if (selectedCount === 0 && findings.length > 0) penalty += 50;

  return -score + penalty;
}

function repairSelection(findings, indices, selectBudget) {
  const unique = [...new Set(indices)].sort((a, b) => compareFinding(findings[a], findings[b]));
  const selected = [];
  const perFile = new Map();

  for (const index of unique) {
    if (selected.length >= selectBudget) break;
    const file = findings[index].file;
    if ((perFile.get(file) || 0) >= 3) continue;
    selected.push(index);
    perFile.set(file, (perFile.get(file) || 0) + 1);
  }

  for (let index = 0; index < findings.length && selected.length < selectBudget; index += 1) {
    if (selected.includes(index)) continue;
    const file = findings[index].file;
    if ((perFile.get(file) || 0) >= 3) continue;
    selected.push(index);
    perFile.set(file, (perFile.get(file) || 0) + 1);
  }

  return selected.sort((a, b) => a - b);
}

async function validateSelectionWithZ3(findings, selectedIndices, selectBudget) {
  const constraints = [
    `selected_count <= ${selectBudget}`,
    'selected_candidate => in_scope_path',
    'selected_per_file <= 3',
    'all selection bits fixed to deterministic Ising+repair output',
  ];

  try {
    const { init } = await import('z3-solver');
    const { Context, em } = await init();
    const ctx = Context('quantus-formal-scan');
    const { Solver, Bool, Int, If, Sum } = ctx;
    const solver = new Solver();
    const vars = findings.map((_, index) => Bool.const(`candidate_${index}`));
    const selectedSet = new Set(selectedIndices);

    if (vars.length > 0) {
      const selectedCount = Sum(...vars.map((v) => If(v, Int.val(1), Int.val(0))));
      solver.add(selectedCount.le(selectBudget));
    }

    const groups = new Map();
    findings.forEach((finding, index) => {
      if (!groups.has(finding.file)) groups.set(finding.file, []);
      groups.get(finding.file).push(index);
    });

    for (const indices of groups.values()) {
      if (indices.length === 0) continue;
      const count = Sum(...indices.map((index) => If(vars[index], Int.val(1), Int.val(0))));
      solver.add(count.le(3));
    }

    vars.forEach((variable, index) => solver.add(variable.eq(selectedSet.has(index))));

    const result = vars.length === 0 ? 'sat' : String(await solver.check());
    try { em.PThread.terminateAllThreads(); } catch {}
    return { status: result, constraints };
  } catch (error) {
    return {
      status: 'error',
      constraints,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderSelectionSmt2(findings, selectedIndices, selectBudget) {
  const selectedSet = new Set(selectedIndices);
  const lines = [
    '; DSG Quantus formal bug-scan triage model',
    '; This model validates candidate-selection constraints only.',
    '(set-logic QF_LIA)',
  ];
  findings.forEach((_, index) => lines.push(`(declare-const candidate_${index} Int)`));
  findings.forEach((_, index) => {
    lines.push(`(assert (or (= candidate_${index} 0) (= candidate_${index} 1)))`);
    lines.push(`(assert (= candidate_${index} ${selectedSet.has(index) ? 1 : 0}))`);
  });
  if (findings.length > 0) {
    lines.push(`(assert (<= (+ ${findings.map((_, index) => `candidate_${index}`).join(' ')}) ${selectBudget}))`);
  }
  lines.push('(check-sat)');
  return `${lines.join('\n')}\n`;
}

function renderMarkdown(report) {
  const rows = report.selected.map((finding) =>
    `| ${finding.id} | ${finding.score} | ${finding.rule} | ${escapeCell(finding.file)}:${finding.line} | ${finding.scopeConfidence} | ${escapeCell(finding.simulationScenarios.join(', '))} |`,
  ).join('\n');

  return `# Quantus Formal Bug Scan — ${report.target}\n\n` +
    `**Verdict:** ${report.verdict}\n\n` +
    `- Files scanned: ${report.filesScanned}\n` +
    `- Static candidates: ${report.candidateCount}\n` +
    `- Ising-prioritized candidates: ${report.selectedCount}\n` +
    `- Z3 triage validation: ${report.z3.status}\n` +
    `- Evidence hash: \`${report.proofHash}\`\n\n` +
    `## Selected review candidates\n\n` +
    `| ID | Score | Rule | Location | Scope confidence | Local simulation ideas |\n` +
    `|---|---:|---|---|---|---|\n${rows || '| — | — | — | No candidate selected | — | — |'}\n\n` +
    `## DSG gate\n\n` +
    `Submission is **blocked by design** until scope is confirmed and a runnable local PoC demonstrates an in-scope impact.\n\n` +
    `## Claim boundary\n\n${report.claimBoundary.map((item) => `- ${item}`).join('\n')}\n`;
}

function xorshift32(initial) {
  let state = initial >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalize(value) {
  return value.split(path.sep).join('/');
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
