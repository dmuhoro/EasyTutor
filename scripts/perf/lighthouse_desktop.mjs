#!/usr/bin/env node
/**
 * Reproducible DESKTOP Lighthouse baseline for the local web export.
 *
 * Serves `dist/` with the declared `serve` dev dependency, drives the declared
 * Playwright Chromium in desktop form factor through Lighthouse's desktop
 * preset, and prints a compact score summary for `/` and `/login`.
 *
 * This is a LOCAL baseline, not a production/Vercel measurement: deployment
 * protection, CDN behaviour and real network latency are not represented.
 *
 * Usage: npm run perf:lighthouse
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = Number(process.env.LIGHTHOUSE_PORT || 4183);
const BASE = `http://127.0.0.1:${PORT}`;
const SERVE = resolve(ROOT, 'node_modules/.bin/serve');
const LH = resolve(ROOT, 'node_modules/.bin/lighthouse');
const ROUTES = ['/', '/login'];

if (!existsSync(resolve(ROOT, 'dist/index.html'))) {
  console.error('FAIL: dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}
for (const binary of [SERVE, LH]) {
  if (!existsSync(binary)) {
    console.error(`FAIL: declared tool missing (${binary}) — run npm ci.`);
    process.exit(1);
  }
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('probe timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const chromePath = process.env.CHROME_PATH || chromium.executablePath();
const tempDir = mkdtempSync(join(tmpdir(), 'easytutor-lighthouse-'));
const server = spawn(SERVE, ['dist', '-p', String(PORT), '--single'], {
  cwd: ROOT,
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await withTimeout(fetch(BASE), 1500);
      if (response.status < 500) return;
    } catch {
      // server still starting
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error('local static server did not start');
}

const METRICS = [
  ['first-contentful-paint', 'FCP'],
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
];

try {
  await waitForServer();
  console.log(`Desktop Lighthouse baseline (local export, preset=desktop, Chrome=${chromePath.split('/').slice(-1)[0]})`);
  for (const route of ROUTES) {
    const reportPath = join(tempDir, `report${route === '/' ? '-root' : '-login'}.json`);
    const result = spawnSync(LH, [
      `${BASE}${route}`,
      '--preset=desktop',
      '--only-categories=performance',
      '--output=json',
      `--output-path=${reportPath}`,
      `--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage`,
      '--quiet',
      '--no-enable-error-reporting',
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000,
      env: { ...process.env, CHROME_PATH: chromePath },
    });
    if (result.status !== 0 || !existsSync(reportPath)) {
      console.error(`FAIL: Lighthouse could not measure ${route} (exit ${result.status})`);
      console.error(result.stderr?.trim() || result.stdout?.trim() || '');
      process.exitCode = 1;
      break;
    }
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const score = Math.round((report.categories?.performance?.score ?? 0) * 100);
    const parts = METRICS.map(([id, label]) => `${label}=${report.audits?.[id]?.displayValue ?? 'n/a'}`);
    console.log(`${route.padEnd(7)} performance=${score}/100  ${parts.join('  ')}`);
  }
} catch (error) {
  console.error(`FAIL: ${error?.message ?? error}`);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  rmSync(tempDir, { recursive: true, force: true });
}
