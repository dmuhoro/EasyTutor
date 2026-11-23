import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import en from '../../src/locales/en.json';
import sw from '../../src/locales/sw.json';
import fr from '../../src/locales/fr.json';

// ── Locale coverage gate ─────────────────────────────────────────────────────
// A key that exists in English but not in a shipped pack renders the raw key
// (or English) after a language switch — a silent, user-visible defect. This
// gate walks the real import graph seeded from BOTH `app/` (the wired routes)
// and `screens/` (the screens those routes lazily render), derives every
// literal `t('…')` key, and asserts all three packs carry it.
//
// Seeding only from `app/` was a false gate: `screens/setup/index.tsx` uses
// seven keys that exist in no pack, yet the gate passed because that screen is
// not yet routed. A missing key in a screen is still a user-visible raw-key
// defect the moment the screen is wired, so the gate must see it today.

const ROOT = path.resolve(process.cwd());
const APP_DIR = path.join(ROOT, 'app');
const SCREEN_DIR = path.join(ROOT, 'screens');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'archive', '.git', 'docs']);

const IMPORT_SPECIFIER = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;
const TRANSLATION_IMPORT = /from\s+['"][^'"]*src\/locales['"]/;
const CALL = /\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g;

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(full, out);
    else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const ALL_SOURCE_FILES = new Set(filesUnder(ROOT));

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.json`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (ALL_SOURCE_FILES.has(candidate)) return candidate;
  }
  return null;
}

const reachable = new Set<string>();
const queue = [...filesUnder(APP_DIR), ...filesUnder(SCREEN_DIR)];
while (queue.length > 0) {
  const file = queue.pop() as string;
  if (reachable.has(file)) continue;
  reachable.add(file);
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const body = fs.readFileSync(file, 'utf8');
  for (const match of body.matchAll(IMPORT_SPECIFIER)) {
    const target = resolveSpecifier(file, match[1]);
    if (target && !reachable.has(target)) queue.push(target);
  }
}

const usedKeys = new Set<string>();
for (const file of reachable) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const body = fs.readFileSync(file, 'utf8');
  if (!TRANSLATION_IMPORT.test(body)) continue;
  for (const match of body.matchAll(CALL)) usedKeys.add(match[1]);
}

const enKeys = new Set(Object.keys(en));

describe('Locale packs', () => {
  it('walks a real import graph and finds the keys the app asks for', () => {
    expect(reachable.size).toBeGreaterThan(50);
    expect(usedKeys.size).toBeGreaterThan(50);
  });

  it('covers the setup-screen keys the app/-only graph could not see', () => {
    const previouslyInvisible = [
      'back',
      'subjects.biology',
      'subjects.chemistry',
      'subjects.computer_science',
      'subjects.history',
      'subjects.math',
      'subjects.physics',
    ];
    expect(previouslyInvisible.filter((key) => !usedKeys.has(key))).toEqual([]);
  });

  it('every t() key exists in English', () => {
    const missing = [...usedKeys].filter((key) => !enKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('every t() key exists in every shipped pack', () => {
    const missingSw = [...usedKeys].filter((key) => !(key in sw));
    const missingFr = [...usedKeys].filter((key) => !(key in fr));
    expect({ sw: missingSw, fr: missingFr }).toEqual({ sw: [], fr: [] });
  });

  it('all packs declare the same key set', () => {
    const sorted = (pack: Record<string, unknown>) => Object.keys(pack).sort();
    expect(sorted(sw)).toEqual(sorted(en));
    expect(sorted(fr)).toEqual(sorted(en));
  });
});
