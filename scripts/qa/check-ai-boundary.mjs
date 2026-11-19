#!/usr/bin/env node
// Fail closed when production code uses the disabled direct-from-client AI rail.
// The only hosted path allowed is the server-side ai-proxy (T2 / ADR-009).
// Dev-only CI gate — no runtime dependency.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components', 'lib', 'screens', 'services', 'src', 'store'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'archive', '.expo', 'coverage']);
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

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

// The stub definition lives in providers.ts; it is allowed to exist for a
// clear error message but no production caller may invoke it.
const forbidden = /\bcallAnthropic\s*\(/;
const directEndpoints = /api\.groq\.com|api\.anthropic\.com/;
const violations = [];
for (const file of SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)))) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'lib/ai/providers.ts') continue;
  const source = readFileSync(file, 'utf8');
  if (forbidden.test(source)) {
    violations.push(rel);
    continue;
  }
  if (directEndpoints.test(source)) {
    violations.push(`${rel} (direct provider endpoint)`);
  }
}

const settingsSource = readFileSync(join(ROOT, 'store/settingsStore.ts'), 'utf8');
if (/ollamaUrl:\s*['"]http/i.test(settingsSource)) {
  violations.push('store/settingsStore.ts (non-empty default Ollama URL)');
}

if (violations.length > 0) {
  console.error('[AI BOUNDARY] FAIL — disabled direct rail called in production code:');
  for (const file of violations) console.error(`  ${file}`);
  console.error('Use callAIProxy (server-side ai-proxy) instead, and keep the Ollama URL default empty.');
  process.exit(1);
}
console.log('[AI BOUNDARY] PASS — no disabled direct rail call; Ollama default URL is empty.');
