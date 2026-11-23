#!/usr/bin/env node
/**
 * Fail closed on server-only credential material in shipped code or anywhere
 * else in the repository.
 *
 * Two scopes, deliberately different:
 *
 *  * SHIPPED dirs (client source, `public/`, and `dist/` with --include-dist):
 *    every rule applies. A credential NAME such as `service_role` is itself a
 *    defect here because client code must never read a server-only secret.
 *  * REPO dirs (`tests/`, `scripts/`, `supabase/`): only credential VALUE rules
 *    apply. These directories legitimately contain name references (fake test
 *    JWT claims, a server-side `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`,
 *    documentation). Actual key material is still detected everywhere.
 *
 * Patterns cover Supabase service credentials, Anthropic, Groq, Google and
 * OpenAI keys, plus any JWT whose payload declares role=service_role.
 *
 * The guard never prints a matched value — only the rule and location — so it
 * cannot itself leak a secret into CI logs.
 *
 * Usage: node scripts/security/check_secret_exposure.mjs [--include-dist]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const INCLUDE_DIST = process.argv.includes('--include-dist');

// Everything that can reach a user's device. All rules apply.
const SHIPPED_DIRS = [
  'app',
  'components',
  'hooks',
  'lib',
  'screens',
  'services',
  'store',
  'src',
  'utils',
  'constants',
  'features',
  'shared',
  'public',
];
// Tooling, tests and server-only Edge Functions. Value rules apply.
const REPO_DIRS = ['tests', 'scripts', 'supabase'];
if (INCLUDE_DIST) SHIPPED_DIRS.push('dist');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive', 'coverage', '.expo', '.next']);
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css', '.map', '.txt',
]);

// A credential NAME in shipped code is a leak vector even without a value.
const NAME_RULES = [
  { name: 'service_role token', test: (s) => /service_role/i.test(s) },
  { name: 'SUPABASE_SERVICE_ROLE_KEY name', test: (s) => /SUPABASE_SERVICE_ROLE_KEY/.test(s) },
];

// Actual credential material is rejected in every scanned directory.
const VALUE_RULES = [
  { name: 'Supabase secret key', test: (s) => /sb_secret_[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'Anthropic key', test: (s) => /sk-ant-[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'Groq API key', test: (s) => /gsk_[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'Google API key', test: (s) => /AIza[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'OpenAI project key', test: (s) => /sk-proj-[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'OpenAI API key', test: (s) => /sk-[A-Za-z0-9]{20,}/.test(s) },
];

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    // Never read an env file: this guard must not be able to echo a secret.
    if (entry === '.env' || entry.startsWith('.env.')) continue;
    const full = join(dir, entry);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) walk(full, out);
    else if (TEXT_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
}

function jwtRole(value) {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

const files = []; // { path, shipped }
for (const dir of SHIPPED_DIRS) {
  for (const file of (() => { const out = []; walk(join(ROOT, dir), out); return out; })()) {
    files.push({ file, shipped: true });
  }
}
for (const dir of REPO_DIRS) {
  for (const file of (() => { const out = []; walk(join(ROOT, dir), out); return out; })()) {
    files.push({ file, shipped: false });
  }
}

const violations = [];
for (const { file, shipped } of files) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const rules = shipped ? [...VALUE_RULES, ...NAME_RULES] : VALUE_RULES;
  for (const rule of rules) {
    if (rule.test(source)) {
      violations.push({ file: relative(ROOT, file), rule: rule.name });
    }
  }
  // JWTs: only flag the ones that actually carry service_role.
  for (const match of source.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    if (jwtRole(match[0]) === 'service_role') {
      violations.push({ file: relative(ROOT, file), rule: 'JWT with role=service_role' });
      break;
    }
  }
}

if (violations.length) {
  console.error('FAIL: server-only credential material found in scanned code:');
  for (const v of violations) console.error(`      ${v.rule} -> ${v.file}`);
  console.error('\nSecret exposure guard failed. Remove the value and rotate the key.');
  process.exit(1);
}

const scope = INCLUDE_DIST ? 'shipped source + exported bundle + repo tooling' : 'shipped source + repo tooling';
console.log(`Secret exposure guard passed: ${files.length} file(s) scanned in ${scope}.`);
