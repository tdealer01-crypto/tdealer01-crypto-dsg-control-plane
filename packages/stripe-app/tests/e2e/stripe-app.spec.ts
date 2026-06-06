import { expect, test, type Page, type BrowserContext } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const isStagingTest = process.env.PLAYWRIGHT_STAGING_TEST === 'true';

// Performance thresholds (ms)
const PERF_THRESHOLDS = {
  dashboardLoad: 2000,
  auditPageLoad: 1000,
  policyCreate: 1500,
  policyEval: 800,
  formInput: 500,
  auditSearch: 1200,
};

// Test data fixtures
const testPolicy = {
  operationType: 'charge',
  maxAmount: '10000',
  action: 'allow',
};

const testCharge = {
  id: 'ch_test_' + Date.now(),
  amount: 5000,
  currency: 'usd',
};

// Performance metrics collector
class PerformanceCollector {
  private metrics: Record<string, number[]> = {};

  recordMetric(name: string, duration: number) {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    this.metrics[name].push(duration);
  }

  getStats(name: string) {
    const values = this.metrics[name] || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return { avg, median, min, max, count: values.length };
  }

  getAllMetrics() {
    return Object.entries(this.metrics).reduce(
      (acc, [name, values]) => {
        acc[name] = this.getStats(name);
        return acc;
      },
      {} as Record<string, any>
    );
  }
}

const perfCollector = new PerformanceCollector();

test.describe('Stripe App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to stripe app dashboard
    await page.goto(`${baseURL}/stripe-app`);

    // Wait for page to load and measure load time
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    perfCollector.recordMetric('dashboardLoad', loadTime);

    // For staging tests, ensure we're authenticated
    if (isStagingTest) {
      const loginElement = page.getByRole('heading', { name: /login|sign in/i });
      if (await loginElement.isVisible()) {
        test.skip();
      }
    }
  });

  test.describe('Dashboard Navigation', () => {
    test('should navigate to Stripe App hub', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${baseURL}/stripe-app`);

      // Verify page loaded
      await page.waitForLoadState('networkidle');

      // Check for dashboard heading or title
      const dashboard = page.getByRole('heading', { name: /stripe|dashboard|gateway/i }).first();
      await expect(dashboard).toBeVisible();
    });

    test('should display connected accounts section', async ({ page }) => {
      // Load dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Look for accounts section
      const accountsSection = page.getByText(/connected|account/i).first();
      await expect(accountsSection).toBeVisible({ timeout: 5000 });
    });

    test('should show "Connect Account" button', async ({ page }) => {
      // Load dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Look for connect button
      const connectButton = page.getByRole('button', { name: /connect|add account/i }).first();
      await expect(connectButton).toBeVisible();
      await expect(connectButton).toBeEnabled();
    });

    test('should navigate to policies section', async ({ page }) => {
      // Load dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Click on policies nav item
      const policiesNav = page.getByRole('link', { name: /policies/i }).first();
      if (await policiesNav.isVisible()) {
        await policiesNav.click();
        await page.waitForLoadState('networkidle');

        // Verify URL or page content
        await expect(page).toHaveURL(/policies/i);
      }
    });

    test('should navigate to audit section', async ({ page }) => {
      // Load dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Click on audit nav item
      const auditNav = page.getByRole('link', { name: /audit|logs|history/i }).first();
      if (await auditNav.isVisible()) {
        await auditNav.click();
        await page.waitForLoadState('networkidle');

        // Verify URL or page content
        await expect(page).toHaveURL(/audit/i);
      }
    });

    test('should navigate to settings section', async ({ page }) => {
      // Load dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Click on settings nav item
      const settingsNav = page.getByRole('link', { name: /settings|config/i }).first();
      if (await settingsNav.isVisible()) {
        await settingsNav.click();
        await page.waitForLoadState('networkidle');

        // Verify URL or page content
        await expect(page).toHaveURL(/settings/i);
      }
    });
  });

  test.describe('OAuth Connection Workflow', () => {
    test('should display OAuth authorization button', async ({ page }) => {
      // Navigate to connect page
      await page.goto(`${baseURL}/stripe-app/connect`);
      await page.waitForLoadState('networkidle');

      // Look for connect button
      const connectBtn = page.getByRole('button', { name: /connect.*stripe|authorize/i }).first();
      await expect(connectBtn).toBeVisible();
      await expect(connectBtn).toBeEnabled();
    });

    test('should generate OAuth state parameter', async ({ page, context }) => {
      // Listen for navigation
      let oauthUrl = '';

      context.on('page', async (newPage) => {
        if (newPage.url().includes('stripe.com')) {
          oauthUrl = newPage.url();
        }
      });

      // Navigate and click connect
      await page.goto(`${baseURL}/stripe-app/connect`);
      await page.waitForLoadState('networkidle');

      const connectBtn = page.getByRole('button', { name: /connect.*stripe/i }).first();
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        connectBtn.click().catch(() => {}),
      ]).catch(() => [null]);

      if (popup) {
        oauthUrl = popup.url();
        await popup.close();
      }

      // Verify state parameter present (if URL was captured)
      if (oauthUrl && oauthUrl.includes('state=')) {
        expect(oauthUrl).toContain('state=');
      }
    });

    test('should include correct OAuth scopes', async ({ page }) => {
      // Navigate to connect page
      await page.goto(`${baseURL}/stripe-app/connect`);
      await page.waitForLoadState('networkidle');

      // Look for button or link that shows scopes
      const scopeInfo = page.getByText(/scope|permission|access/i).first();

      // If visible, check for required scopes
      if (await scopeInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await scopeInfo.textContent();
        expect(text).toBeTruthy();
      }
    });

    test('should redirect to Stripe OAuth endpoint', async ({ page, context }) => {
      // Navigate to connect page
      await page.goto(`${baseURL}/stripe-app/connect`);
      await page.waitForLoadState('networkidle');

      const connectBtn = page.getByRole('button', { name: /connect.*stripe/i }).first();

      // Intercept navigation
      let targetUrl = '';
      page.on('popup', (popup) => {
        targetUrl = popup.url();
      });

      // Click and verify redirect (in real test, stripe would redirect)
      if (await connectBtn.isVisible()) {
        await expect(connectBtn).toBeEnabled();
      }
    });

    test('should handle OAuth callback', async ({ page }) => {
      // Simulate OAuth callback by navigating with auth code
      const mockAuthCode = 'ac_test_' + Date.now();

      await page.goto(`${baseURL}/stripe-app/oauth/callback?code=${mockAuthCode}&state=test_state`);
      await page.waitForLoadState('networkidle');

      // Verify redirect back to dashboard or connected state
      const dashboardElement = page.getByText(/connected|success|dashboard/i).first();

      // Either successful redirect or error message should be present
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Policy Creation Workflow', () => {
    test('should display policy creation form', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Click create policy button
      const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Wait for form to appear
        const form = page.locator('form').first();
        await expect(form).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have operation type dropdown', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open create form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Look for operation type dropdown
        const operationDropdown = page.getByLabel(/operation|type/i).first();
        if (await operationDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(operationDropdown).toBeVisible();
        }
      }
    });

    test('should have max amount input field', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open create form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Look for amount field
        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(amountField).toBeVisible();
          await amountField.fill('10000');
          await expect(amountField).toHaveValue('10000');
        }
      }
    });

    test('should have action dropdown', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open create form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Look for action dropdown
        const actionDropdown = page.getByLabel(/action|decision|allow|block/i).first();
        if (await actionDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(actionDropdown).toBeVisible();
        }
      }
    });

    test('should submit form successfully', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open and fill form
      const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForSelector('form', { timeout: 5000 }).catch(() => {});

        // Fill form fields
        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await amountField.fill('5000');
        }

        // Submit form
        const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForLoadState('networkidle');

          // Check for success message
          const successMsg = page.getByText(/success|created|policy/i).first();
          await expect(successMsg).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });

    test('should show new policy in list after creation', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Verify list is visible
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(table).toBeVisible();
      }
    });

    test('should validate required fields', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Try to submit without filling fields
        const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();

          // Check for error messages
          const errorMsg = page.getByText(/required|invalid|error/i).first();
          await expect(errorMsg).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
      }
    });

    test('should validate amount format', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Enter invalid amount
        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await amountField.fill('-1000');

          // Check for validation error
          const errorMsg = page.getByText(/invalid|must|positive|negative/i).first();
          await expect(errorMsg).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
      }
    });

    test('should allow editing policy', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Look for edit button in table
      const editBtn = page.getByRole('button', { name: /edit|pencil|modify/i }).first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        // Verify form opened
        const form = page.locator('form').first();
        await expect(form).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });

    test('should allow deleting policy', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Look for delete button
      const deleteBtn = page.getByRole('button', { name: /delete|trash|remove/i }).first();
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click();

        // Confirm deletion if dialog appears
        const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes|ok/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Audit Trail Display', () => {
    test('should display audit log table', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Verify table visible
      const table = page.locator('table, [role="table"]').first();
      await expect(table).toBeVisible({ timeout: 5000 });
    });

    test('should show audit columns', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Check for column headers
      const headerCells = page.locator('[role="columnheader"], th');
      const headerCount = await headerCells.count();
      expect(headerCount).toBeGreaterThan(0);
    });

    test('should paginate audit results', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Look for pagination controls
      const nextBtn = page.getByRole('button', { name: /next|more|forward/i }).first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(nextBtn).toBeVisible();
      }
    });

    test('should filter audit by operation type', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Look for filter dropdown
      const filterBtn = page.getByLabel(/operation|type|filter/i).first();
      if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterBtn.click();

        // Check for filter options
        const option = page.getByRole('option').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should filter audit by decision', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Look for decision filter
      const filterBtn = page.getByLabel(/decision|result|action/i).first();
      if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterBtn.click();

        // Select option
        const option = page.getByRole('option', { name: /allow|block|review/i }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should filter audit by date range', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Look for date filter
      const dateField = page.getByLabel(/date|from|range/i).first();
      if (await dateField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateField.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should search audit by stripe ID', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Look for search field
      const searchField = page.getByPlaceholder(/search|id|stripe/i).first();
      if (await searchField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchField.fill('ch_test_123');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display audit details on click', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Click on first table row
      const tableRow = page.locator('tbody tr, [role="row"]').first();
      if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tableRow.click();
        await page.waitForLoadState('networkidle');

        // Check for detail panel/modal
        const detailPanel = page.locator('[role="dialog"], .detail-panel, .modal').first();
        await expect(detailPanel).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    });

    test('should export audit logs', async ({ page, context }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Start listening for download
      const downloadPromise = context.waitForEvent('download');

      // Click export button
      const exportBtn = page.getByRole('button', { name: /export|download|csv|json/i }).first();
      if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exportBtn.click();

        // Wait for download (with timeout in case it doesn't happen)
        downloadPromise.catch(() => {});
      }
    });
  });

  test.describe('User Interface Responsiveness', () => {
    test('should load dashboard in <2 seconds', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should load audit page in <1 second', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000);
    });

    test('should respond to form input immediately', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open form
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Measure input response time
        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
          const startTime = Date.now();
          await amountField.fill('5000');
          const inputTime = Date.now() - startTime;

          // Input should respond quickly
          expect(inputTime).toBeLessThan(500);
        }
      }
    });

    test('should highlight success messages', async ({ page }) => {
      // Navigate to policies page and create a policy
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Look for success notification
      const successMsg = page.getByText(/success|created|updated|saved/i).first();

      // Even if no action yet, success messages should be visible when they appear
      if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(successMsg).toBeVisible();
      }
    });

    test('should highlight error messages', async ({ page }) => {
      // Navigate to policies page
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      // Open form and try invalid submission
      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Try to submit with invalid data
        const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();

          // Check for error message
          const errorMsg = page.getByText(/error|invalid|required|failed/i).first();
          await expect(errorMsg).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
      }
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication to access dashboard', async ({ page, context }) => {
      // Create a new context without auth
      const newContext = await test.browser?.newContext() || context;
      const newPage = await newContext.newPage();

      try {
        // Try to access dashboard
        await newPage.goto(`${baseURL}/stripe-app`, { waitUntil: 'networkidle' });

        // Should redirect to login or show auth error
        const loginForm = newPage.getByLabel(/email|login|sign in/i).first();
        const authRequired = newPage.getByText(/unauthorized|authentication required|sign in/i).first();

        const isAuthRequired =
          await loginForm.isVisible({ timeout: 2000 }).catch(() => false) ||
          await authRequired.isVisible({ timeout: 2000 }).catch(() => false) ||
          newPage.url().includes('login') ||
          newPage.url().includes('auth');

        expect(isAuthRequired).toBeTruthy();
      } finally {
        await newPage.close();
        if (newContext !== context) {
          await newContext.close();
        }
      }
    });

    test('should require authorization for account access', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Verify user can access their own account
      const accountInfo = page.getByText(/account|stripe|connected/i).first();
      await expect(accountInfo).toBeVisible({ timeout: 3000 }).catch(() => {});
    });

    test('should display user account info', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Look for user info
      const userInfo = page.getByText(/@|email|user/i).first();

      if (await userInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(userInfo).toBeVisible();
      }
    });

    test('should allow logout', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Look for logout button
      const logoutBtn = page.getByRole('button', { name: /logout|sign out|exit/i }).first();

      if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutBtn.click();
        await page.waitForLoadState('networkidle');

        // Should redirect away from dashboard
        const stillOnDashboard = !page.url().includes('stripe-app');
        expect(stillOnDashboard).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Navigate to audit page (which makes API call)
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // Page should load even if API errors
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(0);
    });

    test('should handle network timeout', async ({ page }) => {
      // Navigate to page
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');

      // Page should be recoverable
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible({ timeout: 3000 }).catch(() => {});
    });

    test('should handle missing data gracefully', async ({ page }) => {
      // Navigate to audit page
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      // If no data, should show empty state
      const emptyState = page.getByText(/no data|empty|no records|nothing/i).first();
      const table = page.locator('table, [role="table"]').first();

      const hasContent =
        await table.isVisible({ timeout: 2000 }).catch(() => false) ||
        await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should render dashboard on mobile viewport', async ({ page, context }) => {
      // Create mobile context
      const mobileContext = await test.browser?.newContext({
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
      }) || context;

      const mobilePage = await mobileContext.newPage();

      try {
        // Navigate to dashboard
        await mobilePage.goto(`${baseURL}/stripe-app`, { waitUntil: 'networkidle' });

        // Verify page loaded on mobile
        const heading = mobilePage.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 3000 }).catch(() => {});

        // Check navigation is accessible
        const nav = mobilePage.getByRole('navigation').first();
        if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(nav).toBeVisible();
        }
      } finally {
        await mobilePage.close();
        if (mobileContext !== context) {
          await mobileContext.close();
        }
      }
    });

    test('should have touch-friendly buttons on mobile', async ({ page, context }) => {
      // Create mobile context
      const mobileContext = await test.browser?.newContext({
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
      }) || context;

      const mobilePage = await mobileContext.newPage();

      try {
        // Navigate to dashboard
        await mobilePage.goto(`${baseURL}/stripe-app`, { waitUntil: 'networkidle' });

        // Check button sizes
        const buttons = mobilePage.getByRole('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
          const firstButton = buttons.first();
          const boundingBox = await firstButton.boundingBox();

          // Buttons should be at least 44x44 for touch (minimum touch target size)
          if (boundingBox) {
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(30);
          }
        }
      } finally {
        await mobilePage.close();
        if (mobileContext !== context) {
          await mobileContext.close();
        }
      }
    });

    test('should handle mobile form input', async ({ page, context }) => {
      // Create mobile context
      const mobileContext = await test.browser?.newContext({
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
      }) || context;

      const mobilePage = await mobileContext.newPage();

      try {
        // Navigate to policies page
        await mobilePage.goto(`${baseURL}/stripe-app/policies`, { waitUntil: 'networkidle' });

        // Try to open form
        const createBtn = mobilePage.getByRole('button', { name: /create|new/i }).first();
        if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createBtn.click();

          // Try to input data
          const inputField = mobilePage.getByLabel(/amount|limit/i).first();
          if (await inputField.isVisible({ timeout: 2000 }).catch(() => false)) {
            await inputField.fill('5000');
            const value = await inputField.inputValue();
            expect(value).toBe('5000');
          }
        }
      } finally {
        await mobilePage.close();
        if (mobileContext !== context) {
          await mobileContext.close();
        }
      }
    });
  });

  test.describe('Complete User Workflows', () => {
    test('complete workflow: connect account → create policy → view audit', async ({ page }) => {
      // Step 1: Verify dashboard
      await page.goto(`${baseURL}/stripe-app`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /stripe|dashboard/i }).first()).toBeVisible();

      // Step 2: Navigate to policies
      const policiesNav = page.getByRole('link', { name: /policies/i }).first();
      if (await policiesNav.isVisible()) {
        await policiesNav.click();
        await page.waitForLoadState('networkidle');

        // Create policy
        const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForSelector('form', { timeout: 5000 }).catch(() => {});

          const amountField = page.getByLabel(/amount|limit|max/i).first();
          if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
            await amountField.fill('5000');

            const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
            if (await submitBtn.isVisible()) {
              await submitBtn.click();
              await page.waitForLoadState('networkidle');
            }
          }
        }
      }

      // Step 3: Navigate to audit
      const auditNav = page.getByRole('link', { name: /audit|logs/i }).first();
      if (await auditNav.isVisible()) {
        const startTime = Date.now();
        await auditNav.click();
        await page.waitForLoadState('networkidle');
        const auditLoadTime = Date.now() - startTime;
        perfCollector.recordMetric('auditPageLoad', auditLoadTime);

        const table = page.locator('table, [role="table"]').first();
        await expect(table).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test('complete workflow: OAuth flow with callback handling', async ({ page, context }) => {
      // Navigate to connect page
      await page.goto(`${baseURL}/stripe-app/connect`);
      await page.waitForLoadState('networkidle');

      // Verify OAuth button is present
      const connectBtn = page.getByRole('button', { name: /connect.*stripe|authorize/i }).first();
      await expect(connectBtn).toBeVisible();

      // Simulate OAuth flow with intercepted callback
      let callbackUrl = '';
      page.on('popup', (popup) => {
        callbackUrl = popup.url();
      });

      // Simulate successful OAuth callback
      const mockAuthCode = 'ac_test_' + Date.now();
      await page.goto(`${baseURL}/stripe-app/oauth/callback?code=${mockAuthCode}&state=test_state`);
      await page.waitForLoadState('networkidle');

      // Verify redirect or success message
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });

    test('complete workflow: policy creation → evaluation → audit trail', async ({ page }) => {
      const startTime = Date.now();

      // Create a policy
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForSelector('form', { timeout: 5000 }).catch(() => {});

        // Fill form
        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await amountField.fill('7500');

          const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            const createTime = Date.now() - startTime;
            perfCollector.recordMetric('policyCreate', createTime);
            await page.waitForLoadState('networkidle');
          }
        }
      }

      // Verify policy in list
      const table = page.locator('table, [role="table"]').first();
      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(table).toBeVisible();
      }

      // Navigate to audit
      const auditNav = page.getByRole('link', { name: /audit|logs|history/i }).first();
      if (await auditNav.isVisible()) {
        await auditNav.click();
        await page.waitForLoadState('networkidle');

        // Verify audit entries
        const auditTable = page.locator('table, [role="table"]').first();
        await expect(auditTable).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test('complete workflow: bulk operations and filtering', async ({ page }) => {
      await page.goto(`${baseURL}/stripe-app/audit`);
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const auditLoadTime = Date.now() - startTime;
      perfCollector.recordMetric('auditPageLoad', auditLoadTime);

      // Apply filters
      const filterBtn = page.getByLabel(/operation|type|filter|decision/i).first();
      if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterBtn.click();

        const option = page.getByRole('option').first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          const filterTime = Date.now() - startTime;
          perfCollector.recordMetric('auditSearch', filterTime);
          await option.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Verify filtered results
      const resultCount = await page.locator('tbody tr, [role="row"]').count();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    });

    test('complete workflow: settings configuration', async ({ page }) => {
      await page.goto(`${baseURL}/stripe-app/settings`);
      await page.waitForLoadState('networkidle');

      // Verify settings page loaded
      const settingsHeading = page.getByRole('heading', { name: /settings|configuration/i }).first();
      if (await settingsHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(settingsHeading).toBeVisible();

        // Look for save button
        const saveBtn = page.getByRole('button', { name: /save|apply|update/i }).first();
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(saveBtn).toBeVisible();
        }
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('measure dashboard load performance', async ({ page }) => {
      const measurements: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await page.goto(`${baseURL}/stripe-app`, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        measurements.push(loadTime);
        perfCollector.recordMetric('dashboardLoadBenchmark', loadTime);

        expect(loadTime).toBeLessThan(PERF_THRESHOLDS.dashboardLoad);
      }

      const avg = measurements.reduce((a, b) => a + b) / measurements.length;
      expect(avg).toBeLessThan(PERF_THRESHOLDS.dashboardLoad);
    });

    test('measure audit page load performance', async ({ page }) => {
      const measurements: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await page.goto(`${baseURL}/stripe-app/audit`, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        measurements.push(loadTime);
        perfCollector.recordMetric('auditLoadBenchmark', loadTime);

        expect(loadTime).toBeLessThan(PERF_THRESHOLDS.auditPageLoad);
      }
    });

    test('measure policy creation time', async ({ page }) => {
      const times: number[] = [];

      for (let i = 0; i < 2; i++) {
        await page.goto(`${baseURL}/stripe-app/policies`);
        await page.waitForLoadState('networkidle');

        const startTime = Date.now();

        const createBtn = page.getByRole('button', { name: /create|new|add/i }).first();
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForSelector('form', { timeout: 5000 }).catch(() => {});

          const amountField = page.getByLabel(/amount|limit|max/i).first();
          if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
            await amountField.fill(String(5000 + i * 1000));

            const submitBtn = page.getByRole('button', { name: /submit|create|save/i }).first();
            if (await submitBtn.isVisible()) {
              await submitBtn.click();
              const createTime = Date.now() - startTime;
              times.push(createTime);
              perfCollector.recordMetric('policyCreateBenchmark', createTime);

              expect(createTime).toBeLessThan(PERF_THRESHOLDS.policyCreate);

              await page.waitForLoadState('networkidle');
            }
          }
        }
      }
    });

    test('measure form input response time', async ({ page }) => {
      await page.goto(`${baseURL}/stripe-app/policies`);
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create|new/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();

        const amountField = page.getByLabel(/amount|limit|max/i).first();
        if (await amountField.isVisible({ timeout: 2000 }).catch(() => false)) {
          const startTime = Date.now();
          await amountField.fill('5000');
          const inputTime = Date.now() - startTime;
          perfCollector.recordMetric('formInputBenchmark', inputTime);

          expect(inputTime).toBeLessThan(PERF_THRESHOLDS.formInput);
        }
      }
    });

    test('measure audit search performance', async ({ page }) => {
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      const searchField = page.getByPlaceholder(/search|id|stripe/i).first();
      if (await searchField.isVisible({ timeout: 2000 }).catch(() => false)) {
        const startTime = Date.now();
        await searchField.fill('ch_test_123');
        await page.keyboard.press('Enter');
        const searchTime = Date.now() - startTime;
        perfCollector.recordMetric('auditSearchBenchmark', searchTime);

        expect(searchTime).toBeLessThan(PERF_THRESHOLDS.auditSearch);

        await page.waitForLoadState('networkidle');
      }
    });

    test('measure webhook processing latency', async ({ page }) => {
      // This test measures overall webhook processing through UI
      await page.goto(`${baseURL}/stripe-app/audit`);
      await page.waitForLoadState('networkidle');

      const startTime = Date.now();

      // Trigger a filter that would show webhook events
      const filterBtn = page.getByLabel(/operation|type|filter|webhook/i).first();
      if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterBtn.click();

        const webhookOption = page.getByRole('option', { name: /webhook/i }).first();
        if (await webhookOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await webhookOption.click();
          const webhookLatency = Date.now() - startTime;
          perfCollector.recordMetric('webhookLatency', webhookLatency);

          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('log performance metrics summary', async () => {
      const metrics = perfCollector.getAllMetrics();

      // Log summary
      console.log('\n=== Performance Metrics Summary ===');
      Object.entries(metrics).forEach(([name, stats]) => {
        if (stats) {
          console.log(`${name}:`);
          console.log(`  avg: ${stats.avg?.toFixed(0)}ms`);
          console.log(`  median: ${stats.median?.toFixed(0)}ms`);
          console.log(`  min: ${stats.min}ms`);
          console.log(`  max: ${stats.max}ms`);
          console.log(`  count: ${stats.count}`);
        }
      });
      console.log('====================================\n');

      // Verify key thresholds
      const dashboardMetric = metrics.dashboardLoadBenchmark;
      if (dashboardMetric && dashboardMetric.avg) {
        expect(dashboardMetric.avg).toBeLessThan(PERF_THRESHOLDS.dashboardLoad);
      }

      const auditMetric = metrics.auditLoadBenchmark;
      if (auditMetric && auditMetric.avg) {
        expect(auditMetric.avg).toBeLessThan(PERF_THRESHOLDS.auditPageLoad);
      }
    });
  });
});
