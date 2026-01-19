const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://shop-app-hazel-one.vercel.app';

test.describe('Furniture Store Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/THE FURNITURE STORE/i);
    
    // Verify main heading is visible
    await expect(page.getByRole('heading', { name: /Quality Furniture/i })).toBeVisible();
    
    // Verify page URL
    expect(page.url()).toBe(BASE_URL + '/');
  });

  test('should display header elements and verify they are functional', async ({ page }) => {
    // Logo should be visible
    const logo = page.getByRole('link', { name: /THE FURNITURE STORE/i }).first();
    await expect(logo).toBeVisible();
    
    // Sign in link should be visible
    const signInLink = page.getByRole('link', { name: /Sign in/i });
    await expect(signInLink).toBeVisible();
    
    // Search bar should be visible
    const searchInput = page.getByPlaceholder(/Search for furniture/i);
    await expect(searchInput).toBeVisible();
    
    // Cart icon should be present (may show 0 items)
    const cartIcon = page.locator('[aria-label*="cart" i], [class*="cart"]').first();
    await expect(cartIcon).toBeVisible();
  });

  test('should display hero section with correct content', async ({ page }) => {
    // Main hero heading
    await expect(page.getByRole('heading', { name: /Quality Furniture/i })).toBeVisible();
    await expect(page.getByText(/For Every Room/i)).toBeVisible();
    
    // Shop Now CTA button should be visible and clickable
    const shopNowButton = page.getByRole('link', { name: /Shop Now/i }).first();
    await expect(shopNowButton).toBeVisible();
    
    // Verify button is clickable (not disabled)
    await expect(shopNowButton).toBeEnabled();
  });

  test('should display all collection categories', async ({ page }) => {
    // Verify all main categories are present
    const categories = ['Living Room', 'Bathroom', 'Kitchen', 'Bedroom'];
    
    for (const category of categories) {
      const categoryLink = page.getByRole('link', { name: new RegExp(category, 'i') });
      await expect(categoryLink.first()).toBeVisible();
    }
  });

  test('should display featured products section', async ({ page }) => {
    // Featured Products heading
    await expect(page.getByRole('heading', { name: /Featured Products/i })).toBeVisible();
    
    // Verify at least one product is displayed
    // Products typically have price elements
    const prices = page.locator('text=/$/');
    const priceCount = await prices.count();
    expect(priceCount).toBeGreaterThan(0);
    
    // Verify product images are present (they should have img tags or be in product containers)
    const productImages = page.locator('img').filter({ hasNotText: /logo|icon/i });
    const imageCount = await productImages.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('should display featured products with required information', async ({ page }) => {
    // Check for product titles/names - use .first() to handle multiple matches (link + description)
    const productTitles = [
      /Bathroom Oak Vanity/i,
      /Brass Kitchen Faucet/i,
      /Recliner Rocker/i,
      /Stockholm Sofa/i
    ];
    
    for (const title of productTitles) {
      // Use .first() to avoid strict mode violations when text appears in multiple places
      await expect(page.getByText(title).first()).toBeVisible();
    }
    
    // Verify prices are displayed
    const pricePattern = /\$[\d,]+\.\d{2}/;
    const prices = page.locator('text=' + pricePattern);
    const priceCount = await prices.count();
    expect(priceCount).toBeGreaterThanOrEqual(4); // At least 4 products with prices
  });

  test('should display footer with required elements', async ({ page }) => {
    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Newsletter signup should be present
    await expect(page.getByText(/Sign up to Our Newsletter/i)).toBeVisible();
    
    // Email input field should be visible
    const emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
    await expect(emailInput.first()).toBeVisible();
    
    // Submit button should be present
    const submitButton = page.getByRole('button', { name: /Submit/i });
    await expect(submitButton).toBeVisible();
  });

  test('should have functional navigation links', async ({ page }) => {
    // Test Living Room link
    const livingRoomLink = page.getByRole('link', { name: /Living Room/i }).first();
    await expect(livingRoomLink).toBeVisible();
    
    // Test Kitchen link
    const kitchenLink = page.getByRole('link', { name: /Kitchen/i }).first();
    await expect(kitchenLink).toBeVisible();
    
    // Test Bedroom link
    const bedroomLink = page.getByRole('link', { name: /Bedroom/i }).first();
    await expect(bedroomLink).toBeVisible();
  });

  test('should have accessible search functionality', async ({ page }) => {
    // Search input should be visible and enabled
    const searchInput = page.getByPlaceholder(/Search for furniture/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
    
    // Can type in search
    await searchInput.fill('sofa');
    await expect(searchInput).toHaveValue('sofa');
  });

  test('should load all images successfully', async ({ page }) => {
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Get all images (excluding icons/logos)
    const images = page.locator('img').filter({ hasNotText: /logo|icon|favicon/i });
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check that images have loaded (not broken)
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const naturalWidth = await img.evaluate((el) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test('should have responsive layout with properly positioned elements', async ({ page }) => {
    // Verify header is at the top
    const header = page.locator('header, nav').first();
    const headerBox = await header.boundingBox();
    expect(headerBox?.y).toBeLessThan(100); // Should be near top
    
    // Verify footer is at the bottom
    const footer = page.locator('footer');
    const footerBox = await footer.boundingBox();
    const viewportHeight = page.viewportSize()?.height || 0;
    expect(footerBox?.y).toBeGreaterThan(viewportHeight * 0.5); // Should be in bottom half
  });

  test('should navigate to sign in page when sign in link is clicked', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /Sign in/i });
    await expect(signInLink).toBeVisible();
    
    // Click and verify navigation
    await signInLink.click();
    await page.waitForURL(/sign-in/i);
    expect(page.url()).toContain('sign-in');
  });

  test('should have clickable shop now button', async ({ page }) => {
    const shopNowButton = page.getByRole('link', { name: /Shop Now/i }).first();
    await expect(shopNowButton).toBeVisible();
    
    // Verify it's a valid link
    const href = await shopNowButton.getAttribute('href');
    expect(href).toBeTruthy();
  });
});
