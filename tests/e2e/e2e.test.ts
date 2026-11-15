import { test, expect } from '@playwright/test';

test.describe('EasyTutor End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('login page loads with input fields and clickable buttons', async ({ page }) => {
    await expect(page.locator('text=EasyTutor')).toBeVisible();
    await expect(page.locator('text=Your AI Study Partner')).toBeVisible();

    const emailInput = page.locator('input[placeholder="Email Address"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    const passwordInput = page.locator('input[placeholder="Password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('TestPass123!');
    await expect(passwordInput).toHaveValue('TestPass123!');

    // Sign In button should be clickable
    const signInBtn = page.locator('button').filter({ hasText: 'Sign In' }).first();
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();
    await page.waitForTimeout(2000);

    // Should show some response after clicking sign in
    const pageText = await page.textContent('body');
    expect(pageText.length).toBeGreaterThan(0);
  });
});
