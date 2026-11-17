const { defineConfig, devices } = require('@playwright/test');

/**
 * W1-5 — Phase 1 DONE demo config.
 *
 * Dev-only test tooling. Runs the REAL exported web app (dist/) at 390 px
 * against the REAL local Supabase stack, with a deterministic stub at the
 * app -> ai-proxy HTTP boundary. No product code or product guard is changed.
 *
 * Run after `npm run build`: npm run e2e:full
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: ['coreLoop.demo.spec.ts'],
  // A full sign-up -> onboard -> answer -> offline/online walkthrough is slower
  // than a unit test. This is a NEW suite; no existing test timeout is raised.
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3002',
    ...devices['Pixel 5'],
    viewport: { width: 390, height: 736 },
  },
  webServer: {
    command: 'npx serve dist -p 3002 --single',
    url: 'http://127.0.0.1:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
