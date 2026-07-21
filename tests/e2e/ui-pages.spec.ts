import { test, expect } from '@playwright/test';

test.describe('Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with all 3 options', async ({ page }) => {
    // Main heading (h2, not h1 - h1 is "DSG ONE")
    await expect(page.locator('h2').first()).toContainText('เข้าสู่ระบบด้วยรหัสผ่าน');

    // 3 options visible
    await expect(page.locator('text=สำหรับผู้ใช้ที่มีบัญชีแล้ว')).toBeVisible();
    await expect(page.locator('text=ลืมรหัสผ่าน')).toBeVisible();
    await expect(page.locator('text=ผู้ใช้ใหม่')).toBeVisible();

    // CTA buttons
    await expect(page.locator('a[href="/password-login"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
    await expect(page.locator('button', { hasText: 'เข้าสู่ระบบผ่าน SSO' })).toBeVisible();
  });

  test('should navigate to password login on click', async ({ page }) => {
    await page.locator('a[href="/password-login"]').click();
    await expect(page).toHaveURL(/\/password-login/);
  });

  test('should navigate to signup on click', async ({ page }) => {
    await page.locator('a[href="/signup"]').click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should show SSO button is clickable', async ({ page }) => {
    const ssoBtn = page.locator('button:has-text("เข้าสู่ระบบผ่าน SSO")');
    await expect(ssoBtn).toBeVisible();
    await expect(ssoBtn).toBeEnabled();
  });

  test('should show recovery form with email input and submit button', async ({ page }) => {
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("ส่งลิงก์กู้คืน")')).toBeVisible();
  });

  test('should display brand logo and title', async ({ page }) => {
    await expect(page.locator('h1:has-text("DSG ONE")')).toBeVisible();
    await expect(page.locator('text=ProofGate Runtime Control Plane')).toBeVisible();
  });

  test('should show notice banner when error param present', async ({ page }) => {
    await page.goto('/login?error=invalid-email');
    await expect(page.locator('text=รูปแบบอีเมลไม่ถูกต้อง')).toBeVisible();
  });

  test('should show success notice when check-email param present', async ({ page }) => {
    await page.goto('/login?message=check-email');
    await expect(page.locator('text=ส่งลิงก์กู้คืนแล้ว')).toBeVisible();
  });

  test('should dismiss notice banner on click X', async ({ page }) => {
    await page.goto('/login?error=invalid-email');
    await page.locator('button[aria-label="ปิด"]').click();
    await expect(page.locator('text=รูปแบบอีเมลไม่ถูกต้อง')).not.toBeVisible();
  });
});

test.describe('Password Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/password-login');
  });

  test('should display form with email and password fields', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('เข้าสู่ระบบ');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button:has-text("เข้าสู่ระบบ")')).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.locator('button:has-text("เข้าสู่ระบบ")').click();
    // HTML5 validation should prevent submit
    await expect(page).toHaveURL(/\/password-login/);
  });

  test('should show error banner from URL param', async ({ page }) => {
    await page.goto('/password-login?error=invalid-credentials');
    await expect(page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible();
  });

  test('should show back to login link', async ({ page }) => {
    await expect(page.locator('a:has-text("กลับไปหน้าเข้าสู่ระบบ")')).toBeVisible();
  });

  test('should submit credentials to the auth endpoint', async ({ page }) => {
    // Stub the auth endpoint: respond like a failed login (303 back with error
    // param) so the test proves the form performs a real POST submission and
    // the page renders the resulting error banner — without needing Supabase.
    await page.route('**/auth/password-login', async (route) => {
      await route.fulfill({
        status: 303,
        headers: { location: '/password-login?error=invalid-credentials' },
      });
    });

    await page.locator('input#email').fill('test@example.com');
    await page.locator('input#password').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/error=invalid-credentials/);
    await expect(page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible();
  });
});

test.describe('Signup Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('should display signup form with all fields', async ({ page }) => {
    await expect(page.locator('text=สร้าง workspace แรกของคุณ').first()).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="workspace_name"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    // Verify submit button exists
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation for short password', async ({ page }) => {
    await page.locator('input[name="full_name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="workspace_name"]').fill('test-workspace');
    await page.locator('input[name="password"]').fill('123');
    await page.locator('button[type="submit"]').click();
    // Should show validation error
    await expect(page.locator('text=รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')).toBeVisible();
  });

  test('should show link back to login', async ({ page }) => {
    await expect(page.locator('a:has-text("เข้าสู่ระบบ")').first()).toBeVisible();
  });
});

// Dashboard and Hermes pages render on localhost without Supabase env vars:
// middleware skips auth for localhost hosts and the dashboard/hermes layouts
// fall back to a signed-out shell when Supabase public env vars are absent.

test.describe('Dashboard Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard header', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('ศูนย์ควบคุม');
  });

  test('should show 4 KPI cards', async ({ page }) => {
    await expect(page.locator('text=ตัวแทนที่ใช้งาน').first()).toBeVisible();
    await expect(page.locator('text=การดำเนินการทั้งหมด').first()).toBeVisible();
    await expect(page.locator('text=สถานะ Core').first()).toBeVisible();
    await expect(page.locator('text=สถานะฐานข้อมูล').first()).toBeVisible();
  });

  test('should show system health indicator', async ({ page }) => {
    await expect(page.locator('text=สถานะระบบ').first()).toBeVisible();
  });

  test('should show refresh button', async ({ page }) => {
    // Button contains "รีเฟรช" or "กำลังโหลด"
    const refreshBtn = page.locator('button').filter({ hasText: /รีเฟรช|กำลังโหลด/ });
    await expect(refreshBtn.first()).toBeVisible();
  });

  test('should show command center link', async ({ page }) => {
    await expect(page.locator('a:has-text("ศูนย์บัญชาการ")').first()).toBeVisible();
  });

  test('should show products grid', async ({ page }) => {
    await expect(page.locator('text=ผลิตภัณฑ์').first()).toBeVisible();
  });
});

test.describe('Hermes Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/hermes');
  });

  test('should display tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("overview")').first()).toBeVisible();
    await expect(page.locator('button:has-text("agents")').first()).toBeVisible();
    await expect(page.locator('button:has-text("executions")').first()).toBeVisible();
    await expect(page.locator('button:has-text("governance")').first()).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Retry the click until the tab content appears — the first click can land
    // before React hydration attaches the tab onClick handlers.
    await expect(async () => {
      await page.locator('button:has-text("agents")').first().click();
      await expect(page.locator('text=Agents tab content')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });

    await expect(async () => {
      await page.locator('button:has-text("executions")').first().click();
      await expect(page.locator('text=Executions tab content')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  });

  test('should show Hermes Agent chat on overview tab', async ({ page }) => {
    await page.locator('button:has-text("overview")').first().click();
    await expect(page.locator('h1:has-text("Hermes Agent")')).toBeVisible();
    await expect(page.locator('text=Policy governance · Execution control · Audit trail')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="ถามเอเจนต์"]')).toBeVisible();
  });
});

test.describe('Chat Widget UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  // Skipped: the dashboard layout renders AgentChatWidget only for a signed-in
  // user ({user && <AgentChatWidget />} in app/dashboard/layout.tsx), so these
  // require an authenticated Supabase session (E2E_TEST_EMAIL/E2E_TEST_PASSWORD
  // + Supabase env), not just a rendering dashboard.

  test.skip('should show floating chat button', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await expect(page.locator('button[aria-label="เปิดแชท AI"]')).toBeVisible();
  });

  test.skip('should open chat on click', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=DSG AI')).toBeVisible();
    await expect(page.locator('text=พร้อมช่วยเหลือ')).toBeVisible();
  });

  test.skip('should show QA buttons in chat', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=ตรวจหน้านี้')).toBeVisible();
    await expect(page.locator('text=ตรวจทั้งหมด')).toBeVisible();
  });

  test.skip('should show suggestion chips', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=ตรวจสอบระบบ')).toBeVisible();
  });

  test.skip('should have text input and send button', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('input[placeholder="พิมพ์คำถามหรือคำสั่ง..."]')).toBeVisible();
    await expect(page.locator('button:has-text("ส่ง")')).toBeVisible();
  });

  test.skip('should close chat on X click', async ({ page }) => {
    // Skipped: requires authenticated session — widget renders only when signed in
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=DSG AI')).toBeVisible();
    await page.locator('button[aria-label="ปิดแชท"]').click();
    await expect(page.locator('text=DSG AI')).not.toBeVisible();
  });
});

test.describe('Docs Page UI', () => {
  test('should display English docs at /docs/en', async ({ page }) => {
    await page.goto('/docs/en');
    await expect(page.locator('text=DSG ONE').first()).toBeVisible();
    await expect(page.locator('text=User Guide').first()).toBeVisible();
  });

  test('should display Thai docs at /docs/th', async ({ page }) => {
    await page.goto('/docs/th');
    await expect(page.locator('text=DSG ONE').first()).toBeVisible();
    await expect(page.locator('text=คู่มือการใช้งาน').first()).toBeVisible();
  });

  test('should have language switcher', async ({ page }) => {
    await page.goto('/docs/en');
    await expect(page.locator('a[href="/docs/th"]')).toBeVisible();
    await expect(page.locator('a[href="/docs/en"]')).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/docs/en');
    // Retry the click — it can land before Next.js Link hydration completes.
    await expect(async () => {
      await page.locator('a[href="/docs/th"]').first().click();
      await expect(page).toHaveURL(/\/docs\/th/, { timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.locator('text=คู่มือการใช้งาน').first()).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('login page should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a[href="/password-login"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('password-login page should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/password-login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('signup page should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/signup');
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
