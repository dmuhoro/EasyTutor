import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const architectureGate = path.join(repoRoot, 'scripts/architecture/validate_boundaries.js');
const aiGate = path.join(repoRoot, 'scripts/qa/check-ai-boundary.mjs');
const fixture = (name: string) => path.join(repoRoot, 'tests/fixtures/boundary', name);

function runGate(script: string, root?: string) {
  const env = { ...process.env };
  if (root) env.BOUNDARY_SCAN_ROOT = root;
  else delete env.BOUNDARY_SCAN_ROOT;

  const result = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

describe('exhaustive boundary-root gates', () => {
  it('architecture gate passes on the real tree', () => {
    const result = runGate(architectureGate);
    expect(result.status).toBe(0);
    expect(result.output).toContain('[AUDIT PASSED]');
  });

  it('AI boundary gate passes on the real tree', () => {
    const result = runGate(aiGate);
    expect(result.status).toBe(0);
    expect(result.output).toContain('[AI BOUNDARY] PASS');
  });

  it('architecture gate rejects a violation in a formerly unscanned render root', () => {
    const result = runGate(architectureGate, fixture('architecture-violation'));
    expect(result.status).toBe(1);
    expect(result.output).toContain('[VIOLATION]');
    expect(result.output).toContain('screens/raw-client.tsx');
  });

  it('AI boundary gate rejects a violation in a formerly unscanned source root', () => {
    const result = runGate(aiGate, fixture('ai-violation'));
    expect(result.status).toBe(1);
    expect(result.output).toContain('[AI BOUNDARY] FAIL');
    expect(result.output).toContain('data/direct-rail.ts');
  });

  it('both gates fail closed on an unclassified top-level directory', () => {
    const architecture = runGate(architectureGate, fixture('unclassified'));
    const ai = runGate(aiGate, fixture('unclassified'));
    expect(architecture.status).toBe(1);
    expect(ai.status).toBe(1);
    expect(architecture.output).toContain('Unclassified top-level directory: newtop');
    expect(ai.output).toContain('Unclassified top-level directory: newtop');
  });

  it('both gates pass a clean fixture with classified roots', () => {
    const architecture = runGate(architectureGate, fixture('clean'));
    const ai = runGate(aiGate, fixture('clean'));
    expect(architecture.status).toBe(0);
    expect(ai.status).toBe(0);
  });
});
