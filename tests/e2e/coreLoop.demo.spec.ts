/**
 * W1-5 — Phase 1 DONE demo (real browser, real local Supabase, deterministic AI stub).
 *
 * Dev-only test tooling, NOT part of the hermetic `npm test` suite. Run with
 * `npm run e2e:full` after `npm run build`. See docs/evidence/wave1-5-demo.md.
 *
 * Harness honesty:
 *  - The product's fail-closed `isValidSupabaseUrl` guard (https only) is left
 *    untouched. Because the local stack is plain HTTP, this test rewrites ONLY
 *    the embedded URL scheme in the delivered JS bundle and routes those
 *    requests down to the real local HTTP Supabase. All app code is the real
 *    built artifact; auth and DB are real.
 *  - The ai-proxy edge function needs a provider key and is not deployed
 *    locally, so the app -> proxy HTTP response is stubbed deterministically.
 *    The real app code still runs. This is a boundary stub, NOT a claim that
 *    Groq was called.
 *  - No key, JWT, token or token-bearing URL is printed or persisted.
 *  - The PWA service worker and HTTP cache are disabled in this harness context
 *    so an unrewritten bundle cannot be served on reload. Production is untouched.
 */
import { test, expect, type BrowserContext, type Page, type Response } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../..');
const APP_ORIGIN = process.env.E2E_APP_ORIGIN || 'http://127.0.0.1:3002';

type Json = Record<string, any>;

function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const envFile = readEnvFile();
const SUPABASE_HTTP = (process.env.E2E_SUPABASE_URL || envFile.EXPO_PUBLIC_SUPABASE_URL || '')
  .replace(/\/+$/, '');
const SUPABASE_HTTPS = SUPABASE_HTTP.replace(/^http:/, 'https:');
const ANON = process.env.E2E_SUPABASE_ANON_KEY || envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function serviceJwt(): string {
  const secret = process.env.E2E_JWT_SECRET || (() => {
    const container = process.env.E2E_AUTH_CONTAINER || 'supabase_auth_easytutor';
    const authEnv = execFileSync('docker',
      ['inspect', container, '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
      { encoding: 'utf8' });
    return authEnv.split('\n')
      .find((line) => line.startsWith('GOTRUE_JWT_SECRET='))
      ?.slice('GOTRUE_JWT_SECRET='.length) || '';
  })();
  expect(secret).toBeTruthy();
  const b64 = (o: Json) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ role: 'service_role', iss: 'supabase-demo', aud: 'authenticated',
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
}

const SERVICE = serviceJwt();
const counters = { bundleRewrites: 0, apiCalls: 0, routeFailures: 0 };

async function installHarness(page: Page): Promise<void> {
  // (1) Rewrite ONLY the embedded URL scheme in the delivered JS bundle.
  await page.route('**/_expo/static/js/web/*.js', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    if (body.includes(SUPABASE_HTTP)) {
      body = body.split(SUPABASE_HTTP).join(SUPABASE_HTTPS);
      counters.bundleRewrites++;
    }
    await route.fulfill({ response: res, body });
  });

  // (2) Rewrite the fake HTTPS Supabase requests down to the real local HTTP stack.
  // An aborted/failed fetch must be answered explicitly: leaving the route
  // pending holds the browser request open forever, which stalls auth/profile
  // boot and leaves the app on the skeleton with no test-visible failure.
  await page.route(`${SUPABASE_HTTPS}/**`, async (route) => {
    counters.apiCalls++;
    const realUrl = route.request().url().replace(/^https:/, 'http:');
    try {
      const res = await route.fetch({ url: realUrl });
      await route.fulfill({ response: res });
    } catch {
      counters.routeFailures++;
      await route.abort('failed').catch(() => undefined);
    }
  });
}

async function profileRow(email: string): Promise<Json | null> {
  const url = `${SUPABASE_HTTP}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email,learning_mode,onboarding_complete`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Json[];
  return rows[0] ?? null;
}

test.describe.serial('W1-5 Phase 1 DONE demo — 390px real Supabase', () => {
  let context: BrowserContext;
  let page: Page;
  const email = `w15-demo-${Date.now()}@example.test`;
  const password = 'W15DemoPassw0rd!2026';
  let userId = '';

  test.beforeAll(async ({ browser }) => {
    expect(SUPABASE_HTTP).toContain(':54331'); // easytutor, never votechain 54321
    expect(ANON).toBeTruthy();
    context = await browser.newContext({
      viewport: { width: 390, height: 736 },
      serviceWorkers: 'block',
    });
    page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await installHarness(page);
  });

  test.afterAll(async () => {
    if (page) await page.unrouteAll({ behavior: 'ignoreErrors' });
    if (userId) {
      await fetch(`${SUPABASE_HTTP}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      }).catch(() => undefined);
    }
    if (context) await context.close();
  });

  test('sign-up through the real UI creates a session and lands on onboarding', async () => {
    await page.goto(`${APP_ORIGIN}/login`);
    await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();
    await page.getByRole('button', { name: /create account/i }).click();
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill(password);

    const signup: Promise<Response> = page.waitForResponse(
      (r) => r.url().includes('/auth/v1/signup') && r.request().method() === 'POST');
    await page.getByText('Sign Up', { exact: true }).last().click();
    const response = await signup;
    expect(response.status()).toBe(200);
    const body = await response.json() as Json;
    expect(body.user?.id).toBeTruthy();
    userId = body.user.id;

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText('Choose your learning path')).toBeVisible();
    expect(counters.bundleRewrites).toBeGreaterThan(0);
  });

  test('setup wizard advances one step at a time, persists under RLS and survives reload', async () => {
    await page.getByText('Self-Directed Learner', { exact: true }).click();
    await page.getByText('Get Started', { exact: true }).click();
    await expect(page).toHaveURL(/\/setup-wizard/);

    // Country step -> level step. This assertion exposes the old bug where the
    // single "Continue" button called handleComplete at every step.
    await page.getByText('Kenya', { exact: true }).click();
    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('2 · Your level')).toBeVisible();

    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('3 · Curriculum track')).toBeVisible();
    await page.getByText('Custom / Self-Directed', { exact: true }).click();

    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('4 · Goal & exam date')).toBeVisible();
    await page.locator('textarea').first().fill('Master automotive braking systems');
    await page.locator('input[placeholder="Select a date"]').fill('2026-12-31');

    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('5 · Daily study time')).toBeVisible();
    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('6 · Language & data')).toBeVisible();
    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('7 · Review')).toBeVisible();
    await page.getByText('Continue', { exact: true }).last().click();
    await expect(page.getByText('Setup complete!')).toBeVisible();

    await page.getByText('Start Learning', { exact: true }).click();
    await expect(page).not.toHaveURL(/\/setup-wizard/);

    // The profile write is real PostgREST under RLS (USER_PRIVATE row), and it
    // survives a full reload of the real app.
    await expect.poll(async () => profileRow(email), { timeout: 15000 }).toMatchObject({
      email,
      learning_mode: 'self_directed',
      onboarding_complete: true,
    });
    await page.reload();
    await expect(page).not.toHaveURL(/\/setup-wizard|\/onboarding/);
    // Correction, not a loosened matcher: the previous assertion looked for
    // 'Flagship Module', a string that exists only on screens/ai_literacy/.
    // Completion of onboarding deliberately routes to Home (app/_layout.tsx
    // router.replace('/')), where the same flagship entry point is rendered as
    // the 'Flagship learning' card (screens/tabs/index.tsx). The old assertion
    // was unsatisfiable in this flow, so its earlier "green" claim was false.
    // This keeps one exact-text visibility assertion and the same timeout; it
    // asserts the real post-reload affordance instead of an unreachable screen.
    await expect(page.getByText('Flagship learning', { exact: true })).toBeVisible();
  });

  test('deep link renders the wired Learn screen with a free-form topic', async () => {
    await page.goto(`${APP_ORIGIN}/study?topic=Braking`);
    await expect(page.getByText('Learn').first()).toBeVisible();
    // Correction, not a loosened matcher: the i18n migration changed this
    // placeholder to t('askQuestion') = 'Ask a question about this topic...'
    // (src/locales/en.json:60). The old literal predates that migration and can
    // never match. Same exact-text assertion and the same timeout.
    await expect(page.getByPlaceholder('Ask a question about this topic...')).toBeVisible();
    await expect(page.getByText(/Hi! I’m your tutor/)).toBeVisible();
  });
});
