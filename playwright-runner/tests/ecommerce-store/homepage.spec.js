const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ecommerce-playground.lambdatest.io';

test.describe('Homepage Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    await expect(page).toHaveTitle(/Your Store/);
    await expect(page.locator('text=Shop by Category')).toBeVisible();
  });

  test('top products are displayed', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    await page.waitForSelector('.product-thumb, .product-layout');
    const products = page.locator('.product-thumb, .product-layout');
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('banner carousel is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    const carousel = page.locator('.swiper-container, #carousel-banner-0, .carousel').first();
    await expect(carousel).toBeVisible();
  });

  test('footer links are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    await expect(page.locator('footer')).toBeVisible();
    const footerLinks = page.locator('footer a');
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(5);
  });
});

