#!/usr/bin/env node
/**
 * Dashboard i18n smoke test — pure Node.js, no browser/Playwright needed.
 * Works on Termux/Android.
 *
 * Mode A — raw cookie (recommended when anon key is rotated):
 *   SUPABASE_SESSION_COOKIE   full Cookie header string copied from browser DevTools
 *   PLAYWRIGHT_BASE_URL       Vercel URL (default: http://127.0.0.1:3000)
 *
 * Mode B — password login:
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (or SUPABASE_ANON_KEY)
 *   E2E_TEST_EMAIL
 *   E2E_TEST_PASSWORD
 *   PLAYWRIGHT_BASE_URL
 *
 * Checks: HTTP status 200, no Thai characters in rendered HTML.
 */

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://zeyguilldygozufpgxms.supabase.co';

const RAW_COOKIE = process.env.SUPABASE_SESSION_COOKIE;

const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

const EMAIL    = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

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

// ─── Build cookie header ──────────────────────────────────────────────────────

let cookieHeader;

if (RAW_COOKIE) {
  // Mode A: use cookie copied directly from browser DevTools
  console.log('Mode A: using raw session cookie\n');
  cookieHeader = RAW_COOKIE;

} else if (ANON_KEY && EMAIL && PASSWORD) {
  // Mode B: sign in via Supabase REST API
  console.log(`Mode B: signing in to ${SUPABASE_URL} as ${EMAIL} ...`);

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!authRes.ok) {
    const body = await authRes.text();
    console.error(`❌ Supabase auth failed HTTP ${authRes.status}: ${body.slice(0, 200)}`);
    console.error('\nAnon key may be rotated. Switch to Mode A:');
    console.error('  1. Open https://tdealer01-crypto-dsg-control-plane.vercel.app in browser and log in');
    console.error('  2. DevTools → Application → Cookies → copy the sb-*-auth-token cookie');
    console.error('  3. Re-run: SUPABASE_SESSION_COOKIE="sb-zeyguilldygozufpgxms-auth-token=<value>" \\');
    console.error('            PLAYWRIGHT_BASE_URL=https://... node scripts/smoke-dashboard-node.mjs');
    process.exit(1);
  }

  const session = await authRes.json();
  if (!session.access_token) {
    console.error('❌ No access_token in response:', JSON.stringify(session).slice(0, 200));
    process.exit(1);
  }
  console.log(`✅ Signed in as ${session.user?.email ?? EMAIL}\n`);

  // @supabase/ssr v0.7 stores session as raw JSON, chunked at 3180 URI-encoded chars
  const { createChunks } = await import('@supabase/ssr/dist/module/utils/chunker.js');
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const chunks = createChunks(cookieName, JSON.stringify(session));
  cookieHeader = chunks.map(({ name, value }) => `${name}=${value}`).join('; ');

} else {
  console.error('Provide one of:\n');
  console.error('  Mode A (browser cookie — works even when anon key is rotated):');
  console.error('    SUPABASE_SESSION_COOKIE="sb-zeyguilldygozufpgxms-auth-token=<value>"');
  console.error('\n  Mode B (password login):');
  console.error('    NEXT_PUBLIC_SUPABASE_ANON_KEY=...  E2E_TEST_EMAIL=...  E2E_TEST_PASSWORD=...');
  console.error('\nHow to get the cookie (Mode A):');
  console.error('  1. Open https://tdealer01-crypto-dsg-control-plane.vercel.app in browser');
  console.error('  2. Log in → DevTools (F12) → Application → Cookies');
  console.error('  3. Find sb-zeyguilldygozufpgxms-auth-token → copy value');
  console.error('  4. SUPABASE_SESSION_COOKIE="sb-zeyguilldygozufpgxms-auth-token=<paste>" \\');
  console.error('     PLAYWRIGHT_BASE_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app \\');
  console.error('     node scripts/smoke-dashboard-node.mjs');
  process.exit(2);
}

// ─── Fetch 7 dashboard routes ─────────────────────────────────────────────────

let failures = 0;

for (const route of ROUTES) {
  const url = `${BASE_URL}/dashboard/${route}`;
  process.stdout.write(`  ${url} ... `);

  let status, body;
  try {
    const res = await fetch(url, { headers: { Cookie: cookieHeader }, redirect: 'follow' });
    status = res.status;
    body = await res.text();
  } catch (err) {
    console.log(`❌ fetch error: ${err.message}`);
    failures++;
    continue;
  }

  const issues = [];
  if (status >= 400) issues.push(`HTTP ${status}`);
  if (body.includes('Service unavailable') || body.includes('authentication not configured')) issues.push('auth-gate-503');
  if (body.includes('href="/login"') && !body.includes('/dashboard')) issues.push('redirected-to-login');
  if (THAI_PATTERN.test(body)) issues.push('THAI_TEXT_IN_HTML');

  if (issues.length > 0) {
    console.log(`❌ [${issues.join(', ')}]`);
    failures++;
  } else {
    const title = (body.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '(no title)';
    console.log(`✅ HTTP ${status} — "${title}"`);
  }
}

if (failures > 0) {
  console.error(`\n❌ ${failures}/${ROUTES.length} routes failed`);
  process.exit(1);
}

console.log(`\n✅ All ${ROUTES.length}/7 dashboard routes: HTTP 200, no Thai text`);
console.log('Dashboard smoke gate: PASS');
