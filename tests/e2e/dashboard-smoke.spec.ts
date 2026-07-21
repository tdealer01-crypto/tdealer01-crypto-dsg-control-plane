import { test, expect } from '@playwright/test';

/**
 * Dashboard route smoke test.
 *
 * Opens every page under app/dashboard/ and asserts the route actually renders:
 * - HTTP status is not 503 (auth-not-configured fail-close) and not a 5xx
 * - the page body has visible content
 * - no uncaught page error (crash) occurred
 * - the Supabase missing-env error page is not shown
 *
 * Relies on the middleware localhost bypass plus the dashboard/hermes layout
 * signed-out fallback, so no Supabase env vars are required. Client pages may
 * still log console errors from failed data fetches when no backend env is
 * configured; those are reported but do not fail the smoke check.
 *
 * Keep this list in sync with `find app/dashboard -name page.tsx`.
 */

const STATIC_DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/agents',
  '/dashboard/agents/connect',
  '/dashboard/agi',
  '/dashboard/api-keys',
  '/dashboard/approvals',
  '/dashboard/audit',
  '/dashboard/audit-trail',
  '/dashboard/audit/matrix',
  '/dashboard/billing',
  '/dashboard/breach-signal',
  '/dashboard/capacity',
  '/dashboard/command-center',
  '/dashboard/core-compat',
  '/dashboard/dsg-brain',
  '/dashboard/executions',
  '/dashboard/governance',
  '/dashboard/governance/controls',
  '/dashboard/governance/evidence',
  '/dashboard/governance/incidents',
  '/dashboard/hermes',
  '/dashboard/hermes/agents',
  '/dashboard/hermes/skills',
  '/dashboard/integration',
  '/dashboard/integrations',
  '/dashboard/integrations/webhooks',
  '/dashboard/ledger',
  '/dashboard/live-control',
  '/dashboard/markdoc-policies',
  '/dashboard/markdoc-policies/new',
  '/dashboard/mission',
  '/dashboard/monitoring',
  '/dashboard/notifications',
  '/dashboard/omniaagent-command-center',
  '/dashboard/operations',
  '/dashboard/payout-safety',
  '/dashboard/policies',
  '/dashboard/proofs',
  '/dashboard/readiness-config',
  '/dashboard/referrals',
  '/dashboard/revenue',
  '/dashboard/settings/access',
  '/dashboard/settings/configuration',
  '/dashboard/settings/defi',
  '/dashboard/settings/domains',
  '/dashboard/settings/go-live',
  '/dashboard/settings/security',
  '/dashboard/setup',
  '/dashboard/setup/audit',
  '/dashboard/setup/executions',
  '/dashboard/setup/test-results',
  '/dashboard/skills',
  '/dashboard/stripe-app',
  '/dashboard/stripe-app/approvals',
  '/dashboard/stripe-app/audit',
  '/dashboard/stripe-app/connect',
  '/dashboard/stripe-app/policies',
  '/dashboard/support/faq',
  '/dashboard/support/tickets',
  '/dashboard/support/tickets/create',
  '/dashboard/tasks',
  '/dashboard/team',
  '/dashboard/trinity',
  '/dashboard/usage',
  '/dashboard/verification',
  '/dashboard/webhooks',
  '/dashboard/welcome',
  '/dashboard/work-queue',
];

// Dynamic-segment routes visited with a placeholder id. The page must still
// render its shell (empty/error state is fine); only a server crash fails.
const DYNAMIC_DASHBOARD_ROUTES = [
  '/dashboard/agents/e2e-placeholder/permissions',
  '/dashboard/governance/question/e2e-placeholder',
  '/dashboard/markdoc-policies/e2e-placeholder',
  '/dashboard/replay/e2e-placeholder',
  '/dashboard/support/tickets/e2e-placeholder',
];

async function smokeCheck(page: import('@playwright/test').Page, route: string) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

  expect(response, `${route}: no response`).not.toBeNull();
  const status = response!.status();
  expect(status, `${route}: fail-closed 503 (auth not configured)`).not.toBe(503);
  expect(status, `${route}: server error ${status}`).toBeLessThan(500);

  await expect(page.locator('body')).toBeVisible();
  await expect(
    page.locator('text=Missing Supabase public environment variables'),
  ).toHaveCount(0);

  expect(pageErrors, `${route}: uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);

  if (consoleErrors.length > 0) {
    // Data fetches may fail without backend env — surface but do not fail.
    console.warn(`[smoke] ${route}: ${consoleErrors.length} console error(s):`);
    for (const err of consoleErrors.slice(0, 5)) console.warn(`  - ${err.slice(0, 200)}`);
  }
}

test.describe('Dashboard route smoke', () => {
  for (const route of STATIC_DASHBOARD_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      await smokeCheck(page, route);
    });
  }
});

test.describe('Dashboard dynamic route smoke (placeholder ids)', () => {
  for (const route of DYNAMIC_DASHBOARD_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      await smokeCheck(page, route);
    });
  }
});
