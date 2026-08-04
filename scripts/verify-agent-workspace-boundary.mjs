#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const baseRef = process.argv[2] || process.env.AGENT_WORKSPACE_BASE_REF || 'origin/main';
const environment = process.env.AGENT_WORKSPACE_ENV || 'development';

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
  { label: 'Vercel production deploy', pattern: /\bvercel\b[^\n]*(?:--prod|--target[= ]production)/i },
  { label: 'Stripe live secret', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]+/ },
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'production database mutation marker', pattern: /AGENT_WORKSPACE_ENV\s*=\s*production/i },
  { label: 'production access enabled', pattern: /production_access\s*=\s*true/i },
  { label: 'production lock disabled', pattern: /production_locked\s*=\s*false/i },
];

const failures = forbidden.filter(({ pattern }) => pattern.test(addedLines));
if (failures.length > 0) {
  for (const failure of failures) console.error(`Blocked: ${failure.label}`);
  process.exit(1);
}

console.log('Agent workspace boundary PASS: changed lines contain no direct production unlock or secret material.');
