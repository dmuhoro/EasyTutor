// Shared top-level root classification for the architecture and AI boundary
// gates. Unknown roots fail closed instead of being silently skipped.
const fs = require('fs');
const path = require('path');

const ROOT = process.env.BOUNDARY_SCAN_ROOT
  ? path.resolve(process.cwd(), process.env.BOUNDARY_SCAN_ROOT)
  : process.cwd();

// Shipped source roots. Every one is walked by at least one gate; individual
// rules declare which roots they apply to in the gate that owns them.
const SCANNED_DIRS = Object.freeze([
  'app',
  'components',
  'constants',
  'data',
  'hooks',
  'lib',
  'public',
  'screens',
  'services',
  'src',
  'store',
  'types',
]);

// Non-shipped roots are excluded with an explicit reason. An unlisted root is
// a new top-level directory and stops both gates until it is classified.
const EXCLUDED_DIRS = Object.freeze({
  '.agents': 'agent configuration, not shipped source',
  '.expo': 'generated Expo output',
  '.git': 'version-control metadata',
  '.github': 'CI configuration and templates, not app source',
  '.husky': 'git hooks, not shipped source',
  '.tmp-analytics-scripts': 'temporary owner scripts, not shipped source',
  '.vercel': 'deployment metadata',
  '.vscode': 'editor configuration',
  Anthropic: 'owner reference notes, not shipped source',
  'ai-context': 'owner reference notes, not shipped source',
  android: 'native build output and Gradle project',
  archive: 'archived code, kept for history and not shipped',
  assets: 'binary assets with no TypeScript or JavaScript source',
  audits: 'generated audit logs',
  coverage: 'generated coverage output',
  dist: 'generated web export',
  docs: 'documentation, not shipped source',
  node_modules: 'installed dependencies',
  'playwright-report': 'generated test report',
  scripts: 'gate implementations and boundary fixtures; contains rule literals',
  sprints: 'sprint specifications and evidence',
  supabase: 'server-side Deno functions with their own handler tests',
  'test-results': 'generated test output',
  tests: 'test suite and intentional violation fixtures',
});

const SKIP_NESTED_DIRS = new Set([
  'node_modules',
  'dist',
  '.expo',
  'coverage',
  '__snapshots__',
]);
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function assertClassified() {
  let entries;
  try {
    entries = fs.readdirSync(ROOT, { withFileTypes: true });
  } catch (error) {
    throw new Error(`[BOUNDARY ROOT] Cannot read ${ROOT}: ${error.message}`, { cause: error });
  }

  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const unclassified = dirs.filter((dir) => (
    !SCANNED_DIRS.includes(dir)
    && !Object.prototype.hasOwnProperty.call(EXCLUDED_DIRS, dir)
  ));

  if (unclassified.length > 0) {
    throw new Error(
      `[BOUNDARY ROOT] Unclassified top-level directory: ${unclassified.join(', ')}. `
      + 'Add it to SCANNED_DIRS or EXCLUDED_DIRS with a reason.',
    );
  }
  return dirs;
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_NESTED_DIRS.has(entry.name)) walk(full, onFile);
    } else if (SOURCE_EXTENSIONS.test(entry.name)) {
      onFile(full);
    }
  }
}

function walkScanned(onFile, dirs = SCANNED_DIRS) {
  for (const dir of dirs) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) walk(full, onFile);
  }
}

module.exports = {
  ROOT,
  SCANNED_DIRS,
  EXCLUDED_DIRS,
  assertClassified,
  walkScanned,
};
