const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ecommerce-playground.lambdatest.io';

test.describe.serial('Authentication Tests', () => {

  // Generate unique email with timestamp
  const timestamp = Date.now();
  const email = `contact+lambdatest${timestamp}@cyclerunner.com`;

  test('register a new user and logout', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=account/register`);
    await page.getByRole('textbox', { name: 'First Name*' }).click();
    await page.getByRole('textbox', { name: 'First Name*' }).fill('Tester');
    await page.getByRole('textbox', { name: 'Last Name*' }).click();
    await page.getByRole('textbox', { name: 'Last Name*' }).fill('Testington');
    await page.getByRole('textbox', { name: 'E-Mail*' }).click();
    await page.getByRole('textbox', { name: 'E-Mail*' }).fill(email);
    await page.getByRole('textbox', { name: 'Telephone*' }).click();
    await page.getByRole('textbox', { name: 'Telephone*' }).fill('8055555555');
    await page.getByRole('textbox', { name: 'Password*' }).click();
    await page.getByRole('textbox', { name: 'Password*' }).fill('Test123@');
    await page.getByRole('textbox', { name: 'Password Confirm*' }).click();
    await page.getByRole('textbox', { name: 'Password Confirm*' }).fill('Test123@');
    await page.getByText('I have read and agree to the').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Verify redirect to success page
    await page.waitForURL(`${BASE_URL}/index.php?route=account/success`, { timeout: 10000 });
    
    // Verify success message is displayed
    await expect(page.getByText('Your Account Has Been Created!')).toBeVisible();
    
    // click logout
    await page.getByRole('link', { name: ' Logout', exact: true }).click(); 
    // Verify logout success message
    await expect(page.getByText('You have been logged off your')).toBeVisible();
  });

  test('login with registered credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.php?route=account/login`);
    
    // Fill in login form using input names from the form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Test123@');
    await page.click('input[type="submit"][value="Login"]');
    
    // Verify redirect to account page
    await page.waitForURL(`${BASE_URL}/index.php?route=account/account`, { timeout: 10000 });
    
    // Verify breadcrumb element is visible
    await expect(page.locator('li.breadcrumb-item.active[aria-current="page"]:has-text("Account")')).toBeVisible();
  });

  test('forgot password link and email confirmation', async ({ page }) => {
    await page.goto('https://ecommerce-playground.lambdatest.io/index.php?route=account/login');
    await page.getByRole('link', { name: 'Forgotten Password', exact: true }).click();
    await page.getByRole('textbox', { name: 'E-Mail Address*' }).fill("invalid@email.com");
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Warning: The E-Mail Address')).toBeVisible();
    await page.getByRole('textbox', { name: 'E-Mail Address*' }).fill(email);
    await page.getByRole('button', { name: 'Continue' }).click(); // click continue
    await expect(page.getByText('An email with a confirmation link has been sent your email address.')).toBeVisible();
  });
});

