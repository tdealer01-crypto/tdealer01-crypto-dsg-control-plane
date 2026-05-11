#!/usr/bin/env node

function failSummary(failures, extra = {}) {
  const summary = {
    ok: false,
    checkedAt: new Date().toISOString(),
    failures,
    ...extra,
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
}

function resolveBaseUrl() {
  const rawBaseUrl = process.env.APP_URL || process.env.DSG_ONE_V1_PRODUCTION_URL;
  if (!rawBaseUrl) {
    failSummary(['APP_URL or DSG_ONE_V1_PRODUCTION_URL is required'], {
      nextAction: 'Set APP_URL="https://dsg-one-v1.vercel.app" or DSG_ONE_V1_PRODUCTION_URL before running this production smoke.',
    });
  }

  try {
    const baseUrl = new URL(rawBaseUrl);
    if (baseUrl.protocol !== 'https:') {
      failSummary(['APP_URL or DSG_ONE_V1_PRODUCTION_URL must use https'], {
        baseUrl: rawBaseUrl,
        nextAction: 'Use the deployed HTTPS production URL; localhost and http URLs are not accepted for first-value marketplace evidence.',
      });
    }
    return baseUrl.origin;
  } catch (error) {
    failSummary(['APP_URL or DSG_ONE_V1_PRODUCTION_URL must be a valid URL'], {
      baseUrl: rawBaseUrl,
      error: error instanceof Error ? error.message : String(error),
      nextAction: 'Provide a valid HTTPS production URL.',
    });
  }
}

const baseUrl = resolveBaseUrl();
const routes = [
  '/dsg/app-builder',
  '/enterprise/readiness',
  '/enterprise/terms',
  '/enterprise/privacy',
  '/enterprise/security',
  '/enterprise/support',
  '/enterprise/entitlement',
  '/enterprise/security-rbac',
  '/enterprise/accessibility',
  '/enterprise/market',
  '/api/dsg/market/agent-app-builder',
  '/api/dsg/marketplace/audit-packet',
  '/api/dsg/marketplace/readiness-score',
];
const results = [];

for (const route of routes) {
  const url = new URL(route, baseUrl);
  try {
    const response = await fetch(url, { redirect: 'manual' });
    results.push({ route, status: response.status, ok: response.status >= 200 && response.status < 300 });
  } catch (error) {
    results.push({ route, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const failures = results.filter((result) => !result.ok);
console.log(JSON.stringify({ ok: failures.length === 0, baseUrl, checkedAt: new Date().toISOString(), results, failures }, null, 2));
if (failures.length) process.exit(1);
