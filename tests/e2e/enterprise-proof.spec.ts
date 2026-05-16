import { test, expect } from '@playwright/test';

test('enterprise proof public pages show current proof boundary', async ({ page }) => {
  await page.goto('/enterprise-proof/start');

  await expect(page.getByTestId('enterprise-proof-start')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Public proof summary for governed AI runtime' })).toBeVisible();
  await expect(page.getByText('Public pages explain the control model')).toBeVisible();

  await page.getByRole('link', { name: 'Open public report' }).click();

  await expect(page.getByTestId('enterprise-proof-report')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why governed runtime matters' })).toBeVisible();
  await expect(page.getByText('Verification boundary')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try the Playground' })).toBeVisible();
});
