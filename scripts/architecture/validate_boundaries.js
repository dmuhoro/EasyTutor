const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, 'app');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'components');
const STORE_DIR = path.join(ROOT_DIR, 'store');

const FORBIDDEN_IMPORTS = [
  {
    pattern: /from ['"]@supabase\/supabase-js['"]/,
    message: 'Direct Supabase import detected. Use lib/supabaseOps.ts instead.',
    folders: [APP_DIR, COMPONENTS_DIR]
  },
  {
    pattern: /from ['"](?:\.\.\/)+src\/intelligence\//,
    message:
      'Store layer must not statically import src/intelligence. Depend on src/domain/learning/learningPort through store/learningGateway.ts so the intelligence graph stays out of the initial bundle.',
    folders: [STORE_DIR]
  },
  {
    pattern: /from ['"](?:\.\.\/)+services\/learningPort['"]/,
    message:
      'Store layer must not import services/learningPort directly. Resolve the port via store/learningGateway.ts (lazy, injectable, cycle-free).',
    folders: [STORE_DIR]
  }
];

// Direct client bypass: any app/component file that reaches the raw
// Supabase client instead of going through the governed layer
// (Database.governedWrite / governedQuery). This is the blind spot the
// import-only rule above misses — getSupabaseClient is exported from
// lib/supabaseOps.ts, so it is a usage pattern, not an import pattern.
//
// The auth lifecycle subscription (client.auth.onAuthStateChange) is the
// one legitimate raw-client use: it is not a table read/write and the
// governed layer does not model subscriptions. Every other getSupabaseClient
// call must go through Database.
const FORBIDDEN_USAGES = [
  {
    pattern: /getSupabaseClient\s*\(\s*\)/,
    message: 'Raw Supabase client bypass detected. Use Database.governedWrite / Database.governedQuery instead.',
    folders: [APP_DIR, COMPONENTS_DIR],
    allow: (window) => /\.auth\.onAuthStateChange/.test(window),
  }
];

function scanDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

console.log('[ARCHITECTURE AUDIT] Scanning for boundary violations...');

let violations = 0;

FORBIDDEN_IMPORTS.forEach(rule => {
  rule.folders.forEach(folder => {
    if (fs.existsSync(folder)) {
      scanDir(folder, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        if (rule.pattern.test(content)) {
          console.error(`[VIOLATION] ${filePath}: ${rule.message}`);
          violations++;
        }
      });
    }
  });
});

FORBIDDEN_USAGES.forEach(rule => {
  rule.folders.forEach(folder => {
    if (fs.existsSync(folder)) {
      scanDir(folder, (filePath) => {
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        lines.forEach((line, idx) => {
          if (rule.pattern.test(line)) {
            // The auth lifecycle subscription is the one legitimate raw-client
            // use: it is not a table read/write and the governed layer does
            // not model subscriptions. Allow it only when the very next
            // statement is that subscription.
            const window = lines.slice(idx, idx + 4).join('\n');
            if (rule.allow && rule.allow(window)) return;
            console.error(`[VIOLATION] ${filePath}:${idx + 1}: ${rule.message}`);
            violations++;
          }
        });
      });
    }
  });
});

if (violations > 0) {
  console.log(`\n[AUDIT FAILED] Found ${violations} architecture violations.`);
  process.exit(1);
} else {
  console.log('\n[AUDIT PASSED] No architecture violations found.');
}
