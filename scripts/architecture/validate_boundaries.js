const fs = require('fs');
const { ROOT, assertClassified, walkScanned } = require('./sourceRoots');

// Rule applicability is explicit. Every source root is classified by
// sourceRoots.js; a new top-level root fails closed before these rules run.
const RENDER_DIRS = ['app', 'components', 'screens'];
const IMPORT_DIRS = ['app', 'components', 'screens', 'hooks'];
const STORE_DIRS = ['store'];

const FORBIDDEN_IMPORTS = [
  {
    pattern: /from ['"]@supabase\/supabase-js['"]/,
    message: 'Direct Supabase import detected. Use lib/supabaseOps.ts instead.',
    dirs: IMPORT_DIRS,
  },
  {
    pattern: /from ['"](?:\.\.\/)+src\/intelligence\//,
    message:
      'Store layer must not statically import src/intelligence. Depend on src/domain/learning/learningPort through store/learningGateway.ts so the intelligence graph stays out of the initial bundle.',
    dirs: STORE_DIRS,
  },
  {
    pattern: /from ['"](?:\.\.\/)+services\/learningPort['"]/,
    message:
      'Store layer must not import services/learningPort directly. Resolve the port via store/learningGateway.ts (lazy, injectable, cycle-free).',
    dirs: STORE_DIRS,
  },
];

// Direct client bypass: any render-layer file that reaches the raw Supabase
// client instead of going through the governed layer. The auth lifecycle
// subscription is the one legitimate raw-client use: it is not a table
// read/write and the governed layer does not model subscriptions.
const FORBIDDEN_USAGES = [
  {
    pattern: /getSupabaseClient\s*\(\s*\)/,
    message: 'Raw Supabase client bypass detected. Use Database.governedWrite / Database.governedQuery instead.',
    dirs: RENDER_DIRS,
    allow: (window) => /\.auth\.onAuthStateChange/.test(window),
  },
];

console.log(`[ARCHITECTURE AUDIT] Scanning ${ROOT} for boundary violations...`);
assertClassified();

let violations = 0;

FORBIDDEN_IMPORTS.forEach((rule) => {
  walkScanned((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (rule.pattern.test(content)) {
      console.error(`[VIOLATION] ${filePath}: ${rule.message}`);
      violations++;
    }
  }, rule.dirs);
});

FORBIDDEN_USAGES.forEach((rule) => {
  walkScanned((filePath) => {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (!rule.pattern.test(line)) return;

      // Allow the auth lifecycle subscription only when it is the next
      // statement after the raw client call.
      const window = lines.slice(idx, idx + 4).join('\n');
      if (rule.allow && rule.allow(window)) return;
      console.error(`[VIOLATION] ${filePath}:${idx + 1}: ${rule.message}`);
      violations++;
    });
  }, rule.dirs);
});

if (violations > 0) {
  console.log(`\n[AUDIT FAILED] Found ${violations} architecture violations.`);
  process.exit(1);
}
console.log('\n[AUDIT PASSED] No architecture violations found.');
