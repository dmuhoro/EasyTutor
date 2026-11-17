#!/usr/bin/env node
// Fail closed when source/test code imports a bare package that is not declared in
// package.json. This catches the class of bug where a package exists only as an
// extraneous local node_modules entry: local typecheck passes, fresh `npm ci` fails.
// Dev-only QA gate — no runtime dependency.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);

const SCAN_DIRS = ['app', 'components', 'lib', 'screens', 'services', 'src', 'store', 'tests', 'hooks', 'data'];
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'archive', '.expo', 'coverage', 'playwright-report']);

// Node builtins and module prefixes that are not npm packages.
const BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'crypto', 'dgram',
  'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'module', 'net', 'os', 'path',
  'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder',
  'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib', 'test', 'vitest',
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.test(entry)) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const packageOf = (spec) => {
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0];
};

// Only static ESM `import`/`export ... from` statements are in scope: these are
// resolved by TypeScript on a fresh install. Guarded dynamic `require()` with a
// fallback (e.g. react-native-device-info) and lazy `import()` do not break
// typecheck and are deliberately excluded.
const importPattern = /(?:^|\s)(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const undeclared = new Map();

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const spec = match[1];
    if (!spec) continue;
    if (spec.startsWith('.') || spec.startsWith('/')) continue;
    if (spec.startsWith('~') || spec.startsWith('#')) continue;
    // tsconfig path aliases (e.g. `@/lib`) are not npm packages.
    if (spec.startsWith('@/')) continue;
    if (spec.startsWith('node:')) continue;
    const name = packageOf(spec);
    if (BUILTINS.has(name)) continue;
    if (declared.has(name)) continue;
    if (!undeclared.has(name)) undeclared.set(name, []);
    const loc = relative(ROOT, file);
    if (undeclared.get(name).length < 5) undeclared.get(name).push(loc);
  }
}

if (undeclared.size > 0) {
  console.error('[DECLARED IMPORTS] FAIL — bare imports missing from package.json:');
  for (const [name, where] of [...undeclared].sort()) {
    console.error(`  ${name}  <- ${where.join(', ')}`);
  }
  console.error('Declare with `npm install --save-dev <pkg>` (or --save for runtime deps) and commit the lockfile.');
  process.exit(1);
}

console.log(`[DECLARED IMPORTS] PASS — ${files.length} files scanned, every bare import declared.`);
