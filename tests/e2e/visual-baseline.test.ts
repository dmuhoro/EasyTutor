import { test, expect } from '@playwright/test';

const routes = ['/', '/(auth)/login', '/(tabs)/study', '/(tabs)/quiz'];
const viewports = [
  { width: 360, height: 640, label: 'mobile-360' },
  { width: 390, height: 736, label: 'mobile-390' },
  { width: 768, height: 1024, label: 'tablet-768' },
  { width: 1280, height: 800, label: 'desktop-1280' },
];

test.describe('visual baselines', () => {
  for (const route of routes) {
    for (const vp of viewports) {
      for (const theme of ['light', 'dark'] as const) {
        test(`visual: ${route} at ${vp.label} (${theme})`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          if (theme === 'dark') {
            await page.evaluate(() => {
              document.documentElement.classList.add('dark');
            });
          } else {
            await page.evaluate(() => {
              document.documentElement.classList.remove('dark');
            });
          }
          await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);
          await expect(page).toHaveScreenshot({
            fullPage: true,
            maxDiffPixelRatio: 0.01,
          });
        });
      }
    }
  }
});
