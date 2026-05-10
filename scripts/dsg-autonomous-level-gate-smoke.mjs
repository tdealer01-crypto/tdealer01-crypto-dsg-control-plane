#!/usr/bin/env node

const fs = await import('node:fs/promises');

const requiredFiles = [
  'lib/dsg/autonomous-level/capability-gate.ts',
  'lib/dsg/autonomous-level/provider-proof-summary.ts',
  'app/api/dsg/autonomous-level/status/route.ts',
  'app/dsg/autonomous-level/page.tsx',
];

for (const file of requiredFiles) {
  await fs.access(file);
}

const gate = await fs.readFile('lib/dsg/autonomous-level/capability-gate.ts', 'utf8');
const summary = await fs.readFile('lib/dsg/autonomous-level/provider-proof-summary.ts', 'utf8');
const page = await fs.readFile('app/dsg/autonomous-level/page.tsx', 'utf8');
const route = await fs.readFile('app/api/dsg/autonomous-level/status/route.ts', 'utf8');
const all = `${gate}\n${summary}\n${page}\n${route}`;

if (!gate.includes('DSG_AUTONOMOUS_LEVEL_COMPLETE')) throw new Error('gate must define DSG complete claim');
if (!gate.includes('DSG_AUTONOMOUS_LEVEL_PARTIAL')) throw new Error('gate must define DSG partial claim');
if (!gate.includes('providerProofComplete')) throw new Error('gate must read provider proof completion');
if (!gate.includes('DSG_PROVIDER_PROOF_SUMMARY')) throw new Error('gate must include provider proof summary');
if (!summary.includes('DSG_PROVIDER_PROOF_COMPLETE')) throw new Error('summary must include provider proof complete claim');
if (!summary.includes('safe-summary-only')) throw new Error('summary must be safe-summary-only');
if (!summary.includes('local-only')) throw new Error('summary must keep raw artifacts local-only');
if (!summary.includes('47c093d6088bae75e32877f73048eb8792f77212ff433743b78891219d0f995a')) throw new Error('summary must include validator proof hash');
if (!gate.includes('sandbox_isolation')) throw new Error('gate must include sandbox isolation capability');
if (!gate.includes('remote_browser_session')) throw new Error('gate must include remote browser capability');
if (!page.includes('gate.claim')) throw new Error('page must render gate.claim');
if (!page.includes('gate.complete ?')) throw new Error('page must render completion boundary');
if (!route.includes('evaluateDsgAutonomousLevelGate')) throw new Error('API route must use DSG gate evaluator');
if (/manus/i.test(all)) throw new Error('DSG autonomous level files must not reference external platform names');

console.log('PASS: DSG autonomous level gate smoke checks passed');
