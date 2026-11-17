#!/usr/bin/env node
/**
 * W1-6 — login-route JS transfer ratchet.
 *
 * Measures the real bytes transferred for every JavaScript resource loaded by
 * the exported `/login` route at a 390 px viewport, then fails if the total
 * exceeds `loginRouteTransferredBytes` in `perf-budget.json`.
 *
 * This gate replaces two DEAD budget fields (`loginRouteGzipBytes` and
 * `loginRouteRawBytes`) that no script ever read. A config value nobody reads
 * is not a budget — it is a false sense of protection.
 *
 * Run after `npm run build`:
 *   npm run perf:login-route
 *
 * Ad-hoc override for proving the gate rejects a breach (never used in CI):
 *   LOGIN_TRANSFERRED_BUDGET_BYTES=1000 node scripts/perf/measure-login-route.js
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const BUDGET_FILE = path.join(ROOT, 'perf-budget.json');
const PORT = Number(process.env.LOGIN_MEASURE_PORT || 3113);
const BASE = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 390, height: 736 };

function fail(message) {
  console.error(`[LOGIN BUDGET] FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  fail(`no web export at ${DIST}. Run \`npm run build\` first.`);
}

const budgetConfig = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
const budget = Number(process.env.LOGIN_TRANSFERRED_BUDGET_BYTES ?? budgetConfig.loginRouteTransferredBytes);
if (!Number.isFinite(budget) || budget <= 0) {
  fail(`invalid loginRouteTransferredBytes budget (${budgetConfig.loginRouteTransferredBytes})`);
}

const serveBin = path.join(ROOT, 'node_modules', '.bin', 'serve');
if (!fs.existsSync(serveBin)) {
  fail('`serve` is not installed. Run `npm ci` first.');
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('static server did not become ready within 20 s');
}

async function measure() {
  const server = spawn(serveBin, [DIST, '-p', String(PORT), '--single'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
        .filter((entry) => entry.name.endsWith('.js'))
        .map((entry) => ({
          file: entry.name.split('/').pop(),
          bytes: entry.transferSize,
        }));
      return {
        resources,
        total: resources.reduce((sum, entry) => sum + entry.bytes, 0),
      };
    });
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

(async () => {
  let result;
  try {
    result = await measure();
  } catch (error) {
    fail(`measurement could not run: ${error instanceof Error ? error.message : String(error)}`);
  }

  // A zero/empty measurement means no JS executed — that is a false pass, not a win.
  if (!result.resources.length || result.total <= 0) {
    fail('no JavaScript resources were measured; refusing to treat an empty run as success');
  }

  console.log(`[LOGIN BUDGET] route /login @ ${VIEWPORT.width}px`);
  for (const entry of result.resources) {
    console.log(`[LOGIN BUDGET]   ${entry.file} — ${entry.bytes} B transferred`);
  }
  console.log(`[LOGIN BUDGET] total transferred: ${result.total} B (budget ${budget} B)`);

  if (result.total > budget) {
    fail(`login-route JS transferred ${result.total} B > budget ${budget} B`);
  }
  console.log('[LOGIN BUDGET] PASS');
})().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
