const { test, expect } = require('@playwright/test');

// TODO: Update this URL to your furniture store website
const BASE_URL = 'https://your-furniture-store-url.com';

test.describe('Furniture Store Homepage Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Furniture|Store|Home/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation menu is visible', async ({ page }) => {
    await page.goto(BASE_URL);
    const nav = page.locator('nav, header nav, .navigation, .main-menu').first();
    await expect(nav).toBeVisible();
  });

  test('furniture categories are displayed', async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Look for common furniture category elements
    const categories = page.locator('[class*="category"], [class*="collection"], .product-category, h2, h3');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer is present', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('footer')).toBeVisible();
  });
});

