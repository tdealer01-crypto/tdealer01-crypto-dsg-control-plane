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
        nextAction: 'Use the deployed HTTPS production URL; localhost and http URLs are not accepted for marketplace audit evidence.',
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
const url = new URL('/api/dsg/marketplace/audit-packet', baseUrl);

try {
  const response = await fetch(url);
  const json = await response.json().catch(() => null);
  const failures = [];
  if (!response.ok) failures.push(`HTTP ${response.status}`);
  if (!json?.ok) failures.push('ok must be true');
  if (json?.product !== 'DSG ONE V1') failures.push('product must be DSG ONE V1');
  if (!['PASS', 'REVIEW', 'BLOCKED'].includes(json?.finalVerdict)) failures.push('finalVerdict must be PASS, REVIEW, or BLOCKED');
  if (json?.finalVerdict === 'PASS') failures.push('finalVerdict must not be PASS until approvals/enforcement tests are attached');
  if (!Array.isArray(json?.missingEvidence)) failures.push('missingEvidence must be an array');

  const summary = {
    ok: failures.length === 0,
    url: url.toString(),
    status: response.status,
    finalVerdict: json?.finalVerdict,
    missingEvidenceCount: json?.missingEvidence?.length ?? null,
    failures,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exit(1);
} catch (error) {
  failSummary(['fetch failed'], {
    url: url.toString(),
    error: error instanceof Error ? error.message : String(error),
    nextAction: 'Verify the HTTPS deployment is reachable, then rerun smoke:audit-packet.',
  });
}
