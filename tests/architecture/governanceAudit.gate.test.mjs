import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve(process.cwd(), 'scripts/architecture/governance_audit.js');
const REQUIRED = [
  'src/infrastructure/database/governedQueries.ts',
  'src/infrastructure/database/governedWrites.ts',
  'src/infrastructure/database/portalFilters.ts',
  'src/infrastructure/database/taxonomyGuards.ts',
  'src/infrastructure/database/retrievalPolicies.ts',
  'lib/retrieval.ts',
];

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'governance-audit-'));
  for (const file of REQUIRED) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.endsWith('retrieval.ts')
      ? 'assertRetrievalContext(); portal_type'
      : '');
  }
  return dir;
}

function run(dir) {
  return spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
}

describe('governance audit gate', () => {
  it('fails closed on a raw table access in a feature file', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'lib/leakyEngine.ts'),
      "const supabase = { from: () => ({}) };\nexport const leak = () => supabase.from('user_progress');\n");
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lib/leakyEngine.ts');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails closed on a raw table access through the client getter', () => {
    const dir = fixture();
    fs.writeFileSync(path.join(dir, 'lib/getterLeak.ts'),
      "export const leak = (getSupabaseClient: () => { from(table: string): unknown }) => getSupabaseClient().from('user_progress');\n");
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lib/getterLeak.ts');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('passes when no feature file performs raw table/RPC access', () => {
    const dir = fixture();
    fs.mkdirSync(path.join(dir, 'lib/ai'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'lib/ai/authOnly.ts'),
      "export const ready = async (getSupabaseClient: () => { auth: { getSession(): Promise<unknown> } }) => Boolean(await getSupabaseClient().auth.getSession());\n");
    const result = run(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('GOVERNANCE AUDIT] PASS');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
