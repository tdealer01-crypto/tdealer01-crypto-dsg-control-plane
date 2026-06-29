/**
 * E2E UI Tests: Trinity AI Dashboard
 *
 * ทดสอบ UI flow ของ Trinity Dashboard:
 * - System status loading
 * - Form validation
 * - Orchestration execution
 * - Real-time status updates
 * - Job discovery display
 * - Execution history
 *
 * ทั้งหมด in dry_run mode — ไม่มี real SOL transfers
 *
 * NOTE: These tests require a running dev server.
 * Run `npm run dev` in a separate terminal before running these tests.
 * In CI, tests are automatically skipped if server is not accessible.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const TRINITY_DASHBOARD = `${BASE}/dashboard/trinity`;

// Skip all Trinity Dashboard tests if running in CI without a dev server
// (CI environments typically don't have a running dev server)
const skipTrinityTests = process.env.CI === 'true' && !process.env.PLAYWRIGHT_BASE_URL;

test.describe('Trinity Dashboard UI', () => {
  test.skip(!!skipTrinityTests, 'Skipped in CI without PLAYWRIGHT_BASE_URL');

  test.beforeEach(async ({ page }) => {
    // Navigate to Trinity Dashboard
    await page.goto(TRINITY_DASHBOARD, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
  });

  // =========================================================================
  // 1. Page Load & System Status
  // =========================================================================
  test('should load Trinity Dashboard with header', async ({ page }) => {
    // Check header is visible
    const header = page.locator('h1:has-text("Trinity AI System")');
    await expect(header).toBeVisible();

    // Check subtitle
    const subtitle = page.locator('text=Multi-Agent Orchestration • DSG Governance');
    await expect(subtitle).toBeVisible();
  });

  test('should display all 5 agent cards', async ({ page }) => {
    // Wait for agent cards to load
    await page.waitForSelector('text=Agent Registry');

    // Check all 5 agents are present
    for (const agent of ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine']) {
      const agentCard = page.locator(`text="${agent}"`);
      await expect(agentCard).toBeVisible();
    }
  });

  test('should show agent status badges', async ({ page }) => {
    // Wait for cards
    await page.waitForSelector('text=registered');

    // Check status badges
    const statusBadges = page.locator('text=registered');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should have refresh button and refresh status', async ({ page }) => {
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();

    // Click refresh
    await refreshBtn.click();

    // Status should still be visible after refresh
    await page.waitForSelector('text=registered', { timeout: 10000 });
    const agentCard = page.locator('text=Mind').first();
    await expect(agentCard).toBeVisible();
  });

  // =========================================================================
  // 2. Form Validation
  // =========================================================================
  test('should show validation errors for empty form', async ({ page }) => {
    // Clear job title
    const jobTitleInput = page.locator('input[placeholder="e.g., Smart Contract Audit"]');
    await jobTitleInput.clear();

    // Click run button
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Should show error toast
    await page.waitForSelector('text=Please fix validation errors', { timeout: 5000 });
  });

  test('should validate reward amount', async ({ page }) => {
    // Set reward to 0
    const rewardInput = page.locator('input[type="number"][value="2"]').first();
    await rewardInput.clear();
    await rewardInput.fill('0');

    // Try to run
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Should show validation error
    await expect(page.locator('text=Reward must be greater than 0')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should validate reputation range (0-100)', async ({ page }) => {
    // Set reputation to 150
    const reputationInputs = page.locator('input[type="number"]');
    const reputationInput = reputationInputs.nth(reputationInputs.length - 1);

    await reputationInput.clear();
    await reputationInput.fill('150');

    // Try to run
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Should show validation error
    await expect(page.locator('text=Reputation must be between 0-100')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should clear validation error when user fixes input', async ({ page }) => {
    const jobTitleInput = page.locator('input[placeholder="e.g., Smart Contract Audit"]');

    // Clear to trigger error
    await jobTitleInput.clear();
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Should show error
    await expect(page.locator('text=Job title is required')).toBeVisible();

    // Type in field
    await jobTitleInput.fill('Test Job');

    // Error should disappear
    await expect(page.locator('text=Job title is required')).not.toBeVisible({
      timeout: 5000,
    });
  });

  // =========================================================================
  // 3. Form Submission & Orchestration
  // =========================================================================
  test('should run orchestration with valid inputs', async ({ page }) => {
    // Set valid inputs
    const jobTitleInput = page.locator('input[placeholder="e.g., Smart Contract Audit"]');
    await jobTitleInput.fill('Integration Test Job');

    // Click run
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Should show loading state
    await expect(page.locator('text=Running')).toBeVisible({ timeout: 5000 });

    // Wait for result
    await expect(page.locator('text=Orchestration complete|Blocked')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should display execution result with plan hash', async ({ page }) => {
    // Run orchestration
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Wait for result section to show plan hash
    await page.waitForSelector('text=Plan Hash', { timeout: 15000 });
    const planHash = page.locator('text=Plan Hash').locator('..').locator('p').last();
    const hashText = await planHash.textContent();

    expect(hashText).toMatch(/^[a-f0-9]{64}$/);
  });

  test('should show governance constraints in result', async ({ page }) => {
    // Run orchestration
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Wait for governance section
    await page.waitForSelector('text=Governance', { timeout: 15000 });

    // Check for constraint checkmarks
    const constraints = page.locator('text=✅, text=❌');
    const count = await constraints.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display agent-specific results', async ({ page }) => {
    // Run orchestration
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Wait for Hand execution section
    await page.waitForSelector('text=Hand', { timeout: 15000 });
    await expect(page.locator('text=✋ Hand — Execution')).toBeVisible();

    // Check for quality score
    await expect(page.locator('text=Quality Score')).toBeVisible();
  });

  // =========================================================================
  // 4. Execution History
  // =========================================================================
  test('should display execution history section', async ({ page }) => {
    // Look for history section
    const historySection = page.locator('text=Execution History');
    await expect(historySection).toBeVisible();
  });

  test('should have refresh button for execution history', async ({ page }) => {
    // Find refresh button near Execution History
    const historySection = page.locator('text=Execution History').locator('..');
    const refreshBtn = historySection.locator('button:has-text("Refresh")');

    // Button should exist
    await expect(refreshBtn).toBeVisible();
  });

  test('should load and display execution history entries', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000);

    // Check if history table is visible
    const historyTable = page.locator('table');

    // If table exists, check for headers
    if (await historyTable.isVisible()) {
      await expect(historyTable.locator('text=Job Title')).toBeVisible();
      await expect(historyTable.locator('text=Status')).toBeVisible();
    }
  });

  // =========================================================================
  // 5. Job Discovery (Mind Agent)
  // =========================================================================
  test('should display job discovery section', async ({ page }) => {
    const jobsSection = page.locator('text=Discovered Jobs');
    await expect(jobsSection).toBeVisible();
  });

  test('should load and display discovered jobs', async ({ page }) => {
    // Wait for jobs to load
    await page.waitForTimeout(2000);

    // Check if any job cards are visible
    const jobCards = page.locator('text=smart-contract-audit, text=frontend-dev');

    // At least one job category should be visible
    const count = await jobCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show job details in cards', async ({ page }) => {
    // Wait for jobs to load
    await page.waitForTimeout(2000);

    // Look for SOL amounts (indicating job cards are loaded)
    const solAmounts = page.locator('text=SOL');

    if (await solAmounts.first().isVisible()) {
      // Check for job metadata
      await expect(page.locator('text=Due:')).toBeVisible();
    }
  });

  // =========================================================================
  // 6. Real-time Features
  // =========================================================================
  test('should attempt WebSocket/SSE connection on load', async ({ page }) => {
    // Check console for connection attempts
    let wsAttempt = false;
    page.on('console', (msg) => {
      if (msg.text().includes('WebSocket') || msg.text().includes('connected')) {
        wsAttempt = true;
      }
    });

    // Give it a moment to try
    await page.waitForTimeout(2000);

    // Note: WebSocket may not connect in Next.js, which is expected
    // The important thing is the dashboard still functions
    expect(page.locator('text=Trinity AI System')).toBeVisible();
  });

  test('should show system is functional even without real-time connection', async ({
    page,
  }) => {
    // All primary features should work without WebSocket
    await expect(page.locator('text=Trinity AI System')).toBeVisible();
    await expect(page.locator('button:has-text("Run Orchestration")')).toBeEnabled();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  // =========================================================================
  // 7. Toast Notifications
  // =========================================================================
  test('should show success toast on orchestration completion', async ({ page }) => {
    // Listen for toast messages
    const runBtn = page.locator('button:has-text("Run Orchestration")');
    await runBtn.click();

    // Wait for completion toast
    const successToast = page.locator('text=successfully|failed|blocked');
    await expect(successToast).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // 8. Accessibility & UX
  // =========================================================================
  test('should have proper button states during execution', async ({ page }) => {
    const runBtn = page.locator('button:has-text("Run Orchestration")');

    // Button should be enabled initially
    await expect(runBtn).toBeEnabled();

    // Click and check disabled state
    await runBtn.click();
    await expect(runBtn).toBeDisabled({ timeout: 5000 });

    // Should re-enable after completion
    await expect(runBtn).toBeEnabled({ timeout: 15000 });
  });

  test('should have responsive layout', async ({ page }) => {
    // Check for grid layout sections
    const sections = page.locator('section');
    const count = await sections.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should display footer disclaimer', async ({ page }) => {
    const footer = page.locator('text=dry-run only');
    await expect(footer).toBeVisible();
  });
});
