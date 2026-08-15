import { expect, test } from '@playwright/test';

test.describe('DSG ONE start funnel', () => {
  test('shows truthful connection states and routes to pricing', async ({ page }) => {
    await page.goto('/start');

    await expect(page.getByRole('heading', { name: /Connect.*verify.*execute.*evidence/i })).toBeVisible();
    await expect(page.getByText('Web demo')).toBeVisible();
    await expect(page.getByText('DSG Gate API')).toBeVisible();
    await expect(page.getByText('MCP server')).toBeVisible();
    await expect(page.getByText('GitHub integration')).toBeVisible();
    await expect(page.getByText('Vercel integration')).toBeVisible();

    await expect(page.getByText('Ready now')).toHaveCount(2);
    await expect(page.getByText('Guided install')).toHaveCount(1);
    await expect(page.getByText('Access request')).toHaveCount(2);

    await expect(page.getByRole('link', { name: /Choose plan/i })).toHaveAttribute('href', '/pricing');
  });

  test('pricing exposes the connection/install funnel', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('link', { name: /connection and install paths/i })).toHaveAttribute('href', '/start');
  });
});
