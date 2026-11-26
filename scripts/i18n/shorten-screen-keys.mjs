#!/usr/bin/env node
/**
 * One-time Sprint 85 size repair. The first migration used descriptive
 * `screen.*__hash` keys; 507 of them pushed the unchanged entry gzip budget
 * over its ceiling. Map each key to an existing pack key with the same English
 * value where possible, otherwise to a short stable content hash. No budget,
 * pack count guarantee or translation value is changed by this transform.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PACKS = ['en', 'sw', 'fr'];
const localeDir = path.join(ROOT, 'src', 'locales');
const packs = Object.fromEntries(PACKS.map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), 'utf8')),
]));

const existingByValue = new Map();
for (const [key, value] of Object.entries(packs.en)) {
  if (!key.startsWith('screen.') && !existingByValue.has(value)) existingByValue.set(value, key);
}

const mapping = new Map();
for (const key of Object.keys(packs.en).filter((k) => k.startsWith('screen.'))) {
  const value = packs.en[key];
  const replacement = existingByValue.get(value)
    ?? `s.${crypto.createHash('sha256').update(value).digest('hex').slice(0, 10)}`;
  mapping.set(key, replacement);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'archive'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

let replacements = 0;
for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'screens'))]) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [oldKey, newKey] of mapping) {
    const needle = `t('${oldKey}')`;
    while (source.includes(needle)) {
      source = source.replace(needle, `t('${newKey}')`);
      replacements += 1;
    }
  }
  fs.writeFileSync(file, source);
}

for (const locale of PACKS) {
  const next = {};
  for (const [key, value] of Object.entries(packs[locale])) {
    if (key.startsWith('screen.')) continue;
    next[key] = value;
  }
  for (const [oldKey, newKey] of mapping) {
    if (!(newKey in next)) next[newKey] = packs[locale][oldKey];
  }
  fs.writeFileSync(path.join(localeDir, `${locale}.json`), `${JSON.stringify(next, null, 2)}\n`);
}

console.log(`[I18N SHRINK] ${mapping.size} verbose key(s) → ${new Set(mapping.values()).size} short key(s), ${replacements} call site(s) rewritten.`);
