#!/usr/bin/env node
/**
 * Dashboard i18n smoke test — login then screenshot 7 protected routes.
 *
 * Required env:
 *   E2E_TEST_EMAIL       staging test user email
 *   E2E_TEST_PASSWORD    staging test user password
 *   PLAYWRIGHT_BASE_URL  deployment URL (default: http://127.0.0.1:3000)
 *
 * Optional env:
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH  custom chromium binary
 *
 * Output:
 *   artifacts/i18n-smoke/auth-dashboard-<route>.png
 *   exits non-zero if any route returns an error page or Thai text is detected
 */

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

if (!email || !password) {
  console.error('Missing required env: E2E_TEST_EMAIL, E2E_TEST_PASSWORD');
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

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Executable doesn't exist")) throw err;
    console.warn('Installing Playwright headless shell...');
    execSync('npx playwright install --only-shell chromium', { stdio: 'inherit' });
    return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  }
}

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Login
console.log(`\nLogging in at ${BASE_URL}/password-login ...`);
await page.goto(`${BASE_URL}/password-login?next=/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.fill('#email', email);
await page.fill('#password', password);
await page.click('button[type="submit"], form button');

try {
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  console.log('✅ Login succeeded, session active\n');
} catch {
  const outDir = 'artifacts/i18n-smoke';
  await mkdir(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/auth-LOGIN-FAILED.png`, fullPage: true });
  console.error('❌ Login failed — screenshot saved to artifacts/i18n-smoke/auth-LOGIN-FAILED.png');
  await browser.close();
  process.exit(1);
}

await mkdir('artifacts/i18n-smoke', { recursive: true });

let failures = 0;
const report = [];

for (const route of ROUTES) {
  const url = `${BASE_URL}/dashboard/${route}`;
  const outPath = `artifacts/i18n-smoke/auth-dashboard-${route}.png`;

  process.stdout.write(`  ${url} ... `);

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const status = response?.status() ?? 0;
    await page.screenshot({ path: outPath, fullPage: true });

    // Check for auth gate error
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const hasGateError = bodyText.includes('Service unavailable') || bodyText.includes('authentication not configured');
    const hasThai = THAI_PATTERN.test(bodyText);

    const issues = [];
    if (status >= 400) issues.push(`HTTP ${status}`);
    if (hasGateError) issues.push('auth-gate');
    if (hasThai) issues.push('THAI_TEXT_DETECTED');

    if (issues.length > 0) {
      console.log(`❌ [${issues.join(', ')}]`);
      failures++;
      report.push({ route, status, issues });
    } else {
      const title = await page.title();
      console.log(`✅ HTTP ${status} — "${title}"`);
      report.push({ route, status, issues: [] });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ [error: ${msg.slice(0, 80)}]`);
    failures++;
    report.push({ route, status: 0, issues: [`error: ${msg.slice(0, 80)}`] });
  }
}

await writeFile('artifacts/i18n-smoke/report.json', JSON.stringify({ base: BASE_URL, routes: report }, null, 2));
await browser.close();

console.log(`\nScreenshots saved to artifacts/i18n-smoke/`);
console.log(`Report saved to artifacts/i18n-smoke/report.json`);

if (failures > 0) {
  console.error(`\n❌ ${failures}/${ROUTES.length} routes failed`);
  process.exit(1);
}

console.log(`\n✅ All ${ROUTES.length} dashboard routes: English UI confirmed, no Thai text detected`);
