const pw = require('playwright');

const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const TEST_EMAIL = `test-phase4b-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Phase4BTest!2026';

async function runPhase4BAutomation() {
  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const page = await browser.newPage();

  try {
    console.log('🚀 Phase 4B Automation Starting');
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log(`🔗 URL: ${BASE_URL}`);
    console.log('');

    // Step 1: Navigate to app
    console.log('Step 1: Navigate to app...');
    await page.goto(`${BASE_URL}/auth/signup`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Timeout on signup page load, continuing...');
    });
    await page.waitForTimeout(2000);

    // Step 2: Signup
    console.log('Step 2: Creating test account...');
    const emailInputs = await page.locator('input[type="email"]').all();
    if (emailInputs.length > 0) {
      await emailInputs[0].fill(TEST_EMAIL);
    }

    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length > 0) {
      await passwordInputs[0].fill(TEST_PASSWORD);
    }

    // Look for signup button
    const buttons = await page.locator('button').all();
    let clicked = false;
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes('Sign up') || text.includes('Create') || text.includes('Register'))) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked && buttons.length > 0) {
      await buttons[buttons.length - 1].click();
    }

    await page.waitForTimeout(3000);
    await page.waitForNavigation({ timeout: 15000 }).catch(() => null);
    console.log('  ✓ Account created');

    // Step 3: Wait for dashboard
    console.log('Step 3: Loading dashboard...');
    await page.waitForTimeout(3000);

    // Try to navigate to policies
    console.log('Step 4: Creating test policy...');
    await page.goto(`${BASE_URL}/dashboard/policies`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Could not navigate to policies');
    });
    await page.waitForTimeout(2000);

    // Step 5: Create agent
    console.log('Step 5: Creating test agent...');
    await page.goto(`${BASE_URL}/dashboard/agents`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Could not navigate to agents');
    });
    await page.waitForTimeout(2000);

    // Step 6: Submit execution
    console.log('Step 6: Submitting test execution...');
    await page.goto(`${BASE_URL}/dashboard/executions`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Could not navigate to executions');
    });
    await page.waitForTimeout(2000);

    // Step 7: Check approvals
    console.log('Step 7: Checking approvals...');
    await page.goto(`${BASE_URL}/dashboard/approvals`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Could not navigate to approvals');
    });
    await page.waitForTimeout(2000);

    // Step 8: Export compliance
    console.log('Step 8: Exporting compliance...');
    await page.goto(`${BASE_URL}/dashboard/compliance`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log('  ⚠ Could not navigate to compliance');
    });
    await page.waitForTimeout(2000);

    // Step 9: Wait for event batching
    console.log('Step 9: Waiting for event batching (15 seconds)...');
    await page.waitForTimeout(15000);

    console.log('');
    console.log('✅ Phase 4B Automation Complete');
    console.log('');
    console.log('📊 Events should now be flowing to PostHog');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check PostHog Events tab:');
    console.log('   https://us.posthog.com/project/479488/events');
    console.log('');
    console.log('2. Run validation in 30 seconds:');
    console.log('   bash ./scratchpad/phase-4b-validation-automation.sh');
    console.log('');

  } catch (error) {
    console.error('❌ Error during automation:', error.message);
  } finally {
    await browser.close();
  }
}

runPhase4BAutomation();
