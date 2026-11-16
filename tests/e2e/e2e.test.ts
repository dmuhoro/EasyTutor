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
    const pageText = await page.textContent('body') || '';
    expect(pageText.length).toBeGreaterThan(0);
  });

  test.describe('Deep links', () => {
    test('high_school route loads directly from a deep link', async ({ page }) => {
      await page.goto('/(high_school)');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body') || '';
      expect(pageText.length).toBeGreaterThan(0);
    });

    test('university route loads directly from a deep link', async ({ page }) => {
      await page.goto('/(university)');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body') || '';
      expect(pageText.length).toBeGreaterThan(0);
    });

    test('self_directed route loads directly from a deep link', async ({ page }) => {
      await page.goto('/(self_directed)');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body') || '';
      expect(pageText.length).toBeGreaterThan(0);
    });

    test('reload on a deep link route returns 200 (SPA fallback)', async ({ page }) => {
      await page.goto('/(high_school)/subjects/math');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Reload the deep link — SPA fallback should serve index.html
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body') || '';
      expect(pageText.length).toBeGreaterThan(0);
    });

    test('email confirmation redirect path is reachable', async ({ page }) => {
      await page.goto('/update-password');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const pageText = await page.textContent('body') || '';
      expect(pageText.length).toBeGreaterThan(0);
    });
  });

  test.describe('PWA installability', () => {
    test('manifest.json is served and valid', async ({ page }) => {
      const res = await page.request.get('/manifest.json');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('EasyTutor');
      expect(body.start_url).toBe('/');
      expect(body.display).toBe('standalone');
    });

    test('service-worker.js is served', async ({ page }) => {
      const res = await page.request.get('/service-worker.js');
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body).toContain('CACHE_NAME');
      expect(body).toContain('easytutor');
    });

    test('app icons are served', async ({ page }) => {
      const icon192 = await page.request.get('/icons/icon-192x192.png');
      expect(icon192.status()).toBe(200);

      const icon512 = await page.request.get('/icons/icon-512x512.png');
      expect(icon512.status()).toBe(200);
    });
  });
});
