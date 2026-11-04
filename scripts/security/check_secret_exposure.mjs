#!/usr/bin/env node
/**
 * Fail closed on a server-only credential in client code or the exported bundle.
 *
 * Detects:
 *   * the literal `service_role` / `SUPABASE_SERVICE_ROLE_KEY` tokens;
 *   * Supabase secret keys (`sb_secret_…`);
 *   * Anthropic keys (`sk-ant-…`);
 *   * any JWT whose payload declares role=service_role.
 *
 * It never prints the matched value — only the rule and location — so running
 * the guard cannot itself leak a secret into CI logs.
 *
 * Usage: node scripts/security/check_secret_exposure.mjs [--include-dist]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const INCLUDE_DIST = process.argv.includes('--include-dist');
const SCAN_DIRS = [
  'app',
  'components',
  'hooks',
  'lib',
  'services',
  'store',
  'src',
  'utils',
  'constants',
  'features',
  'shared',
];
if (INCLUDE_DIST) SCAN_DIRS.push('dist');
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'archive', 'coverage', '.expo', '.next']);
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css', '.map', '.txt',
]);

const RULES = [
  { name: 'service_role token', test: (s) => /service_role/i.test(s) },
  { name: 'SUPABASE_SERVICE_ROLE_KEY name', test: (s) => /SUPABASE_SERVICE_ROLE_KEY/.test(s) },
  { name: 'Supabase secret key', test: (s) => /sb_secret_[A-Za-z0-9_-]{20,}/.test(s) },
  { name: 'Anthropic key', test: (s) => /sk-ant-[A-Za-z0-9_-]{20,}/.test(s) },
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

const files = [];
for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);

const violations = [];
for (const file of files) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const rule of RULES) {
    if (rule.test(source)) {
      violations.push({ file: relative(ROOT, file), rule: rule.name });
      break;
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
  console.error('FAIL: server-only credential material found in shipped code:');
  for (const v of violations) console.error(`      ${v.rule} -> ${v.file}`);
  console.error('\nSecret exposure guard failed. Remove the value and rotate the key.');
  process.exit(1);
}

const scope = INCLUDE_DIST ? 'client source + exported bundle' : 'client source';
console.log(`Secret exposure guard passed: ${files.length} file(s) scanned in ${scope}.`);
