#!/usr/bin/env node

const rawUrl = process.argv[2];
const attempts = Number.parseInt(process.env.HEALTH_VERIFY_ATTEMPTS || '8', 10);
const delayMs = Number.parseInt(process.env.HEALTH_VERIFY_DELAY_MS || '5000', 10);
const timeoutMs = Number.parseInt(process.env.HEALTH_VERIFY_TIMEOUT_MS || '10000', 10);

if (!rawUrl) {
  console.error('Usage: node scripts/verify-health-url.mjs <health-url>');
  process.exit(2);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error('Health URL is invalid');
  process.exit(2);
}

if (url.protocol !== 'https:') {
  console.error('Health URL must use HTTPS');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastFailure = 'unknown';

// Vercel Deployment Protection guards preview deployments and answers
// unauthenticated requests with 401 (or an SSO redirect). The supported way for
// automation to reach a protected deployment is the bypass secret from
// Project Settings -> Deployment Protection -> Protection Bypass for Automation.
// Protection itself stays enabled; only this request is exempted.
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const requestHeaders = { accept: 'application/json' };
if (bypassSecret) {
  requestHeaders['x-vercel-protection-bypass'] = bypassSecret;
  // Do not have Vercel set a bypass cookie on the response.
  requestHeaders['x-vercel-set-bypass-cookie'] = 'false';
}

/**
 * Vercel's protection layer replies 401, or 302 to vercel.com/sso-api, before
 * the deployment runs any application code. Naming that explicitly keeps it
 * from being misread as an application or database failure.
 */
function describeProtectionBlock(status, location) {
  const looksLikeSso = status === 401 || (location || '').includes('/sso-api');
  if (!looksLikeSso) return null;
  return bypassSecret
    ? 'vercel_deployment_protection_bypass_rejected'
    : 'vercel_deployment_protection_no_bypass_secret';
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
      headers: requestHeaders,
    });

    if (response.status !== 200) {
      const location = response.headers.get('location');
      const protectionBlock = describeProtectionBlock(response.status, location);
      if (protectionBlock) {
        lastFailure = protectionBlock;
      } else {
        lastFailure = location
          ? `unexpected_http_${response.status}_redirect`
          : `unexpected_http_${response.status}`;
      }
      console.error(`Health attempt ${attempt}/${attempts}: ${lastFailure}`);
      if (protectionBlock) break; // Retrying cannot resolve a protection block.
    } else {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        lastFailure = 'response_not_json';
        console.error(`Health attempt ${attempt}/${attempts}: ${lastFailure}`);
      } else {
        const payload = await response.json();
        if (payload?.ok !== true) {
          lastFailure = `health_payload_not_ok:${String(payload?.error ?? 'unknown')}`;
          console.error(`Health attempt ${attempt}/${attempts}: ${lastFailure}`);
        } else {
          console.log(`Health verified: HTTP 200 + JSON ok=true (${url.origin}${url.pathname})`);
          process.exit(0);
        }
      }
    }
  } catch (error) {
    lastFailure = error?.name === 'AbortError' ? 'request_timeout' : 'request_failed';
    console.error(`Health attempt ${attempt}/${attempts}: ${lastFailure}`);
  } finally {
    clearTimeout(timer);
  }

  if (attempt < attempts) await sleep(delayMs);
}

console.error(`Health verification failed closed: ${lastFailure}`);

if (lastFailure === 'vercel_deployment_protection_no_bypass_secret') {
  console.error('');
  console.error('The deployment is reachable but Vercel Deployment Protection rejected');
  console.error('this unauthenticated request, so no application code ran. This is not');
  console.error('evidence of an application, database, or health-route defect.');
  console.error('');
  console.error('To let CI verify protected preview deployments, generate a bypass');
  console.error('secret in Vercel: Project Settings -> Deployment Protection ->');
  console.error('Protection Bypass for Automation, then expose it to this job as the');
  console.error('VERCEL_AUTOMATION_BYPASS_SECRET repository secret. Deployment');
  console.error('Protection stays enabled; do not disable it to make this check pass.');
} else if (lastFailure === 'vercel_deployment_protection_bypass_rejected') {
  console.error('');
  console.error('VERCEL_AUTOMATION_BYPASS_SECRET was sent but Vercel still rejected the');
  console.error('request. The secret is likely stale or belongs to another project —');
  console.error('regenerate it under Project Settings -> Deployment Protection.');
}

process.exit(1);
