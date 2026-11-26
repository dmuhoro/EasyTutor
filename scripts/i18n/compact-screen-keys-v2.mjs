#!/usr/bin/env node
/**
 * One-time Sprint 85 budget repair: alias the 461 verbose `sN` keys to the
 * shortest non-colliding base36 keys. Each source file and each pack is
 * rewritten in a SINGLE pass from a frozen snapshot, so a newly written key can
 * never be rewritten again by a later mapping entry. No rendered value, pack
 * coverage, test, threshold or budget changes.
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

const legacyKeys = new Set(Object.keys(packs.en).filter((key) => !/^s\d+$/.test(key)));
const oldKeys = Object.keys(packs.en)
  .filter((key) => /^s\d+$/.test(key))
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

/** Bijective base-26: a..z, aa..az, … — never integer-like, so pack order is stable. */
function letters(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

const mapping = new Map();
const reserved = new Set(legacyKeys);
for (const oldKey of oldKeys) {
  let index = mapping.size;
  let candidate = letters(index);
  while (reserved.has(candidate)) {
    index += 1;
    candidate = letters(index);
  }
  reserved.add(candidate);
  mapping.set(oldKey, candidate);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'archive'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const afterCalls = new Map();
let rewritten = 0;
for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'screens'))]) {
  const source = fs.readFileSync(file, 'utf8');
  const next = source.replace(/\bt\(\s*(['"])(s\d+)\1(?=[,)])/g, (whole, quote, key) => {
    const mapped = mapping.get(key);
    if (!mapped) return whole;
    afterCalls.set(mapped, (afterCalls.get(mapped) ?? 0) + 1);
    rewritten += 1;
    return `t(${quote}${mapped}${quote}`;
  });
  fs.writeFileSync(file, next);
}

const remappedPacks = Object.fromEntries(PACKS.map((locale) => {
  const remapped = {};
  for (const [key, value] of Object.entries(packs[locale])) remapped[mapping.get(key) ?? key] = value;
  if (Object.keys(remapped).length !== Object.keys(packs[locale]).length) {
    throw new Error(`[I18N COMPACT] key collision in ${locale}`);
  }
  return [locale, remapped];
}));

// Order every pack by the English literal, then by key, so similar copy is
// adjacent inside the exported entry chunk. `t()` resolves by key name and
// both pack tests compare sorted key sets, so lookup and assertions are unchanged.
const orderedKeys = Object.keys(remappedPacks.en)
  .sort((a, b) => String(remappedPacks.en[a]).localeCompare(String(remappedPacks.en[b])) || a.localeCompare(b));

for (const locale of PACKS) {
  const next = {};
  for (const key of orderedKeys) {
    if (!(key in remappedPacks[locale])) throw new Error(`[I18N COMPACT] missing ${locale}.${key}`);
    next[key] = remappedPacks[locale][key];
  }
  fs.writeFileSync(path.join(localeDir, `${locale}.json`), `${JSON.stringify(next, null, 2)}\n`);
}

const en = JSON.parse(fs.readFileSync(path.join(localeDir, 'en.json'), 'utf8'));
if (Object.keys(en).some((key) => /^s\d+$/.test(key))) {
  throw new Error('[I18N COMPACT] old sN keys survived');
}
const counted = [...afterCalls.values()].reduce((sum, count) => sum + count, 0);
if (counted !== rewritten) throw new Error('[I18N COMPACT] call-site count changed');
console.log(`[I18N COMPACT V2] ${mapping.size} key(s) aliased; ${rewritten} call site(s) rewritten in one pass, no collisions.`);
