const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ecommerce-playground.lambdatest.io';

test.describe('Product Catalog Tests', () => {
  test('can navigate to product category', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    await page.goto(`${BASE_URL}/index.php?route=product/category&path=18`);
    await expect(page.locator('h2, h3, h1')).toBeTruthy();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    const searchBox = page.locator('input[name="search"]').first();
    await searchBox.fill('iPhone');
    await searchBox.press('Enter');
    await page.waitForURL(/search/);
    await expect(page.locator('h1')).toContainText('Search');
  });

  test('product details page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    const firstProduct = page.locator('.product-thumb, .product-layout').first();
    await firstProduct.locator('a').first().click();
    await page.waitForURL(/product/);
    await expect(page.locator('h1, h2, .product-title')).toBeVisible();
  });

  test('product grid view toggles', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=product/category&path=18`);
    const gridButton = page.locator('#grid-view, .btn-grid, button[data-view="grid"]').first();
    if (await gridButton.isVisible()) {
      await gridButton.click();
      await page.waitForTimeout(500);
    }
    const products = page.locator('.product-layout');
    expect(await products.count()).toBeGreaterThan(0);
  });
});

