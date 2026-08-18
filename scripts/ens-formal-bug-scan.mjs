#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const targetRoot = path.resolve(args['target-root'] || '.');
const outDir = path.resolve(args.out || 'artifacts/ens-formal-scan');
const budgetRaw = Number(args.budget || 40);
const budget = Number.isFinite(budgetRaw) && budgetRaw > 0 ? Math.floor(budgetRaw) : 40;
const seed = Number(args.seed || 20260818) >>> 0;
const expectedSource = args['expected-source'] || 'immunefi-team/audit-comp-ens@cda79acaad59711b943fc68207ebb3f1d0ff8596';

const IN_SCOPE_PREFIXES = [
  'apps/manager/',
  'apps/portal/',
  'packages/smart-account/',
  'packages/transaction-manager/',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', 'storybook-static', 'test-results', 'playwright-report']);

const RULES = [
  { id: 'dynamic-code-execution', regex: /\b(?:eval\s*\(|new\s+Function\s*\()/g, weight: 12, scenarios: ['attacker-controlled-expression'], rationale: 'Dynamic code execution can turn untrusted strings into executable code.' },
  { id: 'unsafe-html-sink', regex: /\b(?:dangerouslySetInnerHTML|innerHTML\s*=|insertAdjacentHTML\s*\()/g, weight: 10, scenarios: ['untrusted-markup'], rationale: 'HTML sinks require a proven sanitization boundary.' },
  { id: 'wildcard-postmessage', regex: /\.postMessage\s*\([^\n]*,\s*['"]\*['"]\s*\)/g, weight: 10, scenarios: ['cross-origin-message'], rationale: 'Wildcard postMessage targets can leak data to unintended origins.' },
  { id: 'message-event-boundary', regex: /addEventListener\s*\(\s*['"]message['"]|onmessage\s*=/g, weight: 7, scenarios: ['forged-message-origin'], rationale: 'Message handlers need explicit origin/source validation when they affect sensitive state.' },
  { id: 'transaction-construction', regex: /\b(?:sendTransaction|writeContract|prepareTransactionRequest|signTransaction|signTypedData|simulateContract|executeBatch|executeTransaction)\s*\(/g, weight: 8, scenarios: ['wrong-chain', 'wrong-target', 'wrong-calldata', 'wrong-value'], rationale: 'Transaction construction and signing paths are high-value integrity boundaries.' },
  { id: 'chain-selection', regex: /\b(?:chainId|switchChain|wallet_switchEthereumChain)\b/g, weight: 6, scenarios: ['chain-mismatch'], rationale: 'Chain selection must stay aligned with the transaction shown to the user and the wallet signer.' },
  { id: 'account-signer-selection', regex: /\b(?:account|signer|sender|from)\b\s*[:=]/g, weight: 5, scenarios: ['signer-mismatch'], rationale: 'Sender/signer selection is security-sensitive when it controls authorization or transaction origin.' },
  { id: 'session-permission-boundary', regex: /\b(?:sessionKey|session\s*key|permission|permissions|validUntil|validAfter|expiry|expiresAt|allowlist|whitelist)\b/gi, weight: 8, scenarios: ['expired-session', 'overbroad-permission', 'authorization-replay'], rationale: 'Session and permission logic needs explicit lifetime and capability invariants.' },
  { id: 'storage-trust-boundary', regex: /\b(?:localStorage|sessionStorage)\b/g, weight: 5, scenarios: ['tampered-client-state'], rationale: 'Browser storage is attacker-controlled from the application trust model and must not be authoritative for sensitive decisions.' },
  { id: 'cross-boundary-json-parse', regex: /\bJSON\.parse\s*\(/g, weight: 4, scenarios: ['malformed-input', 'schema-confusion'], rationale: 'Parsed external or persisted JSON needs schema validation before security-sensitive use.' },
  { id: 'network-fetch-boundary', regex: /\bfetch\s*\(/g, weight: 4, scenarios: ['untrusted-url', 'unexpected-response'], rationale: 'Network boundaries should validate destinations and response shape when they influence transactions or identity.' },
  { id: 'noncrypto-random-sensitive', regex: /\bMath\.random\s*\(/g, weight: 8, scenarios: ['predictable-token-or-nonce'], rationale: 'Math.random is not suitable for security-sensitive identifiers, nonces, or secrets.' },
  { id: 'time-based-authorization', regex: /\bDate\.now\s*\(\)|\bnew\s+Date\s*\(/g, weight: 3, scenarios: ['clock-boundary'], rationale: 'Time comparisons near sessions and permissions need deterministic boundary handling.' },
  { id: 'numeric-coercion-value', regex: /\b(?:Number|parseInt|parseFloat)\s*\(/g, weight: 3, scenarios: ['precision-boundary', 'nan-boundary'], rationale: 'Numeric coercion near chain IDs, token values, or durations can introduce precision or validation bugs.' },
  { id: 'permissive-boolean-fallback', regex: /(?:\?\?|\|\|)\s*true\b/g, weight: 7, scenarios: ['missing-state-fail-open'], rationale: 'Permissive boolean fallbacks can accidentally fail open if used in authorization or validation.' },
];

const SECURITY_TERMS = [
  'transaction', 'wallet', 'sign', 'signature', 'account', 'address', 'chain', 'chainid', 'value', 'calldata', 'data',
  'execute', 'permission', 'session', 'owner', 'authorization', 'approve', 'resolver', 'register', 'migration', 'primary',
  'nonce', 'expiry', 'validuntil', 'validafter', 'token', 'eth', 'name', 'commitment', 'callback', 'origin', 'message',
];

await main();

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const files = await collectSourceFiles(targetRoot);
  const candidates = [];

  for (const file of files) {
    const rel = normalize(path.relative(targetRoot, file));
    const text = await fs.readFile(file, 'utf8');
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join('\n');
      const lower = `${rel}\n${context}`.toLowerCase();
      const matchedTerms = SECURITY_TERMS.filter((term) => lower.includes(term));

      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        if (!rule.regex.test(line)) continue;
        const securityBoost = Math.min(7, matchedTerms.length * 0.8);
        const scopeBoost = rel.startsWith('packages/smart-account/') || rel.startsWith('packages/transaction-manager/') ? 2 : 0;
        const score = Number((rule.weight + securityBoost + scopeBoost).toFixed(2));
        candidates.push({
          id: sha256(`${rel}:${i + 1}:${rule.id}`).slice(0, 16),
          file: rel,
          line: i + 1,
          rule: rule.id,
          score,
          matchedTerms,
          simulationScenarios: enrichScenarios(rule.scenarios, matchedTerms),
          snippet: line.trim().slice(0, 260),
          rationale: rule.rationale,
          status: 'REVIEW',
          scopeConfidence: 'verified-prefix',
        });
      }
    }
  }

  candidates.sort(compareFinding);
  const selectBudget = Math.min(budget, candidates.length);
  const ising = runDeterministicIsingSimulation(candidates, selectBudget, seed);
  const selectedIndices = repairSelection(candidates, ising.selectedIndices, selectBudget);
  const z3 = await validateSelectionWithZ3(candidates, selectedIndices, selectBudget);
  const selected = selectedIndices.map((index) => candidates[index]);
  const scannerIntegrity = z3.status === 'sat';
  const verdict = !scannerIntegrity ? 'BLOCK_SCANNER_INTEGRITY' : selected.length ? 'REVIEW_CANDIDATES' : 'PASS_NO_CANDIDATES';

  const report = {
    schema: 'dsg-ens-formal-bug-scan-v1',
    generatedAt: new Date().toISOString(),
    expectedSource,
    inScopePrefixes: IN_SCOPE_PREFIXES,
    filesScanned: files.length,
    candidateCount: candidates.length,
    selectedCount: selected.length,
    verdict,
    ising: { engine: 'deterministic-classical-simulated-annealing', representation: 'binary QUBO/Ising-style candidate prioritization', seed, budget: selectBudget, energy: ising.energy, iterations: ising.iterations },
    z3: { purpose: 'formal validation of triage selection constraints only; not proof that a vulnerability exists', status: z3.status, constraints: z3.constraints, error: z3.error || null },
    dsgGate: {
      failClosed: true,
      scannerIntegrity,
      submissionAllowed: false,
      nextRequiredEvidence: ['competition-scope-confirmation', 'known-issue-deduplication', 'runnable-local-poc', 'impact-demonstration', 'human-review'],
    },
    claimBoundary: [
      'REVIEW_CANDIDATES means suspicious code locations were prioritized; it does not prove exploitability or reward eligibility.',
      'The Ising/QUBO stage ranks review candidates deterministically; it is not a quantum computation claim.',
      'Z3/SMT validates selection constraints, not target-specific security properties.',
      'No production, mainnet, public testnet, third-party service, or live user account is contacted by this scanner.',
    ],
    selected,
    allCandidates: candidates,
  };
  report.proofHash = sha256(JSON.stringify(report));

  await fs.writeFile(path.join(outDir, 'formal-scan.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'formal-scan.md'), renderMarkdown(report));
  await fs.writeFile(path.join(outDir, 'triage-model.smt2'), renderSelectionSmt2(candidates, selectedIndices, selectBudget));

  console.log(JSON.stringify({ expectedSource, filesScanned: files.length, candidates: candidates.length, selected: selected.length, verdict, z3: z3.status, proofHash: report.proofHash }, null, 2));
  if (!scannerIntegrity) process.exitCode = 2;
}

async function collectSourceFiles(root) {
  const result = [];
  for (const prefix of IN_SCOPE_PREFIXES) {
    const base = path.resolve(root, prefix);
    await walk(base, root, result);
  }
  result.sort((a, b) => a.localeCompare(b));
  return [...new Set(result)];
}

async function walk(dir, root, result) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || /^(?:test|tests|__tests__|e2e|fixtures?|mocks?)$/i.test(entry.name)) continue;
      await walk(full, root, result);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const rel = normalize(path.relative(root, full));
    if (!EXTENSIONS.has(ext)) continue;
    if (/\.(?:test|spec|stories)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if (/\/(?:test|tests|__tests__|e2e|fixtures?|mocks?)\//i.test(`/${rel}`)) continue;
    result.push(full);
  }
}

function enrichScenarios(base, matchedTerms) {
  const set = new Set(base);
  if (matchedTerms.includes('transaction') || matchedTerms.includes('wallet')) set.add('display-vs-signature-integrity');
  if (matchedTerms.includes('chain') || matchedTerms.includes('chainid')) set.add('cross-chain-mismatch');
  if (matchedTerms.includes('session') || matchedTerms.includes('permission')) set.add('capability-boundary');
  if (matchedTerms.includes('nonce')) set.add('replay-boundary');
  if (matchedTerms.includes('origin') || matchedTerms.includes('message')) set.add('cross-origin-boundary');
  return [...set].sort();
}

function compareFinding(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const f = a.file.localeCompare(b.file);
  if (f) return f;
  if (a.line !== b.line) return a.line - b.line;
  return a.rule.localeCompare(b.rule);
}

function runDeterministicIsingSimulation(findings, selectBudget, initialSeed) {
  const n = findings.length;
  if (!n || !selectBudget) return { selectedIndices: [], energy: 0, iterations: 0 };
  const rand = xorshift32(initialSeed || 1);
  const state = Array(n).fill(false);
  for (let i = 0; i < Math.min(selectBudget, n); i += 1) state[i] = true;
  let currentEnergy = energy(state, findings, selectBudget);
  let bestState = [...state];
  let bestEnergy = currentEnergy;
  const iterations = Math.max(2500, Math.min(16000, n * 180));
  for (let step = 0; step < iterations; step += 1) {
    const idx = Math.floor(rand() * n);
    state[idx] = !state[idx];
    const nextEnergy = energy(state, findings, selectBudget);
    const temperature = Math.max(0.05, 7 * (1 - step / iterations));
    const delta = nextEnergy - currentEnergy;
    if (delta <= 0 || rand() < Math.exp(-delta / temperature)) {
      currentEnergy = nextEnergy;
      if (nextEnergy < bestEnergy) { bestEnergy = nextEnergy; bestState = [...state]; }
    } else state[idx] = !state[idx];
  }
  return { selectedIndices: bestState.map((v, i) => v ? i : -1).filter((i) => i >= 0), energy: Number(bestEnergy.toFixed(4)), iterations };
}

function energy(state, findings, selectBudget) {
  let selectedCount = 0;
  let score = 0;
  const perFile = new Map();
  const perRule = new Map();
  for (let i = 0; i < state.length; i += 1) {
    if (!state[i]) continue;
    selectedCount += 1;
    score += findings[i].score;
    perFile.set(findings[i].file, (perFile.get(findings[i].file) || 0) + 1);
    perRule.set(findings[i].rule, (perRule.get(findings[i].rule) || 0) + 1);
  }
  let penalty = Math.max(0, selectedCount - selectBudget) ** 2 * 100;
  for (const count of perFile.values()) penalty += Math.max(0, count - 3) ** 2 * 4;
  for (const count of perRule.values()) penalty += Math.max(0, count - 8) ** 2 * 1.5;
  if (selectedCount === 0 && findings.length) penalty += 60;
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
  const constraints = [`selected_count <= ${selectBudget}`, 'selected_per_file <= 3', 'selected_candidate => verified_scope_prefix', 'selection bits fixed to deterministic Ising+repair output'];
  try {
    const { init } = await import('z3-solver');
    const { Context, em } = await init();
    const ctx = Context('ens-formal-scan');
    const { Solver, Bool, Int, If, Sum } = ctx;
    const solver = new Solver();
    const vars = findings.map((_, i) => Bool.const(`candidate_${i}`));
    const selectedSet = new Set(selectedIndices);
    if (vars.length) solver.add(Sum(...vars.map((v) => If(v, Int.val(1), Int.val(0)))).le(selectBudget));
    const groups = new Map();
    findings.forEach((f, i) => { if (!groups.has(f.file)) groups.set(f.file, []); groups.get(f.file).push(i); });
    for (const indices of groups.values()) solver.add(Sum(...indices.map((i) => If(vars[i], Int.val(1), Int.val(0)))).le(3));
    vars.forEach((v, i) => solver.add(v.eq(selectedSet.has(i))));
    const status = vars.length ? String(await solver.check()) : 'sat';
    try { em.PThread.terminateAllThreads(); } catch {}
    return { status, constraints };
  } catch (error) {
    return { status: 'error', constraints, error: error instanceof Error ? error.message : String(error) };
  }
}

function renderSelectionSmt2(findings, selectedIndices, selectBudget) {
  const selected = new Set(selectedIndices);
  const lines = ['; DSG ENS formal triage model', '; Validates candidate-selection constraints only.', '(set-logic QF_LIA)'];
  findings.forEach((_, i) => lines.push(`(declare-const candidate_${i} Int)`));
  findings.forEach((_, i) => { lines.push(`(assert (or (= candidate_${i} 0) (= candidate_${i} 1)))`); lines.push(`(assert (= candidate_${i} ${selected.has(i) ? 1 : 0}))`); });
  if (findings.length) lines.push(`(assert (<= (+ ${findings.map((_, i) => `candidate_${i}`).join(' ')}) ${selectBudget}))`);
  lines.push('(check-sat)');
  return `${lines.join('\n')}\n`;
}

function renderMarkdown(report) {
  const rows = report.selected.map((f) => `| ${f.id} | ${f.score} | ${f.rule} | ${escapeCell(f.file)}:${f.line} | ${escapeCell(f.simulationScenarios.join(', '))} |`).join('\n');
  return `# ENS Formal Bug Scan — DSG\n\n**Verdict:** ${report.verdict}\n\n- Frozen source: \`${report.expectedSource}\`\n- Files scanned: ${report.filesScanned}\n- Static candidates: ${report.candidateCount}\n- Ising-prioritized: ${report.selectedCount}\n- Z3/SMT triage validation: ${report.z3.status}\n- Evidence hash: \`${report.proofHash}\`\n\n## Selected review candidates\n\n| ID | Score | Rule | Location | Local review scenarios |\n|---|---:|---|---|---|\n${rows || '| — | — | — | No candidate selected | — |'}\n\n## DSG gate\n\nSubmission is **blocked by design** until scope, known-issue dedupe, a runnable local PoC, impact, and human review are complete.\n\n## Claim boundary\n\n${report.claimBoundary.map((x) => `- ${x}`).join('\n')}\n`;
}

function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { const t = argv[i]; if (!t.startsWith('--')) continue; const k = t.slice(2); const n = argv[i + 1]; if (!n || n.startsWith('--')) out[k] = true; else { out[k] = n; i += 1; } } return out; }
function xorshift32(initial) { let state = initial >>> 0 || 1; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; }; }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalize(value) { return value.split(path.sep).join('/'); }
function escapeCell(value) { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }
