/**
 * W1-6 — no dead budget fields.
 *
 * Every numeric field in `perf-budget.json` must be enforced by at least one
 * perf gate script. A config value nobody reads is a false gate: it looks like
 * a limit while enforcing nothing.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const budget = JSON.parse(fs.readFileSync(path.join(ROOT, 'perf-budget.json'), 'utf8')) as Record<string, unknown>;

const gateSources = [
  'scripts/perf/check-entry-budget.js',
  'scripts/perf/measure-login-route.js',
].map((file) => {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}).join('\n');

describe('W1-6 perf budget fields are enforced', () => {
  it('every budget field is referenced by a gate script', () => {
    const numericFields = Object.keys(budget).filter((key) => !key.startsWith('$'));
    expect(numericFields.length).toBeGreaterThan(0);
    const unenforced = numericFields.filter((key) => !gateSources.includes(key));
    expect(unenforced).toEqual([]);
  });

  it('budget values are positive finite numbers', () => {
    for (const [key, value] of Object.entries(budget)) {
      if (key.startsWith('$')) continue;
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value as number)).toBe(true);
      expect(value as number).toBeGreaterThan(0);
    }
  });
});
