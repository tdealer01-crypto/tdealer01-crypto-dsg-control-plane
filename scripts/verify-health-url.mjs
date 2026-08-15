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

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (response.status !== 200) {
      const location = response.headers.get('location');
      lastFailure = location
        ? `unexpected_http_${response.status}_redirect`
        : `unexpected_http_${response.status}`;
      console.error(`Health attempt ${attempt}/${attempts}: ${lastFailure}`);
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
process.exit(1);
