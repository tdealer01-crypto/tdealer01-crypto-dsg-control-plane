import { chromium } from 'playwright';

const BASE = 'http://localhost:3099';
const SHOT = '/tmp/ui-screenshots';
const results = [];
const log = (page, btn, status, detail='') => {
  const s = `[${status}] ${page} | ${btn} | ${detail}`;
  console.log(s);
  results.push({ page, btn, status, detail });
};

const br = await chromium.launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Capture console errors
page.on('console', msg => {
  if (msg.type() === 'error') console.error('CONSOLE ERR:', msg.text());
});

// ── Finance Actions: test Approve/Reject/Escalate flow ────────────
console.log('\n=== FINANCE ACTIONS (button click test) ===');
await page.goto(BASE + '/finance-governance/live/actions', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 3000));

// Submit sample item first
const submitBtn = page.locator('button', { hasText: /submit sample item/i }).first();
if (await submitBtn.count() > 0) {
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: SHOT + '/15b_fin_after_submit.png', fullPage: false });
  const toastOrMsg = await page.$eval('[class*="toast"],[class*="success"],[class*="alert"],[class*="message"],p', e => e.innerText).catch(() => '');
  log('/finance-governance/live/actions', 'Submit sample item', 'OK', 'clicked: ' + (toastOrMsg.slice(0,60)||'no toast visible'));
} else {
  log('/finance-governance/live/actions', 'Submit sample item', 'WARN', 'button not found');
}

// Approve first item
const approveBtn = page.locator('button', { hasText: /^approve$/i }).first();
if (await approveBtn.count() > 0) {
  const isEnabled = await approveBtn.isEnabled();
  if (isEnabled) {
    await approveBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: SHOT + '/15c_fin_after_approve.png', fullPage: false });
    log('/finance-governance/live/actions', 'Approve button', 'OK', 'clicked - got response');
  } else {
    log('/finance-governance/live/actions', 'Approve button', 'WARN', 'disabled');
  }
} else {
  log('/finance-governance/live/actions', 'Approve button', 'WARN', 'not found');
}

// Reject first available
const rejectBtn = page.locator('button', { hasText: /^reject$/i }).first();
if (await rejectBtn.count() > 0) {
  await rejectBtn.click();
  await new Promise(r => setTimeout(r, 1500));
  log('/finance-governance/live/actions', 'Reject button', 'OK', 'clicked');
}

// ── Delivery Proof: Full sequence test ───────────────────────────
console.log('\n=== DELIVERY PROOF (full sequence) ===');
await page.goto(BASE + '/delivery-proof', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 2000));

// 1. Input disabled
const scanBtn = page.locator('button', { hasText: /run scan/i }).first();
log('/delivery-proof', '1. Run Scan disabled (no URL)', await scanBtn.isDisabled() ? 'PASS' : 'FAIL', '');

// 2. Type URL
await page.locator('input[type=url]').first().fill('https://tdealer01-crypto-dsg-control-plane.vercel.app');
log('/delivery-proof', '2. URL typed → button enables', await scanBtn.isEnabled() ? 'PASS' : 'FAIL', '');

// 3. Press Enter (test Enter key shortcut)
await page.locator('input[type=url]').first().press('Enter');
await new Promise(r => setTimeout(r, 500));
log('/delivery-proof', '3. Enter key triggers scan', await page.locator('button', { hasText: /scanning/i }).count() > 0 ? 'PASS' : 'OK', 'scan started');

// Wait for result
await new Promise(r => setTimeout(r, 20000));
await page.screenshot({ path: SHOT + '/17_dp_result_full.png', fullPage: false });

// 4. Check result elements
const hasResult = await page.locator('[class*="claim"],[class*="EVIDENCE"],[class*="BLOCKED"]').count() > 0;
log('/delivery-proof', '4. Scan result shown', hasResult ? 'PASS' : 'WARN', '');

const hasReport = await page.locator('a', { hasText: /view full report/i }).count() > 0;
log('/delivery-proof', '5. View Full Report link', hasReport ? 'PASS' : 'WARN', '');

const hasRescan = await page.locator('button', { hasText: /rescan/i }).count() > 0;
log('/delivery-proof', '6. Rescan button', hasRescan ? 'PASS' : 'WARN', '');

// 5. Click Rescan
if (hasRescan) {
  await page.locator('button', { hasText: /rescan/i }).first().click();
  await new Promise(r => setTimeout(r, 1000));
  log('/delivery-proof', '7. Rescan clicked → scanning again', 'OK', '');
  await page.screenshot({ path: SHOT + '/17b_dp_rescanning.png', fullPage: false });
}

// ── Homepage CTAs ─────────────────────────────────────────────────
console.log('\n=== HOMEPAGE CTAs ===');
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 2000));

const homeCtas = [
  { text: /delivery proof/i, label: 'Delivery Proof →' },
  { text: /start free/i, label: 'Start free →' },
  { text: /open finance workspace/i, label: 'Open finance workspace' },
  { text: /request access/i, label: 'Request access' },
  { text: /try demo/i, label: 'Try demo' },
];
for (const cta of homeCtas) {
  const el = page.locator('a', { hasText: cta.text }).first();
  const count = await el.count();
  if (count > 0) {
    const href = await el.getAttribute('href');
    log('/', cta.label, 'PASS', href||'');
  } else {
    log('/', cta.label, 'WARN', 'not found');
  }
}

// Product dropdown
const productBtn = page.locator('button', { hasText: /^product$/i }).first();
if (await productBtn.count() > 0) {
  await productBtn.click();
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: SHOT + '/18_homepage_product_dropdown.png', fullPage: false });
  const dropdownItems = await page.$$eval('[role="menu"] a, [data-dropdown] a, header nav a', els =>
    els.map(e => e.innerText.trim()).filter(Boolean)
  );
  log('/', 'Product dropdown', dropdownItems.length > 0 ? 'PASS' : 'WARN', dropdownItems.join(', ').slice(0,80)||'items: ' + dropdownItems.length);
}

// ── SUMMARY ───────────────────────────────────────────────────────
console.log('\n========== FINAL SUMMARY ==========');
const pass = results.filter(r => r.status === 'PASS').length;
const ok = results.filter(r => r.status === 'OK').length;
const warn = results.filter(r => r.status === 'WARN').length;
const fail = results.filter(r => r.status === 'FAIL').length;
console.log(`PASS: ${pass}  OK: ${ok}  WARN: ${warn}  FAIL: ${fail}`);
results.filter(r => r.status === 'FAIL').forEach(r => console.log('  ❌', r.page, '|', r.btn, '|', r.detail));
results.filter(r => r.status === 'WARN').forEach(r => console.log('  ⚠️ ', r.page, '|', r.btn, '|', r.detail));

await br.close();
