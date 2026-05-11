#!/usr/bin/env node

const appUrl = process.env.APP_URL || process.env.DSG_ONE_V1_PRODUCTION_URL;

if (!appUrl) {
  console.error('BLOCK: APP_URL or DSG_ONE_V1_PRODUCTION_URL is required');
  process.exit(1);
}

if (!appUrl.startsWith('https://')) {
  console.error('BLOCK: accessibility QA check requires an https URL');
  process.exit(1);
}

const endpoint = `${appUrl.replace(/\/$/, '')}/api/dsg/marketplace/accessibility-qa`;
const response = await fetch(endpoint, {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'user-agent': 'dsg-accessibility-qa-check/1.0',
  },
  cache: 'no-store',
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error('BLOCK: accessibility QA endpoint returned non-json');
  console.error(text.slice(0, 500));
  process.exit(1);
}

if (!response.ok || json?.ok !== true) {
  console.error('BLOCK: accessibility QA endpoint failed');
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

const checks = Array.isArray(json.checks) ? json.checks : [];
const validStatuses = checks.every((check) => ['PASS', 'REVIEW', 'BLOCKED'].includes(check.status));
const blocked = checks.filter((check) => check.status === 'BLOCKED');
const review = checks.filter((check) => check.status === 'REVIEW');
const pass = checks.filter((check) => check.status === 'PASS');
const noMockRulePresent = json.noMockPolicy?.enforced === true && typeof json.noMockPolicy?.rule === 'string';

if (!validStatuses || !noMockRulePresent || checks.length === 0) {
  console.error('BLOCK: accessibility QA report schema is invalid');
  console.error(JSON.stringify({ validStatuses, noMockRulePresent, checks: checks.length }, null, 2));
  process.exit(1);
}

if (json.verdict === 'PASS' && blocked.length > 0) {
  console.error('BLOCK: verdict cannot be PASS while blocked checks exist');
  process.exit(1);
}

console.log('PASS: accessibility QA endpoint responded with a valid evidence report');
console.log(JSON.stringify({
  endpoint,
  verdict: json.verdict,
  checks: checks.length,
  pass: pass.length,
  review: review.length,
  blocked: blocked.length,
  scope: json.scope,
}, null, 2));
