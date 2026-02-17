const { test, expect } = require('@playwright/test');

test('dashboard loads and can run compare + recommend (mocked)', async ({ page }) => {
  await page.goto('/?mocks=1');

  await expect(page.getByRole('heading', { name: 'Psipay Dashboard' })).toBeVisible();

  // Wait for market snapshot to render.
  await expect(page.getByRole('heading', { name: 'Market snapshot (/products)' })).toBeVisible();
  await expect(page.getByText('Loading snapshot...')).toHaveCount(0);
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);

  await page.getByRole('button', { name: 'Compare + Recommend' }).click();

  await expect(page.getByRole('heading', { name: 'Comparison (/compare)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Insights (/recommendations)' })).toBeVisible();
});
