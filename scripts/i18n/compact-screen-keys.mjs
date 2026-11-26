#!/usr/bin/env node
/**
 * One-time Sprint 85 size repair, step two. Stable hashes are auditable but
 * their 13-character names cost more gzip than the unchanged entry budget can
 * absorb. Replace each `s.<hash>` key with a sequential `sN` alias; the values
 * and all three packs stay complete and the gate still walks the same source.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const localeDir = path.join(ROOT, 'src', 'locales');
const PACKS = ['en', 'sw', 'fr'];
const packs = Object.fromEntries(PACKS.map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), 'utf8')),
]));

const shortKeys = Object.keys(packs.en).filter((key) => /^s\.[a-f0-9]{10}$/.test(key)).sort();
const mapping = new Map(shortKeys.map((oldKey, index) => [oldKey, `s${index}`]));

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
    const count = source.split(needle).length - 1;
    if (count > 0) {
      source = source.replaceAll(needle, `t('${newKey}')`);
      replacements += count;
    }
  }
  fs.writeFileSync(file, source);
}

for (const locale of PACKS) {
  const next = {};
  for (const [key, value] of Object.entries(packs[locale])) next[mapping.get(key) ?? key] = value;
  fs.writeFileSync(path.join(localeDir, `${locale}.json`), `${JSON.stringify(next, null, 2)}\n`);
}

console.log(`[I18N COMPACT] ${mapping.size} key(s) aliased to sN; ${replacements} call site(s) rewritten.`);
