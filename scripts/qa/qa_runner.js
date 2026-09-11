const { execSync } = require('child_process');

function runStep(name, command) {
  console.log(`[QA] Running: ${name}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`[QA] SUCCESS: ${name}\n`);
    return true;
  } catch (_err) {
    console.error(`[QA] FAILED: ${name}\n`);
    return false;
  }
}

const steps = [
  { name: 'TypeScript Validation', command: 'npx tsc --noEmit' },
  { name: 'Architecture Compliance', command: 'node scripts/architecture/validate_boundaries.js' },
  { name: 'Governance Audit', command: 'node scripts/architecture/governance_audit.js' },
  { name: 'Flow Tests', command: 'npm run test:flows' }
];

let allPassed = true;
steps.forEach(step => {
  if (!runStep(step.name, step.command)) {
    allPassed = false;
  }
});

if (allPassed) {
  console.log('[QA] All systems verified. Ready for release.');
  process.exit(0);
} else {
  console.error('[QA] Verification failed. Fix violations before proceeding.');
  process.exit(1);
}
