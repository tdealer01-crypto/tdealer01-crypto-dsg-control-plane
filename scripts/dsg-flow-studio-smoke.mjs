#!/usr/bin/env node

const fs = await import('node:fs/promises');

const requiredFiles = [
  'app/dsg/flow-studio/page.tsx',
  'app/api/dsg/flow-studio/orchestrator/route.ts',
  'app/api/dsg/flow-studio/mcp/route.ts',
  'app/api/dsg/flow-studio/config/route.ts',
  'app/api/dsg/flow-studio/mutate/route.ts',
  'lib/dsg/flow-studio/types.ts',
  'lib/dsg/flow-studio/orchestrator.ts',
];

for (const file of requiredFiles) {
  await fs.access(file);
}

const mutate = await fs.readFile('app/api/dsg/flow-studio/mutate/route.ts', 'utf8');
const mcp = await fs.readFile('app/api/dsg/flow-studio/mcp/route.ts', 'utf8');
const page = await fs.readFile('app/dsg/flow-studio/page.tsx', 'utf8');

if (!mutate.includes('requireVerifiedDsgActor')) throw new Error('mutate route must require verified actor');
if (!mutate.includes('dry_run_only')) throw new Error('mutate route must remain dry-run only');
if (!mcp.includes('allowedHosts')) throw new Error('mcp route must use allowlist');
if (!page.includes('/api/dsg/flow-studio/orchestrator')) throw new Error('page must call namespaced orchestrator');
if (page.includes('/api/mutate') || page.includes('/api/mcp') || page.includes('/api/orchestrator')) throw new Error('page must not call root Flow Studio routes');

console.log('PASS: Flow Studio integration static smoke checks passed');
