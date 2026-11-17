import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const routes = ['/', '/(auth)/login', '/(tabs)/study', '/(tabs)/quiz'];
const viewports = [
  { width: 360, height: 640, label: '360px' },
  { width: 390, height: 736, label: '390px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1280, height: 800, label: '1280px' },
];

test.describe('axe accessibility audit', () => {
  for (const route of routes) {
    for (const vp of viewports) {
      test(`axe: ${route} at ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`http://localhost:3000${route}`, { waitUntil: 'domcontentloaded' });
        const results = await new AxeBuilder({ page }).analyze();
        const violations = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
        expect(violations).toEqual([]);
      });
    }
  }
});
