#!/usr/bin/env node
/**
 * Live-proof PREFLIGHT and handover harness. This is NOT a proof runner.
 *
 * It checks the prerequisites for the 10-flow live checklist by NAME and
 * presence only, never prints a credential value, and marks every live flow
 * UNPROVEN with its owner until a human actually performs it on a device.
 *
 * Usage:
 *   node scripts/qa/live_proof_harness.mjs [--require-ready] [--out <path>] [--run-local]
 *
 * `--run-local` runs the repeatable, no-credential checks that back the web
 * checklist (build, bundle guard, 390px E2E smoke, desktop Lighthouse baseline)
 * and fails closed if any of them fails. It never performs a live flow.
 *
 * Inputs (environment names only — values are never echoed):
 *   LIVE_PROOF_USER_FILE   path to a mode-600 JSON file {email,password}
 *                          kept OUTSIDE the repository (e.g. /tmp/opencode/...)
 *   E2E_BASE_URL           reachable app URL for the browser flows
 *   GROQ_SECRET_ATTESTED   'yes' only after the provider secret is confirmed
 *   VERCEL_ACCESS_ATTESTED 'yes' only after browser access is confirmed
 *   ANDROID_SERIAL         optional adb serial; otherwise a single device is used
 *
 * Exit status: 0 for the informational handover report; with --require-ready,
 * 1 if any prerequisite is still BLOCKED; with --run-local, 1 if any local
 * verification command fails.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const requireReady = args.includes('--require-ready');
const runLocal = args.includes('--run-local');
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined;

const FLOW_COUNT = 10;
const CHECKLIST = 'scripts/live-proof-checklist.md';

function blocked(id, detail, owner = 'Daniel') {
  return { id, status: 'BLOCKED', detail, owner };
}
function ready(id, detail) {
  return { id, status: 'READY', detail, owner: '—' };
}

function checkCredentials() {
  const file = process.env.LIVE_PROOF_USER_FILE;
  if (!file) return blocked('test-user', 'LIVE_PROOF_USER_FILE is not set', 'Daniel');
  const full = resolve(file);
  if (full.startsWith(ROOT + '/')) {
    return blocked('test-user', 'credential file must live outside the repository', 'Daniel');
  }
  if (!existsSync(full)) return blocked('test-user', 'credential file does not exist', 'Daniel');
  const mode = statSync(full).mode & 0o777;
  if (mode !== 0o600) return blocked('test-user', 'credential file is not mode 600', 'Daniel');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(full, 'utf8'));
  } catch {
    return blocked('test-user', 'credential file is not valid JSON', 'Daniel');
  }
  if (typeof parsed.email !== 'string' || !parsed.email.trim()
    || typeof parsed.password !== 'string' || !parsed.password.trim()) {
    return blocked('test-user', 'credential file is missing email/password', 'Daniel');
  }
  return ready('test-user', 'credentials present by name; values never read into output');
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

async function checkBaseUrl() {
  const url = process.env.E2E_BASE_URL;
  if (!url) return blocked('browser-access', 'E2E_BASE_URL is not set', 'Daniel');
  const attested = process.env.VERCEL_ACCESS_ATTESTED === 'yes';
  try {
    const response = await withTimeout(fetch(url, { redirect: 'manual' }), 8000);
    if (response.status < 400) return ready('browser-access', `URL responded ${response.status}`);
    if (attested) {
      return ready('browser-access', `operator attested browser access; probe responded ${response.status}`);
    }
    const kind = response.status >= 300 && response.status < 400 ? 'deployment protection/redirect' : 'error';
    return blocked('browser-access', `URL responded ${response.status} (${kind})`, 'Daniel');
  } catch (error) {
    if (attested) return ready('browser-access', `operator attested browser access; probe unreachable (${error?.name ?? 'fetch error'})`);
    return blocked('browser-access', `URL unreachable (${error?.name ?? 'fetch error'})`, 'Daniel');
  }
}

function checkGroqWiring() {
  const sourcePath = resolve(ROOT, 'supabase/functions/ai-proxy/index.ts');
  if (!existsSync(sourcePath)) return blocked('groq-secret', 'ai-proxy source is missing', 'agent');
  const source = readFileSync(sourcePath, 'utf8');
  if (!/Deno\.env\.get\(\s*["']GROQ_API_KEY["']\s*\)/.test(source)) {
    return blocked('groq-secret', 'GROQ_API_KEY lookup is not wired in ai-proxy', 'agent');
  }
  if (process.env.GROQ_SECRET_ATTESTED !== 'yes') {
    return blocked('groq-secret', 'lookup wired; provider secret not yet confirmed', 'Daniel');
  }
  return ready('groq-secret', 'lookup wired; secret confirmed by operator (value never inspected)');
}

function checkAndroid() {
  let output;
  try {
    output = execFileSync('adb', ['devices'], { encoding: 'utf8', timeout: 8000 });
  } catch (error) {
    return blocked('android-device', `adb unavailable (${error?.code ?? 'error'})`, 'Daniel');
  }
  const serials = output.split(/\r?\n/)
    .map((line) => line.split('\t'))
    .filter(([id, state]) => id && state === 'device')
    .map(([id]) => id);
  const preferred = process.env.ANDROID_SERIAL;
  if (preferred && serials.includes(preferred)) return ready('android-device', 'requested adb device is online');
  if (preferred) return blocked('android-device', 'requested adb device is not online', 'Daniel');
  if (serials.length === 1) return ready('android-device', 'one adb device online');
  if (serials.length === 0) return blocked('android-device', 'no adb device online', 'Daniel');
  return blocked('android-device', 'multiple adb devices online; set ANDROID_SERIAL', 'Daniel');
}

const prerequisites = [
  checkCredentials(),
  await checkBaseUrl(),
  checkGroqWiring(),
  checkAndroid(),
];

const flows = Array.from({ length: FLOW_COUNT }, (_, index) => ({
  id: `flow-${index + 1}`,
  status: 'UNPROVEN',
  detail: `Must be performed on device/browser with screenshots per ${CHECKLIST}`,
  owner: 'Daniel',
}));

const report = {
  kind: 'live-proof-preflight',
  generatedAt: new Date().toISOString(),
  proofClaimed: false,
  prerequisites,
  flows,
  note: 'This report records readiness only. No live flow has been executed by this harness.',
};

if (outPath) {
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
}

for (const check of prerequisites) {
  console.log(`${check.status.padEnd(7)} ${check.id.padEnd(16)} ${check.detail} [owner: ${check.owner}]`);
}
console.log(`UNPROVEN ${FLOW_COUNT} live flows — no proof claimed (see ${CHECKLIST}).`);
if (outPath) console.log(`Preflight report written to ${outPath}`);

// Repeatable, credential-free checks that back the web half of the checklist.
// These are real gates; a failure here fails the harness. They still do NOT
// perform any live-network or device flow.
const LOCAL_CHECKS = [
  ['build', 'npm run build'],
  ['bundle-guard', 'npm run guard:dist'],
  ['web-e2e-smoke', 'npm run e2e:smoke'],
  ['desktop-baseline', 'npm run perf:lighthouse'],
];
let localFailed = false;
if (runLocal) {
  console.log('\n--- local web checks (no credentials, no live flows) ---');
  for (const [name, command] of LOCAL_CHECKS) {
    const [bin, ...args] = command.split(' ');
    const result = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit', timeout: 900000 });
    const ok = result.status === 0 && !result.error;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (exit ${result.status ?? 'none'})`);
    if (!ok) localFailed = true;
  }
}

if (localFailed) process.exit(1);
if (requireReady && prerequisites.some((check) => check.status !== 'READY')) process.exit(1);
