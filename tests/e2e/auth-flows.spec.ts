import { expect, test } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('auth and protected route journeys', () => {
  test('anonymous user is redirected from dashboard to login and preserves next path', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('next=');
  });

  test('login page exposes primary email or SSO entry without relying on source text', async ({ page }) => {
    await page.goto(`${baseURL}/login`);

    const emailInput = page.getByRole('textbox', { name: /email/i }).or(page.getByPlaceholder(/email/i));
    await expect(emailInput.first()).toBeVisible();

    const submit = page.getByRole('button', { name: /continue|login|sign in|magic link/i });
    await expect(submit.first()).toBeVisible();
  });

  test('invalid or blocked login error surfaces a human-readable message', async ({ page }) => {
    await page.goto(`${baseURL}/login?error=approval-required`);

    await expect(page.getByText(/approval|required|access|not allowed/i).first()).toBeVisible();
  });
});
