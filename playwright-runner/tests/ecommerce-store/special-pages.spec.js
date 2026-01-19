const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ecommerce-playground.lambdatest.io';

test.describe('Special Pages Tests', () => {
  test('special offers page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=product/special`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('contact us page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=information/contact`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('sitemap is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=information/sitemap`);
    await expect(page.locator('body')).toBeVisible();
    const links = page.locator('a');
    expect(await links.count()).toBeGreaterThan(5);
  });
});

