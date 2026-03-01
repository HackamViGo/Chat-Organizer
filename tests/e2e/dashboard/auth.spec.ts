import { test, expect } from '@playwright/test';

test.describe('Dashboard Auth Flow', () => {
  test('should show login page and allow navigation to signup', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Check if the title is visible
    await expect(page.getByText(/Welcome Back/i).first()).toBeVisible();
    
    // Check for email and password inputs
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Check for sign in button
    const signInButton = page.locator('button[type="submit"]');
    await expect(signInButton).toBeVisible();
  });
});
