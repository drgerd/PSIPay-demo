const { test, expect } = require('@playwright/test');

test('dashboard loads and can run compare + recommend (local lambda fixtures)', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Psipay Dashboard' })).toBeVisible();
  await expect(page.getByText('mocks: false')).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Market snapshot (/products)' })).toBeVisible();
  await expect(page.getByText('Loading snapshot...')).toHaveCount(0);
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);

  await page.getByRole('button', { name: 'Compare + Recommend' }).click();

  await expect(page.getByRole('heading', { name: 'Comparison (/compare)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Insights (/recommendations)' })).toBeVisible();
  await expect(page.getByText('Educational, not financial advice.')).toBeVisible();
});
