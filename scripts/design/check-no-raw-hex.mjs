#!/usr/bin/env node
/**
 * C36 / GT-19 / E14-T2 — design-token boundary.
 *
 * Raw hex is legal only in the token declaration files. Every other shipped
 * source file must import a token (or use a token class) so a colour change has
 * one owner. This gate scans the shipped source tree plus tailwind.config.js;
 * it fails closed on any raw literal outside the explicit allowlist.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIRS = ['app', 'components', 'lib', 'screens', 'src', 'store'];
const EXTRA_FILES = ['tailwind.config.js'];
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const REQUIRED_TOKEN_FILES = ['src/design/tokens.ts', 'tailwind.config.js'];
const ALLOWED_TOKEN_FILES = new Set([
  ...REQUIRED_TOKEN_FILES,
  'src/design/legacyPalette.ts',
]);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
    }
  };
  for (const dir of SOURCE_DIRS) walk(path.join(ROOT, dir));
  for (const file of EXTRA_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) out.push(full);
  }
  return [...new Set(out)].sort();
}

const files = sourceFiles();
if (files.length === 0) {
  console.error('[NO RAW HEX] No shipped source files found; refusing to pass an empty scan.');
  process.exit(1);
}
for (const tokenFile of REQUIRED_TOKEN_FILES) {
  if (!fs.existsSync(path.join(ROOT, tokenFile))) {
    console.error(`[NO RAW HEX] Token declaration file is missing: ${tokenFile}`);
    process.exit(1);
  }
}

const violations = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (ALLOWED_TOKEN_FILES.has(rel)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(HEX)) {
      violations.push(`${rel}:${index + 1}: ${match[0]}`);
    }
  });
}

if (violations.length) {
  console.error(`[NO RAW HEX] FAIL — ${violations.length} raw hex literal(s) in shipped source.`);
  for (const violation of violations.slice(0, 30)) console.error(`  ${violation}`);
  if (violations.length > 30) console.error(`  ... and ${violations.length - 30} more`);
  process.exit(1);
}

console.log(`[NO RAW HEX] PASS — ${files.length} shipped source files scanned; raw hex appears only in token declarations.`);
