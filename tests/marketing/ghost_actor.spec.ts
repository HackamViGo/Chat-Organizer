import { test, expect } from '@playwright/test';

// 🎬 SCENE 1: THE MANIFESTO
test('Ghost Actor - Feature Showcase', async ({ page }) => {
  // 1. SETUP: 4K Cinematic Viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // 2. ACTION: Open App (Fade In simulation by waiting)
  await page.goto('http://localhost:3000/'); 
  await page.waitForTimeout(1000); // Dramatic pause

  // 3. FEATURE: The "Vibe" (Theme Toggle)
  // Find the toggle (assuming aria-label or specific class from your code)
  const themeBtn = page.locator('button[aria-label*="Switch to"]');
  await themeBtn.hover();
  await page.waitForTimeout(500);
  await themeBtn.click(); // Light Mode
  await page.waitForTimeout(800); // Let viewer see it
  await themeBtn.click(); // Back to Dark Mode (The Vibe)
  await page.waitForTimeout(1000);

  // 4. FEATURE: "Smart 5" Navigation
  // Hover over the sidebar to trigger expansion
  const sidebar = page.locator('aside');
  await sidebar.hover(); 
  await page.waitForTimeout(500); // Watch it expand

  // Open a Folder (Simulate Double Click)
  // Note: We need a valid folder selector. Using a generic one for the script structure.
  // Ideally, we target by text if we know a folder name.
  // await page.getByText('Backend Docs').dblclick();
  // await page.waitForTimeout(1500); // Absorb the hierarchy change

  // 5. FEATURE: The "One Search"
  const searchInput = page.locator('input[placeholder="Search..."]');
  await searchInput.hover();
  await searchInput.click();
  
  // Human-like Typing (Ghost Vibe)
  await searchInput.pressSequentially('Auth Logic', { delay: 150 }); 
  await page.waitForTimeout(1000); // Let results appear

  // 6. CUT: Hover over result
  // await page.locator('.search-result-item').first().hover();
  await page.waitForTimeout(2000); // End Scene
});
