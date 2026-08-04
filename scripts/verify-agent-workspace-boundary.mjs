#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseRef = process.argv[2] || process.env.AGENT_WORKSPACE_BASE_REF || 'origin/main';
const environment = process.env.AGENT_WORKSPACE_ENV || 'development';
const promotedWorkflowPath = '.github/workflows/promoted-production-deploy.yml';

if (!['development', 'preview'].includes(environment)) {
  console.error(`Agent workspace must run in development or preview, received: ${environment}`);
  process.exit(1);
}

let diff = '';
try {
  diff = execFileSync(
    'git',
    [
      'diff',
      '--unified=0',
      `${baseRef}...HEAD`,
      '--',
      '.',
      ':(exclude)scripts/verify-agent-workspace-boundary.mjs',
      `:(exclude)${promotedWorkflowPath}`,
    ],
    { encoding: 'utf8' },
  );
} catch {
  console.error(`Unable to inspect changes against ${baseRef}`);
  process.exit(1);
}

const addedLines = diff
  .split('\n')
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .join('\n');

const forbidden = [
  { label: 'direct Vercel production deploy outside promoted workflow', pattern: /\bvercel\b[^\n]*(?:--prod|--target[= ]production)/i },
  { label: 'Stripe live secret', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]+/ },
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'production database mutation marker', pattern: /AGENT_WORKSPACE_ENV\s*=\s*production/i },
  { label: 'production access enabled', pattern: /production_access\s*=\s*true/i },
  { label: 'production lock disabled', pattern: /production_locked\s*=\s*false/i },
];

const failures = forbidden
  .filter(({ pattern }) => pattern.test(addedLines))
  .map(({ label }) => label);

const workflowDirectory = '.github/workflows';
for (const fileName of readdirSync(workflowDirectory)) {
  if (!/\.ya?ml$/i.test(fileName)) continue;
  const path = join(workflowDirectory, fileName);
  if (path === promotedWorkflowPath) continue;
  const content = readFileSync(path, 'utf8');
  if (/vercel[^\n]*--prod/i.test(content)) {
    failures.push(`production deploy command exists outside ${promotedWorkflowPath}: ${path}`);
  }
}

const promotedWorkflow = readFileSync(promotedWorkflowPath, 'utf8');
const requiredPromotionControls = [
  'workflow_dispatch:',
  'environment: production',
  'Require exact current main commit',
  'npm audit --audit-level=high',
  'approve-agent-workspace-promotion.mjs',
  'finalize-agent-workspace-promotion.mjs',
  'AGENT_WORKSPACE_SUPABASE_SERVICE_ROLE_KEY',
  'VERCEL_CLI_VERSION: 58.0.0',
  'rollback',
  'commit_sha:',
];
for (const requiredControl of requiredPromotionControls) {
  if (!promotedWorkflow.includes(requiredControl)) {
    failures.push(`promoted production workflow is missing control: ${requiredControl}`);
  }
}
if (/^\s*push\s*:/m.test(promotedWorkflow)) {
  failures.push('promoted production workflow must not run on push');
}
if (!/vercel[^\n]*--prod/i.test(promotedWorkflow)) {
  failures.push('promoted production workflow contains no explicit production deployment command');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`Blocked: ${failure}`);
  process.exit(1);
}

console.log('Agent workspace boundary PASS: production stays locked except for the verified manual promotion workflow.');
