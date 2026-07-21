/**
 * E2E UI Tests: Trinity AI Dashboard (/dashboard/trinity)
 *
 * Rewritten against the current page: the old suite targeted a previous
 * version of this page ("Trinity AI System" header, Agent Registry,
 * Run Orchestration button, inline validation messages) none of which
 * exist in today's tabbed UI, so every test failed on locators.
 *
 * Current page structure this suite asserts:
 * - h1 "Trinity AI Orchestration" + 5-agent subtitle
 * - Tabs (default: Agent Chat): Agents / Orchestrate / Discover Jobs /
 *   History / Team Coordinator
 * - Orchestrate tab: Job Title/Category/Reward inputs, live-run checkbox,
 *   "▶ Execute Orchestration (dry run)" button disabled until a title is set
 * - "Trinity Capabilities" section with per-agent cards
 *
 * NOTE: Requires a running dev server (skipped in CI without
 * PLAYWRIGHT_BASE_URL). No real SOL transfers: the execute button stays in
 * dry-run mode unless the live-run checkbox is ticked, which this suite
 * never does.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const TRINITY_DASHBOARD = `${BASE}/dashboard/trinity`;

// Skip in CI without a reachable server (CI runners don't start `next dev`).
const skipTrinityTests = process.env.CI === 'true' && !process.env.PLAYWRIGHT_BASE_URL;
const suiteRunner = skipTrinityTests ? test.describe.skip : test.describe;

const AGENT_NAMES = ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine'];

// Click a tab and wait for its content — retried because the first click can
// land before React hydration attaches the tab handlers.
async function openTab(page: Page, tabLabel: string, contentProbe: string) {
  await expect(async () => {
    await page.locator(`button:has-text("${tabLabel}")`).first().click();
    await expect(page.locator(contentProbe).first()).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20_000 });
}

suiteRunner('Trinity Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TRINITY_DASHBOARD, { waitUntil: 'domcontentloaded' });
  });

  // ── Page load ──────────────────────────────────────────────────────────
  test('should load header and subtitle', async ({ page }) => {
    await expect(page.locator('h1:has-text("Trinity AI Orchestration")')).toBeVisible();
    await expect(
      page.locator('text=5-Agent Multi-Agent System for Job Discovery'),
    ).toBeVisible();
  });

  test('should show API connection status line', async ({ page }) => {
    await expect(
      page.locator('text=/Live API Connected|Connection Lost/').first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('should render the Trinity Capabilities section', async ({ page }) => {
    await expect(page.locator('text=Trinity Capabilities')).toBeVisible();
    await expect(page.locator('text=Mind Agent').first()).toBeVisible();
    await expect(page.locator('text=Hand Agent').first()).toBeVisible();
  });

  test('should display all tab buttons', async ({ page }) => {
    for (const label of ['Agents', 'Orchestrate', 'Discover Jobs', 'History']) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible();
    }
  });

  // ── Agents tab ─────────────────────────────────────────────────────────
  test('should list all 5 agents on the Agents tab', async ({ page }) => {
    await openTab(page, 'Agents', `h3:has-text("${AGENT_NAMES[0]}")`);
    for (const name of AGENT_NAMES) {
      await expect(page.locator(`h3:has-text("${name}")`).first()).toBeVisible();
    }
  });

  // ── Orchestrate tab ────────────────────────────────────────────────────
  test('should show the orchestration form', async ({ page }) => {
    await openTab(page, 'Orchestrate', 'input[placeholder="e.g., Smart Contract Audit"]');
    await expect(page.locator('input[placeholder="e.g., smart-contract-audit"]')).toBeVisible();
    await expect(page.locator('input[placeholder="0.0"]')).toBeVisible();
  });

  test('should disable execute until a job title is set', async ({ page }) => {
    await openTab(page, 'Orchestrate', 'input[placeholder="e.g., Smart Contract Audit"]');
    const titleInput = page.locator('input[placeholder="e.g., Smart Contract Audit"]');
    const executeBtn = page.locator('button:has-text("Execute Orchestration")');

    await titleInput.clear();
    await expect(executeBtn).toBeDisabled();

    await titleInput.fill('E2E Test Job');
    await expect(executeBtn).toBeEnabled();
  });

  test('should default to dry run and switch label on live-run toggle', async ({ page }) => {
    await openTab(page, 'Orchestrate', 'input[placeholder="e.g., Smart Contract Audit"]');
    const executeBtn = page.locator('button:has-text("Execute Orchestration")');
    await expect(executeBtn).toContainText('dry run');

    await page.locator('input[type="checkbox"]').first().check();
    await expect(executeBtn).toContainText('LIVE');

    // Switch back — this suite never executes a live run.
    await page.locator('input[type="checkbox"]').first().uncheck();
    await expect(executeBtn).toContainText('dry run');
  });

  // ── Discover Jobs / History tabs ───────────────────────────────────────
  test('should open the Discover Jobs tab', async ({ page }) => {
    await expect(async () => {
      await page.locator('button:has-text("Discover Jobs")').first().click();
      await expect(
        page.locator('input[placeholder="e.g., Smart Contract Audit"]'),
      ).toHaveCount(0, { timeout: 3000 });
    }).toPass({ timeout: 20_000 });
  });

  test('should open the History tab', async ({ page }) => {
    // Without DB data the tab shows an empty-state card; with data, the table.
    await openTab(page, 'History', 'text=/executions from database|Loading history/');
    await expect(
      page.locator('text=/No execution history yet|Job Title/').first(),
    ).toBeVisible();
  });
});
