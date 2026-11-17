/**
 * W1-4/T6 — LIVE auth proof against the local EASYTUTOR Supabase stack.
 *
 * This suite is intentionally excluded from `npm test` (hermetic unit suite).
 * Run it with: npm run test:auth-flow
 *
 * Enforcement notes (learned the hard way this session):
 *  - `npx supabase status` reports VOTECHAIN's ports (54321/54324) when two
 *    local projects share a machine. We therefore NEVER use its output here.
 *    The URL + anon key come from `.env.local`, which points at easytutor's
 *    Kong (54331); Mailpit is pinned to easytutor's 54325.
 *  - supabase-js sends `redirectTo` as the `?redirect_to=` QUERY parameter,
 *    not in the JSON body. All calls below use the same wire contract.
 *  - No key, JWT, token or token-bearing URL is ever logged or written to disk.
 *    Only status codes, hosts, paths and parameter NAMES appear in output.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

type Json = Record<string, any>;

const ROOT = path.resolve(__dirname, '../..');
const APP_ORIGIN = 'http://127.0.0.1:3000';
const REDIRECT_TO = `${APP_ORIGIN}/update-password`;
const createdUserIds: string[] = [];

let API = '';
let ANON = '';
let MAILPIT = '';
let SERVICE = '';

function readEnvFile(): Record<string, string> {
  const file = path.join(ROOT, '.env.local');
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function jwt(claim: Json, secret: string): string {
  const b64 = (o: Json) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(claim);
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
}

function decodeClaims(value: string): Json {
  return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
}

beforeAll(() => {
  const envFile = readEnvFile();
  API = (envFile.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  ANON = envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  MAILPIT = (process.env.E2E_MAILPIT_URL || 'http://127.0.0.1:54325').replace(/\/+$/, '');

  // Anti-false-gate guard: `.env.local` must point at easytutor (54331),
  // not votechain (54321) which `supabase status` would report here.
  expect(new URL(API).host).not.toBe('127.0.0.1:54321');
  expect(new URL(API).host).not.toBe('localhost:54321');
  expect(new URL(MAILPIT).host).not.toBe('127.0.0.1:54324');
  expect(decodeClaims(ANON).role).toBe('anon');

  if (process.env.E2E_SERVICE_ROLE_KEY) {
    SERVICE = process.env.E2E_SERVICE_ROLE_KEY;
  } else {
    const container = process.env.E2E_AUTH_CONTAINER || 'supabase_auth_easytutor';
    const authEnv = execFileSync('docker',
      ['inspect', container, '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
      { encoding: 'utf8' });
    const secret = authEnv.split('\n')
      .find((line) => line.startsWith('GOTRUE_JWT_SECRET='))
      ?.slice('GOTRUE_JWT_SECRET='.length);
    expect(secret).toBeTruthy();
    SERVICE = jwt({ role: 'service_role', iss: 'supabase-demo', aud: 'authenticated',
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }, secret!);
  }
  expect(decodeClaims(SERVICE).role).toBe('service_role');
});

afterAll(async () => {
  // Best-effort cleanup of every user created by this suite.
  await Promise.all(createdUserIds.map((id) =>
    fetch(`${API}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    }).catch(() => undefined)));
});

async function post(pathname: string, body: Json, key = ANON, redirectTo?: string) {
  const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
  const res = await fetch(`${API}${pathname}${query}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() as Json };
}

async function waitForMail(email: string, subjectPattern: RegExp): Promise<{ id: string; text: string; subject: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const listing = await (await fetch(`${MAILPIT}/api/v1/messages`)).json() as Json;
    for (const msg of (listing.messages ?? []) as Json[]) {
      if (!JSON.stringify(msg).includes(email)) continue;
      if (!subjectPattern.test(msg.Subject ?? '')) continue;
      const detail = await (await fetch(`${MAILPIT}/api/v1/message/${encodeURIComponent(msg.ID)}`)).json() as Json;
      return { id: msg.ID, text: `${detail.Text ?? ''}\n${detail.HTML ?? ''}`, subject: msg.Subject };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no matching email arrived in Mailpit within the wait window (subject ${subjectPattern})`);
}

function verifyLinkFrom(text: string): URL {
  const raw = [...text.matchAll(/https?:\/\/[^\s"<>]+/g)]
    .map((m) => m[0].replace(/&amp;/g, '&'))
    .find((candidate) => candidate.includes('/auth/v1/verify?'));
  if (!raw) throw new Error('no /auth/v1/verify link found in email body');
  return new URL(raw);
}

function hashParams(url: URL): URLSearchParams {
  return new URLSearchParams(url.hash.replace(/^#/, ''));
}

async function followVerify(link: URL) {
  const res = await fetch(link.toString(), { redirect: 'manual' });
  const location = res.headers.get('location');
  expect(location).toBeTruthy();
  return { status: res.status, target: new URL(location!) };
}

describe('W1-4/T6 — LIVE Supabase Auth + Mailpit (easytutor only)', () => {
  it('sign-up returns a real session, and password sign-in works afterwards', async () => {
    const email = `w1t6-signup-${Date.now()}@example.test`;
    const password = 'SignupPassw0rd!2026';

    const signup = await post('/auth/v1/signup',
      { email, password, data: {} }, ANON, REDIRECT_TO);
    expect(signup.status).toBe(200);
    expect(signup.json.access_token).toBeTruthy();
    expect(signup.json.user?.email).toBe(email);
    createdUserIds.push(signup.json.user.id);

    // Local autocOnfirm is ON, so sign-up is immediately a signed-in session.
    // GoTrue omits confirmed_at from the signup response body; read the real
    // row through the admin API instead of assuming from a missing field.
    const adminUser = await fetch(`${API}/auth/v1/admin/users/${signup.json.user.id}`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    });
    expect(adminUser.status).toBe(200);
    expect(((await adminUser.json()) as Json).confirmed_at).toBeTruthy();

    const signin = await post('/auth/v1/token?grant_type=password', { email, password });
    expect(signin.status).toBe(200);
    expect(signin.json.access_token).toBeTruthy();
    expect(signin.json.user?.email).toBe(email);
  });

  it('email confirmation link from Mailpit signs the user in on /update-password', async () => {
    const email = `w1t6-confirm-${Date.now()}@example.test`;
    const created = await post('/auth/v1/admin/users',
      { email, password: 'ConfirmPassw0rd!2026', email_confirm: false }, SERVICE);
    expect(created.status).toBe(200);
    expect(created.json.confirmed_at).toBeFalsy();
    createdUserIds.push(created.json.id);

    // Local autocOnfirm is ON so signUp sends nothing; `resend` with type=signup
    // produces the SAME confirmation email production signUp would send.
    const resent = await post('/auth/v1/resend', { email, type: 'signup' }, ANON, REDIRECT_TO);
    expect(resent.status).toBe(200);

    const mail = await waitForMail(email, /confirm/i);
    const link = verifyLinkFrom(mail.text);
    expect(link.pathname).toBe('/auth/v1/verify');
    expect(link.searchParams.get('type')).toBe('signup');
    expect(link.searchParams.get('redirect_to')).toBe(REDIRECT_TO);

    const { status, target } = await followVerify(link);
    expect(status).toBe(303);
    expect(target.host).toBe(new URL(APP_ORIGIN).host);
    expect(target.pathname).toBe('/update-password');
    const params = hashParams(target);
    expect(params.get('access_token')).toBeTruthy();
    expect(params.get('type')).toBe('signup');

    // The token actually authenticates: this is what the app's getSession() sees.
    const userRes = await fetch(`${API}/auth/v1/user`, {
      headers: { apikey: ANON, Authorization: `Bearer ${params.get('access_token')}` },
    });
    expect(userRes.status).toBe(200);
    expect(((await userRes.json()) as Json).email).toBe(email);
  });

  it('password reset link lands on /update-password and updateUser changes the password', async () => {
    const email = `w1t6-reset-${Date.now()}@example.test`;
    const oldPassword = 'OldPassw0rd!2026';
    const newPassword = 'NewPassw0rd!2026';

    const signup = await post('/auth/v1/signup', { email, password: oldPassword }, ANON, REDIRECT_TO);
    expect(signup.status).toBe(200);
    createdUserIds.push(signup.json.user.id);

    const recover = await post('/auth/v1/recover', { email }, ANON, REDIRECT_TO);
    expect(recover.status).toBe(200);

    const mail = await waitForMail(email, /reset/i);
    const link = verifyLinkFrom(mail.text);
    expect(link.searchParams.get('type')).toBe('recovery');
    expect(link.searchParams.get('redirect_to')).toBe(REDIRECT_TO);

    const { status, target } = await followVerify(link);
    expect(status).toBe(303);
    expect(target.pathname).toBe('/update-password');
    const params = hashParams(target);
    const accessToken = params.get('access_token');
    expect(accessToken).toBeTruthy();
    expect(params.get('type')).toBe('recovery');

    // Mirrors `supabase.auth.updateUser({ password })` on update-password.tsx.
    const updated = await fetch(`${API}/auth/v1/user`, {
      method: 'PUT',
      headers: { apikey: ANON, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    expect(updated.status).toBe(200);

    const signinOld = await post('/auth/v1/token?grant_type=password', { email, password: oldPassword });
    expect(signinOld.status).toBe(400); // old password is rejected
    const signinNew = await post('/auth/v1/token?grant_type=password', { email, password: newPassword });
    expect(signinNew.status).toBe(200); // new password works
    expect(signinNew.json.user?.email).toBe(email);
  });

  it('OAuth return path (/) is an accepted, session-bearing redirect target', async () => {
    // This proves the redirect URL that buildAuthRedirect(OAUTH_RETURN_PATH)
    // produces is accepted by GoTrue and lands with a usable session. The
    // Google round-trip itself needs provider credentials (manual test below).
    const email = `w1t6-oauthpath-${Date.now()}@example.test`;
    const oauthReturn = `${APP_ORIGIN}/`;
    const signup = await post('/auth/v1/signup',
      { email, password: 'OauthPathPassw0rd!2026' }, ANON, oauthReturn);
    expect(signup.status).toBe(200);
    createdUserIds.push(signup.json.user.id);

    const recover = await post('/auth/v1/recover', { email }, ANON, oauthReturn);
    expect(recover.status).toBe(200);
    const mail = await waitForMail(email, /reset/i);
    const link = verifyLinkFrom(mail.text);
    expect(link.searchParams.get('redirect_to')).toBe(oauthReturn);

    const { status, target } = await followVerify(link);
    expect(status).toBe(303);
    expect(target.host).toBe(new URL(APP_ORIGIN).host);
    expect(target.pathname).toBe('/');
    expect(hashParams(target).get('access_token')).toBeTruthy();
  });
});
