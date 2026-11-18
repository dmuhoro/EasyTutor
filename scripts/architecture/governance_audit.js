const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'src/infrastructure/database/governedQueries.ts',
  'src/infrastructure/database/governedWrites.ts',
  'src/infrastructure/database/portalFilters.ts',
  'src/infrastructure/database/taxonomyGuards.ts',
  'src/infrastructure/database/retrievalPolicies.ts',
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file);
}

const failures = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing governed database file: ${file}`);
  }
}

const sourceFiles = walk(path.join(root, 'src'))
  .concat(walk(path.join(root, 'lib')))
  .concat(walk(path.join(root, 'store')))
  .concat(walk(path.join(root, 'app')))
  .concat(walk(path.join(root, 'components')));

const rawSupabaseAllowed = new Set([
  'lib/supabase.ts',
  'lib/supabase.web.ts',
  'lib/supabaseOps.ts',
  'src/infrastructure/database/index.ts',
  'src/infrastructure/database/governedQueries.ts',
  'src/infrastructure/database/governedWrites.ts',
  // Additional files allowed to access Supabase for operational reasons
  'lib/adaptive.ts',
  'lib/ai.ts',
  'lib/analytics.ts',
  'lib/api.ts',
  'lib/dashboard.ts',
  'lib/debug.ts',
  'lib/diagnostics/startup.ts',
  'lib/habits.ts',
  'lib/ingestion/worker.ts',
  'lib/insights.ts',
  'lib/knowledge.ts',
  'lib/profileOps.ts',
  'lib/progress.ts',
  'lib/quizProvider.ts',
  'lib/resolveTopicId.ts',
  'lib/retrieval.ts',
  'lib/xp.ts',
  'store/authStore.ts',
  'app/_layout.tsx',
  'app/onboarding.tsx',
  'components/FeedbackModal.tsx',
]);

for (const file of sourceFiles) {
  const rel = relative(file);
  const body = fs.readFileSync(file, 'utf8');
  const rawAccessPattern = /getSupabaseClient\(|\bsupabase(?:!|\?)?\.from\(|\bclient\.from\(|\bsupabase(?:!|\?)?\.rpc\(|\bclient\.rpc\(/;
  if (!rawSupabaseAllowed.has(rel) && rawAccessPattern.test(body)) {
    warnings.push(`Raw Supabase access candidate: ${rel}`);
  }
}

const retrieval = fs.readFileSync(path.join(root, 'lib/retrieval.ts'), 'utf8');
if (!/assertRetrievalContext/.test(retrieval) || !/portal_type/.test(retrieval)) {
  failures.push('Retrieval does not enforce governed context and portal_type.');
}

console.log('[GOVERNANCE AUDIT] Database governance scan complete.');
warnings.forEach((warning) => console.warn(`[GOVERNANCE AUDIT] WARN ${warning}`));

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`[GOVERNANCE AUDIT] FAIL ${failure}`));
  process.exit(1);
}

console.log('[GOVERNANCE AUDIT] Required governance contracts are present.');
