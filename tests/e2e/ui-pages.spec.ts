import { test, expect } from '@playwright/test';

test.describe('Login Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with all 3 options', async ({ page }) => {
    // Main heading
    await expect(page.locator('h1')).toContainText('เข้าสู่ระบบด้วยรหัสผ่าน');
    
    // 3 options visible
    await expect(page.locator('text=สำหรับผู้ใช้ที่มีบัญชีแล้ว')).toBeVisible();
    await expect(page.locator('text=ลืมรหัสผ่าน?')).toBeVisible();
    await expect(page.locator('text=ผู้ใช้ใหม่')).toBeVisible();
    
    // CTA buttons
    await expect(page.locator('a[href="/password-login"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
    await expect(page.locator('button:has-text("เข้าสู่ระบบผ่าน SSO")')).toBeVisible();
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
    await expect(page.locator('text=DSG ONE')).toBeVisible();
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

  test('should show loading state on submit', async ({ page }) => {
    await page.locator('input#email').fill('test@example.com');
    await page.locator('input#password').fill('password123');
    await page.locator('button:has-text("เข้าสู่ระบบ")').click();
    // Button should show loading text
    await expect(page.locator('text=กำลังเข้าสู่ระบบ...')).toBeVisible();
  });
});

test.describe('Signup Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('should display signup form with all fields', async ({ page }) => {
    await expect(page.locator('text=สร้าง Workspace ใหม่')).toBeVisible();
    await expect(page.locator('input[name="fullName"], input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="workspace"], input[name="workspaceName"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should show validation for short password', async ({ page }) => {
    await page.locator('input[name="fullName"], input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="workspace"], input[name="workspaceName"]').fill('test-workspace');
    await page.locator('input[name="password"]').fill('123');
    await page.locator('button[type="submit"]').click();
    // Should show validation error
    await expect(page.locator('text=รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')).toBeVisible();
  });

  test('should show link back to login', async ({ page }) => {
    await expect(page.locator('a:has-text("มีบัญชีอยู่แล้ว")')).toBeVisible();
  });
});

test.describe('Dashboard Page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ศูนย์ควบคุม');
  });

  test('should show 4 KPI cards', async ({ page }) => {
    await expect(page.locator('text=Agents')).toBeVisible();
    await expect(page.locator('text=Executions')).toBeVisible();
    await expect(page.locator('text=Core Status')).toBeVisible();
    await expect(page.locator('text=DB Status')).toBeVisible();
  });

  test('should show system health indicator', async ({ page }) => {
    await expect(page.locator('text=สถานะระบบ')).toBeVisible();
  });

  test('should show refresh button', async ({ page }) => {
    await expect(page.locator('button:has-text("รีเฟรช")')).toBeVisible();
  });

  test('should show command center link', async ({ page }) => {
    await expect(page.locator('a:has-text("ศูนย์บัญชาการ")')).toBeVisible();
  });

  test('should show products grid', async ({ page }) => {
    await expect(page.locator('text=Products')).toBeVisible();
  });
});

test.describe('Hermes Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/hermes');
  });

  test('should display tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("overview")')).toBeVisible();
    await expect(page.locator('button:has-text("agents")')).toBeVisible();
    await expect(page.locator('button:has-text("executions")')).toBeVisible();
    await expect(page.locator('button:has-text("governance")')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.locator('button:has-text("agents")').click();
    await expect(page.locator('text=No agents configured')).toBeVisible();
    
    await page.locator('button:has-text("executions")').click();
    await expect(page.locator('text=No executions recorded')).toBeVisible();
  });

  test('should show quick actions on overview tab', async ({ page }) => {
    await page.locator('button:has-text("overview")').click();
    await expect(page.locator('text=View Agents')).toBeVisible();
    await expect(page.locator('text=View Audit')).toBeVisible();
    await expect(page.locator('text=Governance')).toBeVisible();
  });
});

test.describe('Chat Widget UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show floating chat button', async ({ page }) => {
    await expect(page.locator('button[aria-label="เปิดแชท AI"]')).toBeVisible();
  });

  test('should open chat on click', async ({ page }) => {
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=DSG AI')).toBeVisible();
    await expect(page.locator('text=พร้อมช่วยเหลือ')).toBeVisible();
  });

  test('should show QA buttons in chat', async ({ page }) => {
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=ตรวจหน้านี้')).toBeVisible();
    await expect(page.locator('text=ตรวจทั้งหมด')).toBeVisible();
  });

  test('should show suggestion chips', async ({ page }) => {
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=ตรวจสอบระบบ')).toBeVisible();
  });

  test('should have text input and send button', async ({ page }) => {
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('input[placeholder="พิมพ์คำถามหรือคำสั่ง..."]')).toBeVisible();
    await expect(page.locator('button:has-text("ส่ง")')).toBeVisible();
  });

  test('should close chat on X click', async ({ page }) => {
    await page.locator('button[aria-label="เปิดแชท AI"]').click();
    await expect(page.locator('text=DSG AI')).toBeVisible();
    await page.locator('button[aria-label="ปิดแชท"]').click();
    await expect(page.locator('text=DSG AI')).not.toBeVisible();
  });
});

test.describe('Docs Page UI', () => {
  test('should display English docs at /docs/en', async ({ page }) => {
    await page.goto('/docs/en');
    await expect(page.locator('text=DSG ONE')).toBeVisible();
    await expect(page.locator('text=User Guide')).toBeVisible();
  });

  test('should display Thai docs at /docs/th', async ({ page }) => {
    await page.goto('/docs/th');
    await expect(page.locator('text=DSG ONE')).toBeVisible();
    await expect(page.locator('text=คู่มือการใช้งาน')).toBeVisible();
  });

  test('should have language switcher', async ({ page }) => {
    await page.goto('/docs/en');
    await expect(page.locator('a[href="/docs/th"]')).toBeVisible();
    await expect(page.locator('a[href="/docs/en"]')).toBeVisible();
  });

  test('should switch language', async ({ page }) => {
    await page.goto('/docs/en');
    await page.locator('a[href="/docs/th"]').click();
    await expect(page).toHaveURL(/\/docs\/th/);
    await expect(page.locator('text=คู่มือการใช้งาน')).toBeVisible();
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

  test('dashboard should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button:has-text("รีเฟรช")')).toBeVisible();
  });

  test('chat widget should be positioned correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await expect(page.locator('button[aria-label="เปิดแชท AI"]')).toBeVisible();
  });
});
