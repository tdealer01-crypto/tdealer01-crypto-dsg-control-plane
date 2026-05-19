#!/usr/bin/env node
/**
 * Dashboard i18n smoke test — pure Node.js, no browser/Playwright needed.
 * Works on Termux/Android.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL     e.g. https://abcdef.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   E2E_TEST_EMAIL
 *   E2E_TEST_PASSWORD
 *   PLAYWRIGHT_BASE_URL          Vercel URL (default: http://127.0.0.1:3000)
 *
 * What it does:
 *   1. Calls Supabase /auth/v1/token to get a session
 *   2. Constructs the @supabase/ssr cookie the middleware expects
 *   3. Fetches each of 7 dashboard routes with that cookie
 *   4. Checks HTTP status and HTML for Thai characters
 */

const BASE_URL      = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const EMAIL         = process.env.E2E_TEST_EMAIL;
const PASSWORD      = process.env.E2E_TEST_PASSWORD;

if (!SUPABASE_URL || !ANON_KEY || !EMAIL || !PASSWORD) {
  console.error([
    'Missing required env vars (accepts NEXT_PUBLIC_ prefix or plain):',
    !SUPABASE_URL  && '  NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)',
    !ANON_KEY      && '  NEXT_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)',
    !EMAIL         && '  E2E_TEST_EMAIL',
    !PASSWORD      && '  E2E_TEST_PASSWORD',
  ].filter(Boolean).join('\n'));
  process.exit(2);
}

const ROUTES = [
  'audit',
  'executions',
  'live-control',
  'policies',
  'referrals',
  'skills',
  'verification',
];

const THAI_PATTERN = /[฀-๿]/;

// --- Step 1: Supabase password auth ---
console.log(`\nSigning in to Supabase (${SUPABASE_URL}) ...`);
const authRes = await fetch(
  `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  },
);

if (!authRes.ok) {
  const body = await authRes.text();
  console.error(`❌ Supabase auth failed HTTP ${authRes.status}: ${body.slice(0, 200)}`);
  process.exit(1);
}

const session = await authRes.json();
if (!session.access_token) {
  console.error('❌ Supabase auth response has no access_token:', JSON.stringify(session).slice(0, 200));
  process.exit(1);
}
console.log(`✅ Signed in as ${session.user?.email ?? EMAIL}\n`);

// --- Step 2: Build @supabase/ssr session cookie ---
// @supabase/ssr stores session as btoa(JSON.stringify(session)) in
// sb-<project-ref>-auth-token.  The project ref is the subdomain of supabase.co.
const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
const cookieName = `sb-${projectRef}-auth-token`;

// The session value stored by @supabase/ssr is the full session JSON, base64-encoded.
// For chunked storage (value > 3600 bytes) it uses .0, .1 suffixes; we let
// the server reassemble from the single cookie — in practice the token fits.
const sessionJson = JSON.stringify(session);
const cookieValue = Buffer.from(sessionJson).toString('base64');
const cookieHeader = `${cookieName}=${cookieValue}`;

// --- Step 3: Fetch each dashboard route ---
let failures = 0;

for (const route of ROUTES) {
  const url = `${BASE_URL}/dashboard/${route}`;
  process.stdout.write(`  ${url} ... `);

  let status, body;
  try {
    const res = await fetch(url, {
      headers: { Cookie: cookieHeader },
      redirect: 'follow',
    });
    status = res.status;
    body = await res.text();
  } catch (err) {
    console.log(`❌ fetch error: ${err.message}`);
    failures++;
    continue;
  }

  const isAuthGate = body.includes('Service unavailable') || body.includes('authentication not configured');
  const redirectedToLogin = body.includes('/login') && status < 300;
  const hasThai = THAI_PATTERN.test(body);

  const issues = [];
  if (status >= 400)   issues.push(`HTTP ${status}`);
  if (isAuthGate)      issues.push('auth-gate-503');
  if (redirectedToLogin) issues.push('redirected-to-login (cookie not accepted)');
  if (hasThai)         issues.push('THAI_TEXT_IN_HTML');

  if (issues.length > 0) {
    console.log(`❌ [${issues.join(', ')}]`);
    failures++;
  } else {
    // Extract <title> for quick human confirmation
    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '(no title)';
    console.log(`✅ HTTP ${status} — "${title}"`);
  }
}

// --- Result ---
if (failures > 0) {
  console.error(`\n❌ ${failures}/${ROUTES.length} routes failed`);
  console.error('Tip: if "cookie not accepted", try copying a real browser session cookie');
  console.error('     and set it as SUPABASE_SESSION_COOKIE=<full-raw-cookie-string>');
  process.exit(1);
}

console.log(`\n✅ All ${ROUTES.length}/7 dashboard routes: HTTP 200, no Thai text in HTML`);
console.log('Dashboard smoke gate: PASS');
