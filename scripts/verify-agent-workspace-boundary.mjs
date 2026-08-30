#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] || process.env.AGENT_WORKSPACE_BASE_REF || 'origin/main';
const environment = process.env.AGENT_WORKSPACE_ENV || 'development';
const targetConfigPath = 'config/production-deployment-target.json';

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
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
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
  { label: 'Stripe live secret', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]+/ },
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'production database mutation marker', pattern: /AGENT_WORKSPACE_ENV\s*=\s*production/i },
  { label: 'production access enabled', pattern: /production_access\s*=\s*true/i },
  { label: 'production lock disabled', pattern: /production_locked\s*=\s*false/i },
];

const failures = forbidden
  .filter(({ pattern }) => pattern.test(addedLines))
  .map(({ label }) => label);

let target;
try {
  target = JSON.parse(readFileSync(targetConfigPath, 'utf8'));
} catch {
  failures.push(`${targetConfigPath} must exist and contain valid JSON`);
}

if (target) {
  if (target.schemaVersion !== 'dsg.production-target.v1') {
    failures.push(`unsupported production target schema: ${target.schemaVersion ?? 'missing'}`);
  }

  if (target.provider === 'UNBOUND') {
    if (target.productionDeployEnabled !== false) {
      failures.push('UNBOUND production target must set productionDeployEnabled=false');
    }
    if (target.status !== 'BLOCKED_UNTIL_BOUND') {
      failures.push('UNBOUND production target must be BLOCKED_UNTIL_BOUND');
    }
    if (target.healthProbe !== null || target.rollbackTarget !== null) {
      failures.push('UNBOUND production target must not claim health or rollback evidence');
    }
  } else {
    if (typeof target.provider !== 'string' || target.provider.trim().length === 0) {
      failures.push('production target provider must be a non-empty string or UNBOUND');
    }
    if (target.productionDeployEnabled === true) {
      if (typeof target.healthProbe !== 'string' || target.healthProbe.length === 0) {
        failures.push('enabled production target requires a healthProbe');
      }
      if (typeof target.rollbackTarget !== 'string' || target.rollbackTarget.length === 0) {
        failures.push('enabled production target requires a rollbackTarget');
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`Blocked: ${failure}`);
  process.exit(1);
}

console.log(
  `Agent workspace boundary PASS: provider=${target.provider} status=${target.status} productionDeployEnabled=${target.productionDeployEnabled}`,
);
