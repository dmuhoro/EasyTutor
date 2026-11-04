#!/usr/bin/env node
/**
 * Web entry-chunk budget gate.
 *
 * Fails closed when the exported entry chunk exceeds the recorded budget or
 * when route code-splitting has regressed (too few chunks). Run after
 * `npm run build`.
 *
 * Local override for ad-hoc checks:
 *   ENTRY_BUDGET_GZIP_BYTES=1000 node scripts/perf/check-entry-budget.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUNDLE_DIR = path.join(process.cwd(), 'dist/_expo/static/js/web');
const BUDGET_FILE = path.join(process.cwd(), 'perf-budget.json');

const fail = (message) => {
  console.error(`[PERF BUDGET] FAIL: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(BUNDLE_DIR)) {
  fail(`no export found at ${BUNDLE_DIR}. Run \`npm run build\` first.`);
}

const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
const entries = fs.readdirSync(BUNDLE_DIR).filter((f) => /^entry-.*\.js$/.test(f));

if (entries.length !== 1) {
  fail(`expected exactly one entry chunk, found ${entries.length}.`);
}

const entry = entries[0];
const entryPath = path.join(BUNDLE_DIR, entry);
const raw = fs.statSync(entryPath).size;
const gzip = zlib.gzipSync(fs.readFileSync(entryPath), { level: 9 }).length;
const chunks = fs
  .readdirSync(BUNDLE_DIR)
  .filter((f) => f.endsWith('.js') && !f.startsWith('entry-')).length;

const maxGzip = Number(process.env.ENTRY_BUDGET_GZIP_BYTES ?? budget.entryGzipBytes);
const maxRaw = Number(process.env.ENTRY_BUDGET_RAW_BYTES ?? budget.entryRawBytes);

console.log(`[PERF BUDGET] entry ${entry}`);
console.log(`[PERF BUDGET] gzip ${gzip} B (budget ${maxGzip} B)`);
console.log(`[PERF BUDGET] raw  ${raw} B (budget ${maxRaw} B)`);
console.log(`[PERF BUDGET] route chunks ${chunks} (minimum ${budget.minRouteChunks})`);

const violations = [];
if (!Number.isFinite(maxGzip) || gzip > maxGzip) {
  violations.push(`gzip ${gzip} B > ${maxGzip} B`);
}
if (!Number.isFinite(maxRaw) || raw > maxRaw) {
  violations.push(`raw ${raw} B > ${maxRaw} B`);
}
if (chunks < budget.minRouteChunks) {
  violations.push(`route chunks ${chunks} < ${budget.minRouteChunks}`);
}

if (violations.length > 0) {
  fail(violations.join('; '));
}

console.log('[PERF BUDGET] PASS');
