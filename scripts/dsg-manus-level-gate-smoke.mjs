#!/usr/bin/env node

const fs = await import('node:fs/promises');

const requiredFiles = [
  'lib/dsg/manus-level/capability-gate.ts',
  'app/api/dsg/manus-level/status/route.ts',
  'app/dsg/manus-level/page.tsx',
];

for (const file of requiredFiles) {
  await fs.access(file);
}

const gate = await fs.readFile('lib/dsg/manus-level/capability-gate.ts', 'utf8');
const page = await fs.readFile('app/dsg/manus-level/page.tsx', 'utf8');
const route = await fs.readFile('app/api/dsg/manus-level/status/route.ts', 'utf8');

if (!gate.includes('MANUS_LEVEL_COMPLETE')) throw new Error('gate must define complete claim');
if (!gate.includes('sandbox_isolation')) throw new Error('gate must include sandbox isolation capability');
if (!gate.includes('remote_browser_session')) throw new Error('gate must include remote browser capability');
if (!gate.includes("status('sandbox_isolation', 'BLOCKED')")) throw new Error('sandbox must default to blocked');
if (!gate.includes("status('remote_browser_session', 'BLOCKED')")) throw new Error('remote browser must default to blocked');
if (!page.includes('MANUS_LEVEL')) throw new Error('page must render claim');
if (!route.includes('evaluateManusLevelGate')) throw new Error('API route must use gate evaluator');

console.log('PASS: Manus-level gate smoke checks passed');
