#!/usr/bin/env node
// Fail closed when production code uses the disabled direct-from-client AI rail.
// The only hosted path allowed is the server-side ai-proxy (T2 / ADR-009).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative } from 'node:path';

const require = createRequire(import.meta.url);
const { ROOT, assertClassified, walkScanned } = require('../architecture/sourceRoots');

// The stub definition lives in providers.ts; it is allowed to exist for a
// clear error message but no production caller may invoke it.
const forbidden = /\bcallAnthropic\s*\(/;
const directEndpoints = /api\.groq\.com|api\.anthropic\.com/;
const violations = [];

assertClassified();

const files = [];
walkScanned((file) => files.push(file));
for (const file of files) {
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

const settingsSource = readFileSync(`${ROOT}/store/settingsStore.ts`, 'utf8');
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
