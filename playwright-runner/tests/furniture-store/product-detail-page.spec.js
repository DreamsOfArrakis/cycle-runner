const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://shop-app-hazel-one.vercel.app';
const PRODUCT_URL = `${BASE_URL}/shop/recliner-rocker`;

test.describe('Product Detail Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCT_URL);
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load product detail page successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/THE FURNITURE STORE/i);
    expect(page.url()).toContain('recliner-rocker');
    
    // Verify main product heading is visible (use h1 to avoid strict mode violation)
    await expect(page.locator('h1').filter({ hasText: /Recliner Rocker/i })).toBeVisible();
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

  test('should display product title and price', async ({ page }) => {
    // Verify product title (h1)
    const productTitle = page.locator('h1').filter({ hasText: /Recliner Rocker/i });
    await expect(productTitle).toBeVisible();
    
    // Verify product price (use .first() to avoid strict mode violation with related products)
    await expect(page.getByText(/\$499\.00/).first()).toBeVisible();
  });

  test('should display product description', async ({ page }) => {
    // Verify product description text (use .first() to avoid strict mode violation with related products)
    const description = page.getByText(/This manual beige recliner chair is your cozy oasis/i).first();
    await expect(description).toBeVisible();
    
    // Verify description contains key details
    await expect(page.getByText(/360˚ swivel/i).first()).toBeVisible();
    await expect(page.getByText(/rocking motion/i).first()).toBeVisible();
  });

  test('should display product images', async ({ page }) => {
    // Verify main product image is visible
    const mainImage = page.locator('img[alt*="recliner-rocker"]').first();
    await expect(mainImage).toBeVisible();
    
    // Verify image has loaded (not broken)
    const naturalWidth = await mainImage.evaluate((el) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
    
    // Verify thumbnail images are present (if any)
    const thumbnails = page.locator('img').filter({ 
      hasNotText: /logo|icon|favicon/i 
    });
    const imageCount = await thumbnails.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('should display quantity selector with increment and decrement buttons', async ({ page }) => {
    // Verify quantity label is visible
    await expect(page.getByText(/Quantity/i)).toBeVisible();
    
    // Verify quantity input field
    const quantityInput = page.getByLabel(/quantity/i).or(page.locator('input[type="number"][name="quantity"]'));
    await expect(quantityInput.first()).toBeVisible();
    await expect(quantityInput.first()).toHaveValue('1');
    
    // Verify decrement button (minus)
    const minusButton = page.getByRole('button', { name: /minus/i }).or(
      page.locator('button[aria-label*="minus" i]')
    );
    await expect(minusButton.first()).toBeVisible();
    await expect(minusButton.first()).toBeEnabled();
    
    // Verify increment button (plus)
    const plusButton = page.getByRole('button', { name: /add/i }).or(
      page.locator('button[aria-label*="add" i]')
    );
    await expect(plusButton.first()).toBeVisible();
    await expect(plusButton.first()).toBeEnabled();
  });

  test('should allow quantity to be changed', async ({ page }) => {
    const quantityInput = page.getByLabel(/quantity/i).or(page.locator('input[type="number"][name="quantity"]')).first();
    
    // Test incrementing quantity
    const plusButton = page.getByRole('button', { name: /add/i }).or(
      page.locator('button[aria-label*="add" i]')
    ).first();
    await plusButton.click();
    await expect(quantityInput).toHaveValue('2');
    
    // Test decrementing quantity
    const minusButton = page.getByRole('button', { name: /minus/i }).or(
      page.locator('button[aria-label*="minus" i]')
    ).first();
    await minusButton.click();
    await expect(quantityInput).toHaveValue('1');
  });

  test('should display Add to Cart button', async ({ page }) => {
    const addToCartButton = page.getByRole('button', { name: /Add to Cart/i });
    await expect(addToCartButton).toBeVisible();
    await expect(addToCartButton).toBeEnabled();
  });

  test('should display Buy Now button', async ({ page }) => {
    const buyNowButton = page.getByRole('button', { name: /Buy Now/i });
    await expect(buyNowButton).toBeVisible();
    await expect(buyNowButton).toBeEnabled();
  });

  test('should display wishlist button on product page', async ({ page }) => {
    // Find wishlist button (heart icon) near the product title
    const wishlistButtons = page.locator('button').filter({ 
      has: page.locator('svg[class*="heart"]')
    });
    const buttonCount = await wishlistButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify at least one wishlist button is visible and enabled
    await expect(wishlistButtons.first()).toBeVisible();
    await expect(wishlistButtons.first()).toBeEnabled();
  });

  test('should display accordion sections for product information', async ({ page }) => {
    // Verify Product Details accordion
    const productDetailsButton = page.getByRole('button', { name: /Product Details/i });
    await expect(productDetailsButton).toBeVisible();
    
    // Verify Technical Information accordion
    const technicalInfoButton = page.getByRole('button', { name: /Technical Information/i });
    await expect(technicalInfoButton).toBeVisible();
    
    // Verify Shipping & Returns accordion
    const shippingReturnsButton = page.getByRole('button', { name: /Shipping & Returns/i });
    await expect(shippingReturnsButton).toBeVisible();
  });

  test('should allow expanding and collapsing accordion sections', async ({ page }) => {
    // Click on Product Details accordion
    const productDetailsButton = page.getByRole('button', { name: /Product Details/i });
    await productDetailsButton.click();
    
    // Verify accordion expands (aria-expanded should be true)
    await expect(productDetailsButton).toHaveAttribute('aria-expanded', 'true');
    
    // Click again to collapse
    await productDetailsButton.click();
    
    // Verify accordion collapses (aria-expanded should be false)
    await expect(productDetailsButton).toHaveAttribute('aria-expanded', 'false');
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
      /Stockholm Sofa/i
    ];
    
    for (const title of relatedProductTitles) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test('should navigate to related product when clicked', async ({ page }) => {
    // Click on a related product
    const relatedProductLink = page.getByRole('link', { name: /Bathroom Oak Vanity/i }).first();
    await expect(relatedProductLink).toBeVisible();
    
    // Click and verify navigation
    await relatedProductLink.click();
    await page.waitForURL(/\/shop\/bathroom-oak-vanity/);
    expect(page.url()).toContain('bathroom-oak-vanity');
  });

  test('should display Product Comments section', async ({ page }) => {
    // Verify comments section heading
    await expect(page.getByRole('heading', { name: /Product Comments/i })).toBeVisible();
    
    // Verify "There is no Comment" message (or comment form if comments exist)
    const noCommentMessage = page.getByText(/There is no Comment/i);
    const commentForm = page.locator('form').filter({ hasText: /comment/i });
    
    const hasNoComment = await noCommentMessage.isVisible().catch(() => false);
    const hasCommentForm = await commentForm.isVisible().catch(() => false);
    
    // At least one should be visible
    expect(hasNoComment || hasCommentForm).toBe(true);
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
    
    // Verify product title is visible and positioned correctly (use h1 to avoid strict mode violation)
    const productTitle = page.locator('h1').filter({ hasText: /Recliner Rocker/i });
    await expect(productTitle).toBeVisible();
    
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

  test('should navigate back to shop page when logo is clicked', async ({ page }) => {
    const logo = page.getByRole('link', { name: /THE FURNITURE STORE/i }).first();
    await expect(logo).toBeVisible();
    
    // Click logo and verify navigation
    await logo.click();
    await page.waitForURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/shop)?$`));
    expect(page.url()).toMatch(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/shop)?$`));
  });

  test('should allow manual quantity input', async ({ page }) => {
    const quantityInput = page.getByLabel(/quantity/i).or(page.locator('input[type="number"][name="quantity"]')).first();
    
    // Clear and type a new quantity
    await quantityInput.fill('5');
    await expect(quantityInput).toHaveValue('5');
    
    // Verify it accepts valid numbers
    await quantityInput.fill('10');
    await expect(quantityInput).toHaveValue('10');
  });

  test('should have accessible form elements', async ({ page }) => {
    // Verify quantity input has proper label
    const quantityLabel = page.getByText(/Quantity/i);
    await expect(quantityLabel).toBeVisible();
    
    // Verify buttons have accessible names
    const addToCartButton = page.getByRole('button', { name: /Add to Cart/i });
    await expect(addToCartButton).toBeVisible();
    
    const buyNowButton = page.getByRole('button', { name: /Buy Now/i });
    await expect(buyNowButton).toBeVisible();
  });
});

