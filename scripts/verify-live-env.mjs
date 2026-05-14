#!/usr/bin/env node

const CHECKS = {
  'live-db': {
    label: 'Live Supabase DB tests',
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    next: 'Set staging Supabase env, then run: npm run test:live:db:required',
  },
  'rate-limit': {
    label: 'Serverless rate limiting',
    required: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    next: 'Set Upstash REST env in preview/prod so rate limiting does not fall back to process memory.',
  },
};

const scope = process.argv[2] ?? 'all';
const selected = scope === 'all' ? Object.entries(CHECKS) : [[scope, CHECKS[scope]]];

if (selected.some(([, check]) => !check)) {
  console.error(`[live-env] unknown scope: ${scope}`);
  console.error(`[live-env] supported scopes: ${['all', ...Object.keys(CHECKS)].join(', ')}`);
  process.exit(2);
}

const failures = [];

for (const [name, check] of selected) {
  const missing = check.required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    failures.push({ name, ...check, missing });
  }
}

if (failures.length > 0) {
  console.error('[live-env] missing required environment variables; no secret values were printed.');
  for (const failure of failures) {
    console.error(`\n[${failure.name}] ${failure.label}`);
    for (const key of failure.missing) {
      console.error(`- ${key}`);
    }
    console.error(`Next: ${failure.next}`);
  }
  process.exit(1);
}

for (const [name, check] of selected) {
  console.log(`[live-env] ${name}: ok (${check.required.length} required vars set; values redacted)`);
}
