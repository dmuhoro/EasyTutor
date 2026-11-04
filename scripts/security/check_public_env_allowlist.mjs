#!/usr/bin/env node
/**
 * Fail closed when a public (client-bundled) env name is not explicitly allowed.
 *
 * Expo inlines every `EXPO_PUBLIC_*` value into the shipped JavaScript. A name
 * that is not on scripts/public-env-allowlist.txt is therefore a potential
 * credential leak. This guard scans client source only; it never reads an
 * `.env` file and never prints a value.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ALLOWLIST_FILE = join(ROOT, 'scripts/public-env-allowlist.txt');
const CLIENT_DIRS = [
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
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'archive', 'coverage', '.expo', '.next']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql']);

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full);
  }
}

function parseAllowlist() {
  const lines = readFileSync(ALLOWLIST_FILE, 'utf8').split(/\r?\n/);
  const allowed = new Map();
  for (const line of lines) {
    const withoutComment = line.split('#')[0].trim();
    if (!withoutComment) continue;
    const name = withoutComment.split(/\s+/)[0];
    if (!/^EXPO_PUBLIC_[A-Z0-9_]+$/.test(name)) {
      console.error(`FAIL: invalid allowlist entry "${name}" (must be EXPO_PUBLIC_*)`);
      process.exit(1);
    }
    allowed.set(name, { temp: /#\s*TEMP/i.test(line) });
  }
  return allowed;
}

const allowed = parseAllowlist();
const files = [];
for (const dir of CLIENT_DIRS) walk(join(ROOT, dir), files);

const found = new Map(); // name -> Set(file)
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bEXPO_PUBLIC_[A-Z0-9_]+\b/g)) {
    if (!found.has(match[0])) found.set(match[0], new Set());
    found.get(match[0]).add(relative(ROOT, file));
  }
}

let failed = false;
for (const [name, where] of [...found].sort()) {
  if (!allowed.has(name)) {
    failed = true;
    console.error(`FAIL: ${name} is used in client code but is not in scripts/public-env-allowlist.txt`);
    for (const file of [...where].sort()) console.error(`      ${file}`);
  }
}

for (const [name, meta] of [...allowed].sort()) {
  if (!found.has(name)) console.warn(`WARN: allowlist entry ${name} is not used in client code (stale entry?)`);
  else if (meta.temp) console.warn(`::warning::TEMP public env ${name} is shipped to the client; remove it when the server-side AI proxy lands.`);
}

if (failed) {
  console.error('\nPublic env guard failed: a client-bundled name is not explicitly allowed.');
  process.exit(1);
}
console.log(`Public env guard passed: ${found.size} EXPO_PUBLIC_* name(s) checked against the allowlist.`);
