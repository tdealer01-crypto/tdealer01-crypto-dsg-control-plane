import { test, expect } from '@playwright/test';

test('enterprise walkthrough shows all checkpoints', async ({ page }) => {
  await page.goto('/enterprise-proof/start');

  await expect(page.getByTestId('enterprise-proof-start')).toBeVisible();
  await expect(page.getByTestId('walkthrough-steps')).toContainText('Public proof narrative introduces the product and route boundary');

  await expect(page.getByTestId('demo-context')).toBeVisible();

  await page.getByTestId('open-executive-report').click();

  await expect(page.getByTestId('enterprise-proof-report')).toBeVisible();
  await expect(page.getByTestId('value-landing')).toBeVisible();
  await expect(page.getByTestId('security-context')).toBeVisible();
  await expect(page.getByTestId('runtime-summary')).toBeVisible();
  await expect(page.getByTestId('ledger-lineage')).toBeVisible();
  await expect(page.getByTestId('governance-panel')).toBeVisible();
  await expect(page.getByTestId('checkpoint-recovery')).toBeVisible();
  await expect(page.getByTestId('billing-value')).toBeVisible();
  await expect(page.getByTestId('executive-proof-final')).toBeVisible();
});
