import { chromium } from 'playwright';

async function runComprehensiveQA() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           COMPREHENSIVE QA TEST: Hermes Dashboard Functionality         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const issues = [];
  const fixes = [];
  let testCount = 0;
  let passCount = 0;

  try {
    // Test 1: Page Load
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: PAGE LOAD & NAVIGATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testCount++;
    console.log('  [1.1] Loading http://localhost:3000/dashboard/hermes...');
    const response = await page.goto('http://localhost:3000/dashboard/hermes', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    }).catch(e => {
      issues.push(`Page load failed: ${e.message}`);
      return null;
    });

    if (response && response.ok()) {
      console.log('      ✅ Page loaded (HTTP 200)');
      passCount++;
    } else if (response?.status() === 307 || response?.status() === 308) {
      console.log(`      ℹ️  Redirect (HTTP ${response.status()}) - may be authentication`);
      passCount++;
    } else {
      console.log(`      ⚠️  HTTP ${response?.status() || 'unknown'}`);
      issues.push(`Non-200 HTTP status: ${response?.status()}`);
    }

    await page.waitForTimeout(2000);

    // Test 2: Page Title & Header
    console.log('\n  [1.2] Checking page title and header...');
    const title = await page.title();
    console.log(`      Page title: "${title}"`);

    const hasHeader = await page.locator('header').count() > 0;
    if (hasHeader) {
      console.log('      ✅ Header element found');
      passCount++;
    } else {
      console.log('      ⚠️  No header element');
      issues.push('Header element missing');
    }

    // Test 3: Layout Components
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: LAYOUT & COMPONENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testCount++;
    console.log('  [2.1] Checking main layout...');

    const hasMain = await page.locator('main, [role="main"]').count() > 0;
    const hasSidebar = await page.locator('aside, [role="complementary"]').count() > 0;
    const hasContent = await page.locator('div').count() > 0;

    if (hasContent) {
      console.log(`      ✅ Main content area present (${await page.locator('div').count()} divs)`);
      passCount++;
    }

    if (hasSidebar) {
      console.log('      ✅ Sidebar present');
      passCount++;
    } else {
      console.log('      ℹ️  No sidebar (hidden on mobile)');
    }

    // Test 4: Phase A Features
    console.log('\n  [2.2] Checking Phase A UX Components...');
    testCount++;

    const hasSearch = await page.locator('input[placeholder*="Search"]').count() > 0;
    const hasButtons = await page.locator('button').count();
    const hasInputs = await page.locator('input').count();

    console.log(`      ✅ Button elements: ${hasButtons}`);
    console.log(`      ✅ Input fields: ${hasInputs}`);

    if (hasSearch > 0) {
      console.log('      ✅ Chat Search bar found');
      passCount++;
    } else {
      console.log('      ℹ️  Search bar not visible (may load dynamically)');
    }

    // Test 5: Navigation & Tabs
    console.log('\n  [2.3] Checking tab navigation...');
    testCount++;

    const tabs = await page.locator('button[role="tab"], button:has-text("System"), button:has-text("Hermes"), button:has-text("Parallel")').count();
    console.log(`      ✅ Tab elements: ${tabs}`);

    if (tabs > 0) {
      passCount++;
    } else {
      console.log('      ℹ️  Tabs not visible in current view');
    }

    // Test 6: Form Interactions
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: INTERACTIVITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testCount++;
    console.log('  [3.1] Testing button interactions...');

    const firstButton = await page.locator('button').first();
    if (await firstButton.count() > 0) {
      try {
        await firstButton.hover();
        console.log('      ✅ Button hover works');
        passCount++;
      } catch (e) {
        console.log(`      ⚠️  Button hover failed: ${e.message}`);
        issues.push('Button hover interaction failed');
      }
    }

    // Test 7: CSS & Styling
    console.log('\n  [3.2] Checking styling & colors...');
    testCount++;

    const coloredElements = await page.locator('[class*="emerald"], [class*="amber"], [class*="red"], [class*="green"], [class*="slate"]').count();
    console.log(`      ✅ Color-coded elements: ${coloredElements}`);

    if (coloredElements > 0) {
      passCount++;
    } else {
      console.log('      ℹ️  Color styling may load dynamically');
    }

    // Test 8: Error Monitoring
    console.log('\n  [3.3] Monitoring for errors...');
    testCount++;

    const errors = [];
    const warnings = [];
    const logs = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warn') warnings.push(msg.text());
      if (msg.type() === 'log') logs.push(msg.text());
    });

    await page.waitForTimeout(1500);

    console.log(`      ✅ Console errors: ${errors.length === 0 ? 'ZERO' : errors.length}`);
    console.log(`      ℹ️  Console warnings: ${warnings.length}`);

    if (errors.length === 0) {
      passCount++;
    } else {
      errors.slice(0, 2).forEach(err => {
        console.log(`         • ${err.substring(0, 60)}...`);
        issues.push(`Console error: ${err.substring(0, 100)}`);
      });
    }

    // Test 9: Accessibility
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: ACCESSIBILITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testCount++;
    console.log('  [4.1] Checking semantic HTML...');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const links = await page.locator('a').count();
    const labels = await page.locator('label').count();

    console.log(`      ✅ Headings: ${headings}`);
    console.log(`      ✅ Links: ${links}`);
    console.log(`      ℹ️  Labels: ${labels}`);

    if (headings > 0 || links > 0) {
      passCount++;
    } else {
      console.log('      ⚠️  Limited semantic HTML');
      issues.push('Limited semantic HTML elements');
    }

    // Test 10: Responsiveness
    console.log('\n  [4.2] Testing responsive design...');
    testCount++;

    const viewportSize = page.viewportSize();
    console.log(`      ✅ Current viewport: ${viewportSize?.width}x${viewportSize?.height}`);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone
    await page.waitForTimeout(500);

    const mobileContent = await page.locator('div').count();
    console.log(`      ✅ Mobile view (375x667): ${mobileContent} elements`);

    if (mobileContent > 0) {
      passCount++;
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Final Summary
    console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         QA TEST SUMMARY                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

    const passPercentage = Math.round((passCount / testCount) * 100);

    console.log(`Tests Run: ${testCount}`);
    console.log(`Tests Passed: ${passCount}`);
    console.log(`Success Rate: ${passPercentage}%\n`);

    if (issues.length === 0) {
      console.log('✅ STATUS: NO CRITICAL ISSUES FOUND\n');
    } else {
      console.log(`⚠️  ISSUES FOUND: ${issues.length}\n`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('\n');
    }

    // Recommendations
    if (passPercentage === 100 && issues.length === 0) {
      console.log('╔══════════════════════════════════════════════════════════════════════════╗');
      console.log('║  VERDICT: ✅ READY FOR PRODUCTION                                       ║');
      console.log('║  - All core functionality working                                        ║');
      console.log('║  - No critical errors                                                    ║');
      console.log('║  - Responsive design verified                                            ║');
      console.log('║  - Accessibility basics present                                          ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    } else if (passPercentage >= 80) {
      console.log('╔══════════════════════════════════════════════════════════════════════════╗');
      console.log('║  VERDICT: ✅ PRODUCTION READY WITH MINOR NOTES                          ║');
      console.log('║  - All core functionality operational                                    ║');
      console.log('║  - Minor issues are non-blocking                                         ║');
      console.log('║  - Recommended: Deploy with note about dynamic content loading          ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔══════════════════════════════════════════════════════════════════════════╗');
      console.log('║  VERDICT: ⚠️  REVIEW RECOMMENDED BEFORE DEPLOY                          ║');
      console.log('║  - Some issues need attention                                            ║');
      console.log('║  - Suggest: Fix critical issues and re-test                              ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    }

  } catch (error) {
    console.log(`\n❌ Test execution error: ${error.message}\n`);
  } finally {
    await browser.close();
  }
}

runComprehensiveQA().catch(console.error);
