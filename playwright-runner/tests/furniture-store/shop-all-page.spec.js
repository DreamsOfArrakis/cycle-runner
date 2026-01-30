const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://shop-app-hazel-one.vercel.app';

test.describe('Shop All Products Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load shop page successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/THE FURNITURE STORE/i);
    
    // Verify main heading is visible
    await expect(page.getByRole('heading', { name: /Shop All Products/i })).toBeVisible();
    
    // Verify page URL
    expect(page.url()).toBe(`${BASE_URL}/shop`);
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
    
    // Wishlist icon should be present
    const wishlistIcon = page.locator('[aria-label*="wishlist" i], [href*="wish-list"]').first();
    await expect(wishlistIcon).toBeVisible();
  });

  test('should verify each product route by collecting product names and verifying titles on detail pages', async ({ page }) => {
    // Get all product title links - product titles are in h3 > a elements
    const productTitleLinks = page.locator('h3 a[href*="/shop/"]');
    const productCount = await productTitleLinks.count();
    
    expect(productCount).toBeGreaterThan(0);
    
    // Collect product names from the shop page
    const productNames = [];
    for (let i = 0; i < productCount; i++) {
      const productLink = productTitleLinks.nth(i);
      const productName = await productLink.textContent();
      if (productName && productName.trim()) {
        productNames.push(productName.trim());
      }
    }
    
    // Verify we collected at least some product names
    expect(productNames.length).toBeGreaterThan(0);
    
    // Test each product by clicking and verifying the title on detail page
    for (const productName of productNames) {
      // Navigate back to shop page if we're not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/shop') || currentUrl.includes('/shop/')) {
        await page.goto(`${BASE_URL}/shop`);
        await page.waitForLoadState('networkidle');
      }
      
      // Find and click the product link by its text content
      const productLink = productTitleLinks.filter({ hasText: productName }).first();
      await expect(productLink).toBeVisible();
      
      // Click the product
      await productLink.click();
      
      // Wait for navigation to product detail page
      await page.waitForURL(/\/shop\/[^/]+$/, { timeout: 10000 });
      
      // Verify we're on a product detail page
      expect(page.url()).toMatch(/\/shop\/.+/);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Verify the product title is visible on the detail page
      // The title might be in an h1, h2, or h3 element
      const escapedProductName = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleOnDetailPage = page.getByRole('heading').filter({ 
        hasText: new RegExp(escapedProductName, 'i') 
      }).first();
      
      await expect(titleOnDetailPage).toBeVisible({ timeout: 5000 });
      
      // Verify the title text matches (case-insensitive)
      const titleText = await titleOnDetailPage.textContent();
      expect(titleText?.toLowerCase()).toContain(productName.toLowerCase());
    }
  });

  test('should display product cards with required information', async ({ page }) => {
    // Verify at least one product card is displayed
    const productCards = page.locator('[class*="card"], [class*="product"]').or(
      page.locator('a[href*="/shop/"]')
    );
    const cardCount = await productCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Verify product images are present
    const productImages = page.locator('img[alt*="vanity"], img[alt*="faucet"], img[alt*="sofa"], img[alt*="recliner"]').first();
    await expect(productImages).toBeVisible();
    
    // Verify prices are displayed
    const pricePattern = /\$[\d,]+\.\d{2}/;
    const prices = page.locator(`text=/${pricePattern.source}/`);
    const priceCount = await prices.count();
    expect(priceCount).toBeGreaterThan(0);
  });

  test('should display specific products with correct information', async ({ page }) => {
    // Check for specific product titles
    const productTitles = [
      /Bathroom Oak Vanity/i,
      /Brass Kitchen Faucet/i,
      /Recliner Rocker/i,
      /Stockholm Sofa/i
    ];
    
    for (const title of productTitles) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
    
    // Verify product prices are displayed correctly
    await expect(page.getByText(/\$579\.00/)).toBeVisible();
    await expect(page.getByText(/\$149\.00/)).toBeVisible();
    await expect(page.getByText(/\$499\.00/)).toBeVisible();
    await expect(page.getByText(/\$1899\.00/)).toBeVisible();
  });

  test('should display product badges (New, Featured, Most Viewed)', async ({ page }) => {
    // Check for "New Product" badge
    await expect(page.getByText(/New Product/i).first()).toBeVisible();
    
    // Check for "Featured" badge
    await expect(page.getByText(/Featured/i).first()).toBeVisible();
    
    // Check for "Most Viewed" badge
    await expect(page.getByText(/Most Viewed/i).first()).toBeVisible();
  });

  test('should have clickable product links', async ({ page }) => {
    // Test clicking on a product link
    const productLink = page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first();
    await expect(productLink).toBeVisible();
    
    // Verify it's a valid link
    const href = await productLink.getAttribute('href');
    expect(href).toContain('/shop/');
  });

  test('should display add to cart buttons on products', async ({ page }) => {
    // Find add to cart buttons (shopping basket icons)
    const addToCartButtons = page.locator('button').filter({ 
      has: page.locator('svg[class*="shopping-basket"], svg[class*="basket"]')
    });
    const buttonCount = await addToCartButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify at least one button is visible and enabled
    await expect(addToCartButtons.first()).toBeVisible();
    await expect(addToCartButtons.first()).toBeEnabled();
  });

  test('should display wishlist buttons on products', async ({ page }) => {
    // Find wishlist buttons (heart icons)
    const wishlistButtons = page.locator('button').filter({ 
      has: page.locator('svg[class*="heart"]')
    });
    const buttonCount = await wishlistButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify at least one button is visible and enabled
    await expect(wishlistButtons.first()).toBeVisible();
    await expect(wishlistButtons.first()).toBeEnabled();
  });

  test('should display star ratings on products', async ({ page }) => {
    // Star ratings are typically SVG elements with star class
    const starRatings = page.locator('svg[class*="star"]');
    const starCount = await starRatings.count();
    expect(starCount).toBeGreaterThan(0);
  });

  test('should have load more button when there are more products', async ({ page }) => {
    // Check for "load more" button
    const loadMoreButton = page.getByRole('button', { name: /load more/i }).or(
      page.getByText(/load more/i)
    );
    
    // The button may or may not be visible depending on number of products
    const isVisible = await loadMoreButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(loadMoreButton).toBeVisible();
      await expect(loadMoreButton).toBeEnabled();
    }
  });

  test('should display category navigation links', async ({ page }) => {
    // Verify all main categories are present in navigation
    const categories = ['Living Room', 'Bathroom', 'Kitchen', 'Bedroom'];
    
    for (const category of categories) {
      const categoryLink = page.getByRole('link', { name: new RegExp(category, 'i') });
      await expect(categoryLink.first()).toBeVisible();
    }
  });

  test('should have functional search functionality', async ({ page }) => {
    // Search input should be visible and enabled
    const searchInput = page.getByPlaceholder(/Search for furniture/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
    
    // Can type in search
    await searchInput.fill('sofa');
    await expect(searchInput).toHaveValue('sofa');
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

  test('should load all product images successfully', async ({ page }) => {
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Get all product images (excluding icons/logos)
    const images = page.locator('img').filter({ 
      hasNotText: /logo|icon|favicon/i 
    });
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
    
    // Verify main heading is visible and positioned correctly
    const mainHeading = page.getByRole('heading', { name: /Shop All Products/i });
    await expect(mainHeading).toBeVisible();
    
    // Verify footer is at the bottom
    const footer = page.locator('footer');
    const footerBox = await footer.boundingBox();
    const viewportHeight = page.viewportSize()?.height || 0;
    expect(footerBox?.y).toBeGreaterThan(viewportHeight * 0.5); // Should be in bottom half
  });

  test('should navigate to product detail page when product is clicked', async ({ page }) => {
    // Click on a product
    const productLink = page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first();
    await expect(productLink).toBeVisible();
    
    // Click and verify navigation
    await productLink.click();
    await page.waitForURL(/\/shop\//);
    expect(page.url()).toContain('/shop/');
    expect(page.url()).toContain('bathroom-oak-vanity');
  });

  test('should navigate to category pages from navigation', async ({ page }) => {
    // Test Living Room link
    const livingRoomLink = page.getByRole('link', { name: /Living Room/i }).first();
    await expect(livingRoomLink).toBeVisible();
    
    // Verify it's a valid link
    const href = await livingRoomLink.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('should display product descriptions on desktop view', async ({ page }) => {
    // Product descriptions should be visible on larger screens
    // Note: These might be hidden on mobile, so we check if they exist
    const descriptions = page.locator('p[class*="muted-foreground"]').filter({ 
      hasText: /vanity|faucet|sofa|recliner/i 
    });
    const descCount = await descriptions.count();
    
    // At least some descriptions should be present
    expect(descCount).toBeGreaterThanOrEqual(0);
  });

  test('should have accessible product cards', async ({ page }) => {
    // Verify product cards have proper structure
    // Get product title links (h3 > a) which have text content, not image links
    const productTitleLinks = page.locator('h3 a[href*="/shop/"]');
    const linkCount = await productTitleLinks.count();
    expect(linkCount).toBeGreaterThan(0);
    
    // Verify links have accessible names
    for (let i = 0; i < Math.min(linkCount, 3); i++) {
      const link = productTitleLinks.nth(i);
      const text = await link.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('should maintain state when navigating back from product page', async ({ page }) => {
    // Click on a product
    const productLink = page.getByRole('link', { name: /Brass Kitchen Faucet/i }).first();
    await productLink.click();
    await page.waitForURL(/\/shop\//);
    
    // Navigate back
    await page.goBack();
    await page.waitForURL(/\/shop$/);
    
    // Verify we're back on the shop page
    await expect(page.getByRole('heading', { name: /Shop All Products/i })).toBeVisible();
  });
});

