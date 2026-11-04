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

if (violations > 0) {
  console.log(`\n[AUDIT FAILED] Found ${violations} architecture violations.`);
  process.exit(1);
} else {
  console.log('\n[AUDIT PASSED] No architecture violations found.');
}
