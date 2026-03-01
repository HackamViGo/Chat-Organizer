import { test, expect } from '@playwright/test';

test.describe('Extension to Dashboard Sync', () => {
  test('should load dashboard prompts page to verify sync target', async ({ page }) => {
    // For a basic smoke test, verify the dashboard is ready to receive sync data
    await page.goto('http://localhost:3000/prompts');
    
    // Verify Prompt Manager is visible or at least login is redirecting
    // If we're not authenticated, it will redirect to /login
    const url = page.url();
    if (url.includes('/login') || url.includes('/auth/signin')) {
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      await expect(page.getByText(/Prompts/i).first()).toBeVisible();
    }
  });
});
