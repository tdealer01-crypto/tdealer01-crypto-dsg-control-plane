import { chromium } from '@playwright/test';
import fs from 'node:fs';

export default async function globalSetup() {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

  if (!email || !password) {
    throw new Error('Missing required env vars: E2E_TEST_EMAIL, E2E_TEST_PASSWORD');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // ไปหน้า password-login แล้ว redirect ไป /dashboard หลัง login
  await page.goto(`${baseURL}/password-login?next=/dashboard`, { waitUntil: 'domcontentloaded' });

  // กรอก form ตรงๆ — ไม่ต้องใช้ CDN หรือ require ใน browser context
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"], form button');

  // รอให้ middleware set cookie แล้ว redirect เข้า dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // ยืนยัน session ทำงาน
  await page.waitForSelector('text=Command Center', { timeout: 10_000 });

  // เซฟ storageState (cookies + localStorage) สำหรับ test ทุกตัว
  fs.mkdirSync('playwright/.auth', { recursive: true });
  await context.storageState({ path: 'playwright/.auth/storageState.json' });

  await browser.close();
}
