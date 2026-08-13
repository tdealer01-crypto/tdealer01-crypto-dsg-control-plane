#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const outputDir = path.resolve(
  process.env.DSG_QA_OUTPUT_DIR || 'artifacts/design-qa',
);

if (!executablePath) {
  throw new Error('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is required');
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

const page = await browser.newPage({
  viewport: { width: 1536, height: 1093 },
  deviceScaleFactor: 1,
});
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => {
  failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText || 'request failed',
  });
});

const interactions = [];

try {
  const response = await page.goto(
    baseUrl + '/dashboard/command-center',
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  interactions.push({
    name: 'command center route',
    result: response?.ok() ? 'passed' : 'failed',
    detail: 'HTTP ' + (response?.status() ?? 'unknown'),
  });

  await page.getByRole('heading', {
    name: 'Runtime control surface with Graphify context evidence.',
  }).waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector(
      'button[aria-label="Refresh current truth"]',
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.waitForFunction(
    () =>
      !document.body.innerText.includes('Checking…') &&
      !document.body.innerText.includes('Checking...'),
    undefined,
    { timeout: 30_000 },
  );
  interactions.push({
    name: 'primary buyer cockpit',
    result: 'passed',
    detail: 'hero and current-truth surface rendered',
  });

  await page.screenshot({
    path: path.join(outputDir, 'command-center-viewport.png'),
    fullPage: false,
  });

  const commandButton = page.getByRole('button', {
    name: 'Run governed plan',
  });
  interactions.push({
    name: 'empty command guard',
    result: (await commandButton.isDisabled()) ? 'passed' : 'failed',
    detail: 'run action is disabled until the user supplies a goal',
  });

  await page.getByLabel('Agent goal').fill(
    'Inspect the Revenue Autopilot blocker and explain the safest next action.',
  );
  interactions.push({
    name: 'typed goal',
    result: (await commandButton.isEnabled()) ? 'passed' : 'failed',
    detail: 'one typed goal enabled the governed plan action',
  });

  await commandButton.click();
  await page
    .getByText(
      'Sign in with an active operator workspace to run this governed plan.',
    )
    .waitFor();
  interactions.push({
    name: 'agent authorization boundary',
    result: 'passed',
    detail: 'unsigned operator is told exactly what is required',
  });

  const evidenceHref = await page
    .getByRole('link', { name: /View technical evidence/ })
    .getAttribute('href');
  interactions.push({
    name: 'technical evidence route',
    result: evidenceHref === '/evidence-pack' ? 'passed' : 'failed',
    detail: evidenceHref || 'missing href',
  });

  const refreshButton = page.getByRole('button', {
    name: 'Refresh current truth',
  });
  await refreshButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector(
      'button[aria-label="Refresh current truth"]',
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  interactions.push({
    name: 'truth refresh',
    result: 'passed',
    detail: 'refresh completed without a page exception',
  });

  await page.screenshot({
    path: path.join(outputDir, 'command-center-final.png'),
    fullPage: true,
  });

  const checkoutResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/billing/checkout') &&
      response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page
    .getByRole('button', { name: 'Start Pro verification — $99/month' })
    .click();
  const checkoutResponse = await checkoutResponsePromise;
  const checkoutStatus = checkoutResponse.status();
  let checkoutDetail = `checkout boundary returned HTTP ${checkoutStatus}`;
  let checkoutPassed = false;

  if (checkoutStatus === 401) {
    await page.waitForURL(
      /\/login\?next=%2Fdashboard%2Fcommand-center|\/login\?next=\/dashboard\/command-center/,
      { timeout: 20_000 },
    );
    checkoutPassed = true;
    checkoutDetail = 'unsigned buyer is routed to sign in before Stripe Checkout';
  } else if (checkoutStatus === 429) {
    await page.getByText('Too many requests').waitFor();
    checkoutPassed = true;
    checkoutDetail =
      'production checkout failed closed because distributed rate limiting is not configured locally';
  }

  interactions.push({
    name: 'Stripe checkout boundary',
    result: checkoutPassed ? 'passed' : 'failed',
    detail: checkoutDetail,
  });
} finally {
  await browser.close();
}

const report = {
  viewport: { width: 1536, height: 1093 },
  baseUrl,
  screenshot: path.join(outputDir, 'command-center-final.png'),
  interactions,
  consoleErrors,
  pageErrors,
  failedRequests,
};

await writeFile(
  path.join(outputDir, 'command-center-qa.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8',
);

console.log(JSON.stringify(report, null, 2));
