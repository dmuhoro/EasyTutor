import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ── Route ownership gate ─────────────────────────────────────────────────────
// Expo Router silently picks one file when two routes resolve to the same URL.
// That shadowing is invisible in tests and in review: the losing file simply
// never renders. Before this gate, `app/(tabs)/index.tsx` (Today) lost `/` to
// the AI Literacy portal, and `/quiz`, `/roadmap`, `/progress`, `/profile` and
// `/settings` each had a second owner. This test computes URLs from the real
// filesystem and fails the moment a URL gains a second owner.

const APP_DIR = path.resolve(process.cwd(), 'app');
const LAYOUT_FILE = /^_layout\.tsx$/;

function listRouteFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listRouteFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * URL a route file serves. Route *groups* (`(tabs)`) are organizational and do
 * not appear in the URL. `index` collapses to its parent. Dynamic segments are
 * normalized to `[param]` so `[subject]/quiz` and `[course]/quiz` at the same
 * depth register as the same URL shape they would actually compete for.
 */
function routeUrl(rel: string): string | null {
  const withoutExt = rel.replace(/\.tsx$/, '');
  if (LAYOUT_FILE.test(path.basename(`${withoutExt}.tsx`))) return null;
  const segments = withoutExt
    .split('/')
    .filter((segment) => !/^\(.*\)$/.test(segment))
    .map((segment) => (/^\[.*\]$/.test(segment) ? '[param]' : segment));
  if (segments[segments.length - 1] === 'index') segments.pop();
  return `/${segments.join('/')}`;
}

const ROUTES = listRouteFiles(APP_DIR)
  .map((rel) => ({ file: `app/${rel}`, url: routeUrl(rel) }))
  .filter((route): route is { file: string; url: string } => route.url !== null);

const owners = new Map<string, string[]>();
for (const { file, url } of ROUTES) {
  owners.set(url, [...(owners.get(url) ?? []), file]);
}

describe('Route ownership — every URL has exactly one owner', () => {
  it('discovers the route tree from disk', () => {
    expect(ROUTES.length).toBeGreaterThan(30);
    // Layouts are not routes.
    expect(ROUTES.some((route) => route.file.endsWith('_layout.tsx'))).toBe(false);
  });

  it('has no URL served by more than one file', () => {
    const collisions = [...owners.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([url, files]) => `${url} <- ${files.join(', ')}`);
    expect(collisions).toEqual([]);
  });

  it('maps the tab shell onto the canonical top-level URLs', () => {
    // The product's five tabs plus the two hidden deep-link routes must be
    // owned by `(tabs)`. If one of these regresses, a portal group or a stale
    // root file has taken the URL back over.
    const expected: Record<string, string> = {
      '/': 'app/(tabs)/index.tsx',
      '/quiz': 'app/(tabs)/quiz.tsx',
      '/roadmap': 'app/(tabs)/roadmap.tsx',
      '/library': 'app/(tabs)/library.tsx',
      '/progress': 'app/(tabs)/progress.tsx',
      '/profile': 'app/(tabs)/profile.tsx',
      '/you': 'app/(tabs)/you.tsx',
    };
    for (const [url, file] of Object.entries(expected)) {
      expect(owners.get(url), `owners of ${url}`).toEqual([file]);
    }
  });

  it('keeps root-level singletons unambiguous', () => {
    expect(owners.get('/settings')).toEqual(['app/settings.tsx']);
    expect(owners.get('/explore')).toEqual(['app/explore.tsx']);
  });

  it('namespaces every portal behind a real path segment', () => {
    // Portal groups used to be URL-transparent `(...)` folders, which is what
    // let four of them claim `/`. Each portal now owns a distinct prefix.
    const portals: Record<string, string> = {
      '/high-school': 'app/high-school/index.tsx',
      '/university': 'app/university/index.tsx',
      '/self-directed': 'app/self-directed/index.tsx',
      '/ai-literacy': 'app/ai-literacy.tsx',
    };
    for (const [url, file] of Object.entries(portals)) {
      expect(owners.get(url), `owners of ${url}`).toEqual([file]);
    }
    // No route may still be served out of a URL-transparent portal group.
    const transparentGroups = ROUTES.filter((route) =>
      /\/(?:\(high_school\)|\(university\)|\(self_directed\)|\(ai_literacy\))\//.test(route.file),
    );
    expect(transparentGroups).toEqual([]);
  });

  it('keeps nested portal routes under their portal prefix', () => {
    const nested = ROUTES.filter((route) => route.file.startsWith('app/high-school/[subject]/'));
    expect(nested.map((route) => route.url).sort()).toEqual([
      '/high-school/[param]/quiz',
      '/high-school/[param]/roadmap',
      '/high-school/[param]/topics',
    ]);
  });
});
