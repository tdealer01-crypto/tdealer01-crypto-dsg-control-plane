#!/usr/bin/env node

const required = [
  ['DSG_ONE_V1_SUPABASE_URL', 'SUPABASE_URL'],
  ['DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['GITHUB_TOKEN'],
];

const warnings = [
  ['DSG_BUILDER_GITHUB_OWNER'],
  ['DSG_BUILDER_GITHUB_REPO'],
  ['DSG_BUILDER_BASE_BRANCH'],
  ['APP_URL'],
  ['VERCEL_TOKEN'],
  ['VERCEL_ORG_ID'],
  ['VERCEL_PROJECT_ID'],
];

function present(name) {
  const value = process.env[name];
  return Boolean(value && value.trim() && !value.includes('MY_'));
}

function anyPresent(names) {
  return names.some((name) => present(name));
}

const failures = required.filter((names) => !anyPresent(names));
const warn = warnings.filter((names) => !anyPresent(names));

const report = {
  product: 'DSG ONE V1 Product Ready Fullstack',
  deterministic: true,
  level: failures.length > 0 ? 'BLOCKED' : warn.length > 0 ? 'PILOT_READY' : 'PRODUCT_READY',
  required: required.map((names) => ({names, status: anyPresent(names) ? 'PASS' : 'FAIL'})),
  warnings: warnings.map((names) => ({names, status: anyPresent(names) ? 'PASS' : 'WARN'})),
  generatedAt: new Date().toISOString(),
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  console.error(`DSG_PRODUCT_READY_BLOCKED: ${failures.map((names) => names.join(' or ')).join(', ')}`);
  process.exit(1);
}
