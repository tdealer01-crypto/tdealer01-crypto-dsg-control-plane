import { expect, test, type Route } from '@playwright/test';

type Approval = {
  id: string;
  vendor: string;
  amount: string;
  status: string;
  risk: string;
};

type OrgState = {
  approvals: Approval[];
  submittedCount: number;
};

function createOrgState(): OrgState {
  return {
    approvals: [
      { id: 'APR-1001', vendor: 'Northwind Supply', amount: 'US$14,250', status: 'Needs approver', risk: 'Threshold exceeded' },
      { id: 'APR-1002', vendor: 'Contoso Services', amount: 'US$2,480', status: 'Exception open', risk: 'Missing document' },
    ],
    submittedCount: 0,
  };
}

function getCounts(state: OrgState) {
  return {
    pendingApprovals: state.approvals.filter((item) => !['approved', 'rejected'].includes(item.status.toLowerCase())).length,
    openExceptions: state.approvals.filter((item) => item.status.toLowerCase().includes('exception')).length,
    readyExports: state.submittedCount,
  };
}

function normalizePathname(rawPathname: string) {
  return rawPathname.replace(/\/$/, '');
}

async function fulfillJson(route: Route, status: number, payload: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

test.describe('finance governance workflow e2e', () => {
  test('submit → approve flow updates state and summary', async ({ page }) => {
    const orgStore = new Map<string, OrgState>();

    await page.route('**/api/finance-governance/**', async (route) => {
      try {
        const request = route.request();
        const orgId = request.headers()['x-org-id'] ?? 'org-demo-live';
        const state = orgStore.get(orgId) ?? createOrgState();
        orgStore.set(orgId, state);

        const url = new URL(request.url());
        const pathname = normalizePathname(url.pathname);

        if (request.method() === 'GET' && pathname === '/api/finance-governance/workspace/summary') {
          await fulfillJson(route, 200, { workspace: { workspace: `Finance Governance (${orgId})`, counts: getCounts(state) } });
          return;
        }

        if (request.method() === 'GET' && pathname === '/api/finance-governance/approvals') {
          await fulfillJson(route, 200, { approvals: state.approvals });
          return;
        }

        if (request.method() === 'POST' && pathname === '/api/finance-governance/submit') {
          state.submittedCount += 1;
          await fulfillJson(route, 200, { ok: true, action: 'submit', message: 'Submitted for review', nextStatus: 'pending' });
          return;
        }

        const approveMatch = pathname.match(/\/api\/finance-governance\/approvals\/([^/]+)\/approve$/);
        if (request.method() === 'POST' && approveMatch) {
          const approvalId = approveMatch[1];
          state.approvals = state.approvals.map((item) => (item.id === approvalId ? { ...item, status: 'approved' } : item));
          await fulfillJson(route, 200, { ok: true, action: 'approve', message: 'Approval completed', nextStatus: 'approved' });
          return;
        }

        await fulfillJson(route, 404, { ok: false, error: 'not_found' });
      } catch (error) {
        await fulfillJson(route, 500, { ok: false, error: 'route_handler_failure', message: String(error) });
      }
    });

    await page.goto('/finance-governance/live/workflow');

    await expect(page.getByText('Pending approvals').locator('..').getByText('2')).toBeVisible();
    await page.getByRole('button', { name: 'Submit sample workflow item' }).click();
    await expect(page.getByText('Submitted for review. Next status: pending.')).toBeVisible();
    await expect(page.getByText('Ready exports').locator('..').getByText('1')).toBeVisible();

    const row = page.locator('tr', { hasText: 'APR-1001' });
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approval completed. Next status: approved.')).toBeVisible();
    await expect(row.getByText('approved')).toBeVisible();
    await expect(page.getByText('Pending approvals').locator('..').getByText('1')).toBeVisible();
  });

  test('org isolation keeps workflow state separate between org headers', async ({ browser }) => {
    const orgStore = new Map<string, OrgState>();

    const handler = async (route: Route) => {
      try {
        const request = route.request();
        const orgId = request.headers()['x-org-id'] ?? 'org-demo-live';
        const state = orgStore.get(orgId) ?? createOrgState();
        orgStore.set(orgId, state);
        const url = new URL(request.url());
        const pathname = normalizePathname(url.pathname);

        if (request.method() === 'GET' && pathname === '/api/finance-governance/workspace/summary') {
          await fulfillJson(route, 200, { workspace: { workspace: `Finance Governance (${orgId})`, counts: getCounts(state) } });
          return;
        }

        if (request.method() === 'GET' && pathname === '/api/finance-governance/approvals') {
          await fulfillJson(route, 200, { approvals: state.approvals });
          return;
        }

        if (request.method() === 'POST' && pathname === '/api/finance-governance/submit') {
          state.submittedCount += 1;
          await fulfillJson(route, 200, { ok: true, action: 'submit', message: 'Submitted for review', nextStatus: 'pending' });
          return;
        }

        await fulfillJson(route, 404, { ok: false, error: 'not_found' });
      } catch (error) {
        await fulfillJson(route, 500, { ok: false, error: 'route_handler_failure', message: String(error) });
      }
    };

    const orgA = await browser.newContext();
    const orgAPage = await orgA.newPage();
    await orgAPage.addInitScript(() => window.localStorage.setItem('finance-governance-demo-org-id', 'org-a'));
    await orgAPage.route('**/api/finance-governance/**', handler);
    await orgAPage.goto('/finance-governance/live/workflow');
    await orgAPage.getByRole('button', { name: 'Submit sample workflow item' }).click();
    await expect(orgAPage.getByText('Ready exports').locator('..').getByText('1')).toBeVisible();

    const orgB = await browser.newContext();
    const orgBPage = await orgB.newPage();
    await orgBPage.addInitScript(() => window.localStorage.setItem('finance-governance-demo-org-id', 'org-b'));
    await orgBPage.route('**/api/finance-governance/**', handler);
    await orgBPage.goto('/finance-governance/live/workflow');

    await expect(orgBPage.getByText('Ready exports').locator('..').getByText('0')).toBeVisible();
    await expect(orgBPage.getByText('Pending approvals').locator('..').getByText('2')).toBeVisible();

    await orgA.close();
    await orgB.close();
  });

  test('reload consistency retains persistent workflow state', async ({ page }) => {
    await page.route('**/api/finance-governance/**', async (route) => {
      try {
        const request = route.request();
        const url = new URL(request.url());
        const pathname = normalizePathname(url.pathname);
        if (request.method() === 'GET' && pathname === '/api/finance-governance/workspace/summary') {
          await fulfillJson(route, 200, {
            workspace: {
              workspace: 'Finance Governance Workspace',
              counts: { pendingApprovals: 2, openExceptions: 1, readyExports: 0 },
            },
          });
          return;
        }

        if (request.method() === 'GET' && pathname === '/api/finance-governance/approvals') {
          await fulfillJson(route, 200, {
            approvals: [
              { id: 'APR-1001', vendor: 'Northwind Supply', amount: 'US$14,250', status: 'Needs approver', risk: 'Threshold exceeded' },
              { id: 'APR-1002', vendor: 'Contoso Services', amount: 'US$2,480', status: 'Exception open', risk: 'Missing document' },
            ],
          });
          return;
        }

        if (request.method() === 'POST' && pathname === '/api/finance-governance/submit') {
          await fulfillJson(route, 200, { ok: true, action: 'submit', message: 'Submitted for review', nextStatus: 'pending' });
          return;
        }

        const approveMatch = pathname.match(/\/api\/finance-governance\/approvals\/([^/]+)\/approve$/);
        if (request.method() === 'POST' && approveMatch) {
          await fulfillJson(route, 200, { ok: true, action: 'approve', message: 'Approval completed', nextStatus: 'approved' });
          return;
        }

        await fulfillJson(route, 404, { ok: false, error: 'not_found' });
      } catch (error) {
        await fulfillJson(route, 500, { ok: false, error: 'route_handler_failure', message: String(error) });
      }
    });

    await page.goto('/finance-governance/live/workflow-persistent');

    await page.getByRole('button', { name: 'Submit sample workflow item' }).click();
    const row = page.locator('tr', { hasText: 'APR-1001' });
    await row.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('Ready exports').locator('..').getByText('1')).toBeVisible();
    await expect(row.getByText('approved')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Ready exports').locator('..').getByText('1')).toBeVisible();
    await expect(page.locator('tr', { hasText: 'APR-1001' }).getByText('approved')).toBeVisible();
  });
});
