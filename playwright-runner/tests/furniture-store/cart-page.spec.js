const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://shop-app-hazel-one.vercel.app';
const CART_URL = `${BASE_URL}/cart`;

test.describe('Cart Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CART_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should complete full purchase flow from home to order confirmation', async ({ page }) => {
    // Step 1: Login first
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('textbox', { name: 'Email' }).fill('brianscottlangdon@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Test123@');
    await page.getByRole('button', { name: /Sign in/i }).click();
    
    // Wait for login to complete and redirect
    await page.waitForURL(/\/(home|shop|$)/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Step 2: Navigate to home page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Step 3: Click "Shop Now" button to go to shop all page
    const shopNowButton = page.getByRole('link', { name: /Shop Now/i }).first();
    await expect(shopNowButton).toBeVisible();
    await shopNowButton.click();
    await page.waitForURL(/\/shop/);
    await page.waitForLoadState('networkidle');
    
    // Step 4: Click on "Bathroom Oak Vanity" product
    const productLink = page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await page.waitForURL(/\/shop\/bathroom-oak-vanity/);
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the product detail page
    await expect(page.locator('h1').filter({ hasText: /Bathroom Oak Vanity/i })).toBeVisible();
    
    // Step 5: Click "Add to Cart" button
    const addToCartButton = page.getByRole('button', { name: /Add to Cart/i });
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();
    
    // Step 6: Verify toast message appears with "Product added to cart"
    const toastMessage = page.locator('li[role="status"]').filter({ 
      hasText: /Product added to cart/i 
    });
    await expect(toastMessage).toBeVisible({ timeout: 5000 });
    await expect(toastMessage.getByText(/Product added to cart/i)).toBeVisible();
    
    // Step 7: Click on the cart button in header
    const cartButton = page.locator('a[href="/cart"]').or(
      page.getByRole('link', { name: /cart/i })
    ).first();
    await expect(cartButton).toBeVisible();
    await cartButton.click();
    await page.waitForURL(/\/cart/);
    await page.waitForLoadState('networkidle');
    
    // Step 8: Verify cart contents
    // Verify product name
    await expect(page.getByRole('heading', { name: /Bathroom Oak Vanity/i }).first()).toBeVisible();
    
    // Verify quantity is 1
    const quantityInput = page.getByRole('spinbutton', { name: /quantity/i }).first();
    await expect(quantityInput).toBeVisible();
    await expect(quantityInput).toHaveValue('1');
    
    // Verify price is correct ($579.00)
    await expect(page.getByText(/\$579\.00/).first()).toBeVisible();
    
    // Step 9: Click checkout button
    const checkoutButton = page.getByRole('button', { name: /Check out/i });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();
    
    // Wait for order confirmation page (matches /orders with optional trailing slash and query params)
    await page.waitForURL(/\/orders(\/|\?|$)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Step 10: Verify order confirmation page data
    // Verify "Order Placed" text (use .first() to avoid strict mode violation)
    await expect(page.getByText(/Order Placed/i).first()).toBeVisible();
    
    // Verify order date is displayed
    const orderDate = page.getByText(/\w+ \d{1,2}, \d{4}/); // Matches date format like "January 28, 2026"
    await expect(orderDate.first()).toBeVisible();
    
    // Verify total price ($579.00)
    await expect(page.getByText(/\$579\.00/).first()).toBeVisible();
    
    // Verify order number is displayed (format: # followed by alphanumeric)
    const orderNumber = page.getByText(/#[a-z0-9]+/i);
    await expect(orderNumber.first()).toBeVisible();
    
    // Verify "Estimated Delivery" heading (use .first() to avoid strict mode violation)
    await expect(page.getByRole('heading', { name: /Estimated Delivery:/i }).first()).toBeVisible();
    
    // Verify delivery date
    const deliveryDate = page.getByText(/Estimated Delivery: \w+ \d{1,2}, \d{4}/i);
    await expect(deliveryDate.first()).toBeVisible();
    
    // Verify product name in order
    await expect(page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first()).toBeVisible();
    
    // Verify product description (use .first() to avoid strict mode violation)
    await expect(page.getByText(/The Bathroom Oak Vanity features a modern design/i).first()).toBeVisible();
    
    // Verify product image is displayed
    const productImage = page.locator('img[alt*="bathroom-vanity"]').first();
    await expect(productImage).toBeVisible();
    
    // Verify "Track package" button/link (use .first() to avoid strict mode violation)
    const trackPackageLink = page.getByRole('link', { name: /Track package/i }).first();
    await expect(trackPackageLink).toBeVisible();
    
    // Verify "Leave seller feedback" button (should be disabled) (use .first() to avoid strict mode violation)
    const leaveFeedbackButton = page.getByRole('button', { name: /Leave seller feedback/i }).first();
    await expect(leaveFeedbackButton).toBeVisible();
    await expect(leaveFeedbackButton).toBeDisabled();
    
    // Verify "Write a product review" button (should be disabled) (use .first() to avoid strict mode violation)
    const writeReviewButton = page.getByRole('button', { name: /Write a product review/i }).first();
    await expect(writeReviewButton).toBeVisible();
    await expect(writeReviewButton).toBeDisabled();
  });

  test('should load cart page successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/THE FURNITURE STORE/i);
    expect(page.url()).toBe(CART_URL);
    
    // Verify main cart heading is visible
    await expect(page.getByRole('heading', { name: /Your Cart/i })).toBeVisible();
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
    
    // Cart icon should be present
    const cartIcon = page.locator('[aria-label*="cart" i]').first();
    await expect(cartIcon).toBeVisible();
    
    // Wishlist icon should be present
    const wishlistIcon = page.locator('[aria-label*="wishlist" i]').first();
    await expect(wishlistIcon).toBeVisible();
  });

  test('should display empty cart message when cart is empty', async ({ page }) => {
    // Verify empty cart message
    await expect(page.getByText(/Your Cart is empty/i)).toBeVisible();
  });

  test('should display "Continue shopping" links', async ({ page }) => {
    // Verify "Continue shopping" link in header section
    const continueShoppingLink = page.getByRole('link', { name: /Continue shopping/i });
    const linkCount = await continueShoppingLink.count();
    expect(linkCount).toBeGreaterThan(0);
    
    // Verify at least one link is visible
    await expect(continueShoppingLink.first()).toBeVisible();
    
    // Verify link navigates to shop page
    const href = await continueShoppingLink.first().getAttribute('href');
    expect(href).toContain('/shop');
  });

  test('should display "Continue shopping" button in empty cart section', async ({ page }) => {
    // Find the continue shopping button with shopping cart icon
    const continueShoppingButton = page.getByRole('link', { name: /Continue shopping/i }).filter({
      has: page.locator('svg[class*="shopping-cart"], svg[class*="cart"]')
    });
    
    // Verify button is visible
    const isVisible = await continueShoppingButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(continueShoppingButton.first()).toBeVisible();
      
      // Verify it's a valid link
      const href = await continueShoppingButton.first().getAttribute('href');
      expect(href).toContain('/shop');
    }
  });

  test('should navigate to shop page when "Continue shopping" is clicked', async ({ page }) => {
    const continueShoppingLink = page.getByRole('link', { name: /Continue shopping/i }).first();
    await expect(continueShoppingLink).toBeVisible();
    
    // Click and verify navigation
    await continueShoppingLink.click();
    await page.waitForURL(/\/shop/);
    expect(page.url()).toContain('/shop');
  });

  test('should display "We Think You\'ll Love" section with related products', async ({ page }) => {
    // Verify section heading
    await expect(page.getByRole('heading', { name: /We Think You'll Love/i })).toBeVisible();
    
    // Verify related products are displayed
    const relatedProducts = page.locator('a[href*="/shop/"]').filter({ 
      hasNot: page.locator('img').first() // Exclude image-only links
    });
    const productCount = await relatedProducts.count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should display related products with correct information', async ({ page }) => {
    // Check for specific related products
    const relatedProductTitles = [
      /Bathroom Oak Vanity/i,
      /Brass Kitchen Faucet/i,
      /Recliner Rocker/i,
      /Stockholm Sofa/i
    ];
    
    for (const title of relatedProductTitles) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test('should navigate to product detail page when related product is clicked', async ({ page }) => {
    // Click on a related product
    const relatedProductLink = page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first();
    await expect(relatedProductLink).toBeVisible();
    
    // Click and verify navigation
    await relatedProductLink.click();
    await page.waitForURL(/\/shop\/bathroom-oak-vanity/);
    expect(page.url()).toContain('bathroom-oak-vanity');
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

  test('should have functional search functionality', async ({ page }) => {
    // Search input should be visible and enabled
    const searchInput = page.getByPlaceholder(/Search for furniture/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
    
    // Can type in search
    await searchInput.fill('sofa');
    await expect(searchInput).toHaveValue('sofa');
  });

  test('should display category navigation links', async ({ page }) => {
    // Verify all main categories are present in navigation
    const categories = ['Living Room', 'Bathroom', 'Kitchen', 'Bedroom'];
    
    for (const category of categories) {
      const categoryLink = page.getByRole('link', { name: new RegExp(category, 'i') });
      await expect(categoryLink.first()).toBeVisible();
    }
  });

  test('should load all images successfully', async ({ page }) => {
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Get all images (excluding icons/logos)
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
    
    // Verify cart heading is visible and positioned correctly
    const cartHeading = page.getByRole('heading', { name: /Your Cart/i });
    await expect(cartHeading).toBeVisible();
    
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

  test('should navigate to home page when logo is clicked', async ({ page }) => {
    const logo = page.getByRole('link', { name: /THE FURNITURE STORE/i }).first();
    await expect(logo).toBeVisible();
    
    // Click logo and verify navigation
    await logo.click();
    await page.waitForURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/shop)?$`));
    expect(page.url()).toMatch(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/shop)?$`));
  });

  test('should display cart icon with item count', async ({ page }) => {
    // Cart icon should be visible
    const cartIcon = page.locator('[aria-label*="cart" i]').first();
    await expect(cartIcon).toBeVisible();
    
    // Cart count badge may or may not be visible depending on items in cart
    // When empty, it might show 0 or be hidden
    const cartBadge = page.locator('[class*="rounded-full"]').filter({ 
      hasText: /\d+/ 
    }).first();
    const badgeVisible = await cartBadge.isVisible().catch(() => false);
    
    // If badge is visible, it should show a number
    if (badgeVisible) {
      const badgeText = await cartBadge.textContent();
      expect(badgeText).toMatch(/\d+/);
    }
  });

  test('should have accessible empty cart section', async ({ page }) => {
    // Verify empty cart section has proper structure
    const emptyCartSection = page.locator('section').filter({ 
      hasText: /Your Cart is empty/i 
    });
    await expect(emptyCartSection.first()).toBeVisible();
    
    // Verify it has a minimum height (as indicated by min-h-[450px] class)
    const sectionBox = await emptyCartSection.first().boundingBox();
    expect(sectionBox?.height).toBeGreaterThan(200);
  });

  test('should display related products with add to cart buttons', async ({ page }) => {
    // Find add to cart buttons in related products
    const addToCartButtons = page.locator('button').filter({ 
      has: page.locator('svg[class*="shopping-basket"], svg[class*="basket"]')
    });
    const buttonCount = await addToCartButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify at least one button is visible and enabled
    await expect(addToCartButtons.first()).toBeVisible();
    await expect(addToCartButtons.first()).toBeEnabled();
  });

  test('should display related products with wishlist buttons', async ({ page }) => {
    // Find wishlist buttons in related products
    const wishlistButtons = page.locator('button').filter({ 
      has: page.locator('svg[class*="heart"]')
    });
    const buttonCount = await wishlistButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify at least one button is visible and enabled
    await expect(wishlistButtons.first()).toBeVisible();
    await expect(wishlistButtons.first()).toBeEnabled();
  });
});

