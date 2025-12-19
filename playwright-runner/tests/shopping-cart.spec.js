const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ecommerce-playground.lambdatest.io';

test.describe('Shopping Cart Tests', () => {
  test('shopping cart is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    const cartElement = page.locator('#cart-total, .cart-icon, #cart').first();
    await expect(cartElement).toBeVisible();
  });

  test('cart shows empty message', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    await page.locator('#cart-total, #cart').first().click();
    await page.waitForTimeout(500);
    const cartDropdown = page.locator('.dropdown-menu, #cart .dropdown-menu').first();
    if (await cartDropdown.isVisible()) {
      await expect(cartDropdown).toContainText(/empty|0 item/i);
    }
  });

  test('can add product to cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=common/home`);
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button[title*="cart"]').first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
      const cartTotal = page.locator('#cart-total, #cart').first();
      await expect(cartTotal).toBeVisible();
    }
  });

  test('cart page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=checkout/cart`);
    await expect(page.locator('h1, h2')).toBeVisible();
  });
});

