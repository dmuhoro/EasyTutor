import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = path.resolve('scripts/readiness/score.mjs');
let dir, registerPath, outputPath;

function baseRegister(rows = []) {
  return {
    schema_version: '1.0.0',
    scoring: {
      status: { 'VERIFIED-IN-CI': 1, 'VERIFIED-LOCAL': 0.6, 'IMPLEMENTED-UNPROVEN': 0.3, PARTIAL: 0.2, MISSING: 0 },
      priority: { P0: 3, P1: 2, P2: 1 },
    },
    f_items: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'],
    milestones: ['PILOT', 'V1-ACADEMIC', 'V1-POLYMATH', 'WORLD-CLASS'],
    waves: ['R0', 'W1', 'W2', 'W3', 'W4', 'W5'],
    non_goals: ['payments'],
    rows: [
      { id: 'FX', title: 'coverage', milestones: ['PILOT'], priority: 'P2', status: 'MISSING',
        evidence: ['file:package.json'], acceptance: 'npm run readiness:check', owner: 'agent',
        epic: 'FREQ', wave: 'W1', depends_on: [], f_items: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'] },
      ...rows,
    ],
  };
}

function row(overrides = {}) {
  return {
    id: 'A', title: 'alpha', milestones: ['PILOT'], priority: 'P0', status: 'MISSING',
    evidence: ['file:package.json'], acceptance: 'npm test', owner: 'agent', epic: 'E1',
    wave: 'W1', depends_on: [], ...overrides,
  };
}

function run(mode, reg = baseRegister(), extra = []) {
  fs.writeFileSync(registerPath, JSON.stringify(reg, null, 2));
  const res = spawnSync(process.execPath, [SCRIPT, mode, ...extra], {
    encoding: 'utf8',
    env: { ...process.env, READINESS_REGISTER: registerPath, READINESS_OUTPUT: outputPath },
  });
  return { status: res.status, out: res.stdout + res.stderr };
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-'));
  registerPath = path.join(dir, 'register.json');
  outputPath = path.join(dir, 'READINESS.md');
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('readiness scorer', () => {
  it('computes the weighted score by arithmetic, never from a typed percentage', () => {
    const reg = baseRegister([
      row(),
      row({ id: 'B', title: 'beta', priority: 'P1', status: 'VERIFIED-LOCAL', evidence: ['test:tests/readiness/score.test.mjs'] }),
    ]);
    const { status, out } = run('score', reg);
    expect(status).toBe(0);
    // P0 MISSING = 0*3; P1 VERIFIED-LOCAL = 0.6*2 = 1.2; P2 MISSING = 0*1.
    // F coverage row P2 MISSING = 0. Denominator = 3 + 2 + 1 = 6 -> 1.2/6 = 20.0%.
    expect(out).toContain('20.0%');
    expect(out).toContain('arithmetic 1.20/6');
  });

  it('marks a milestone READY only at 80% with no open P0 and no non-CI critical path', () => {
    const reg = baseRegister([
      row({ status: 'VERIFIED-IN-CI', evidence: ['file:package.json', 'run:https://github.com/x/actions/runs/1'] }),
      row({ id: 'B', priority: 'P2', status: 'VERIFIED-IN-CI', evidence: ['run:https://github.com/x/actions/runs/2'] }),
    ]);
    const { status, out } = run('score', reg);
    expect(status).toBe(0);
    expect(out).toContain('READY=YES');
    const blocked = baseRegister([
      row({ status: 'VERIFIED-LOCAL', critical_path: true, evidence: ['file:package.json'] }),
      row({ id: 'B', priority: 'P2', status: 'VERIFIED-IN-CI', evidence: ['run:https://github.com/x/actions/runs/2'] }),
    ]);
    const second = run('score', blocked);
    expect(second.status).toBe(0);
    expect(second.out).toContain('criticalNotCI=1  READY=NO');
  });

  it('rejects duplicate ids, dependency cycles and unknown F coverage', () => {
    expect(run('check', baseRegister([row(), row()])).out).toContain('duplicate id');
    expect(run('check', baseRegister([row({ depends_on: ['B'] }), row({ id: 'B', depends_on: ['A'] })])).out).toContain('dependency cycle');
    const noF2 = baseRegister();
    for (const r of noF2.rows) r.f_items = r.f_items.filter((x) => x !== 'F2');
    expect(run('check', noF2).out).toContain('no row covers requirement F2');
  });

  it('rejects unverifiable VERIFIED rows and P0 rows without an acceptance command', () => {
    expect(run('check', baseRegister([row({ status: 'VERIFIED-IN-CI' })])).out).toContain('requires a run: URL');
    expect(run('check', baseRegister([row({ status: 'VERIFIED-LOCAL', evidence: ['command:echo x'] })])).out).toContain('requires a file: or test:');
    expect(run('check', baseRegister([row({ acceptance: '' })])).out).toContain('missing acceptance command');
  });

  it('rejects evidence that exists locally but is not tracked in git', () => {
    // Regression for the R0 CI failure: `android/` exists in a developer tree (gitignored,
    // generated) but not in a clean clone. A working-tree existence check gave false
    // confidence locally and failed in CI. The gate must model the clean clone.
    const res = run('score', baseRegister([row({ evidence: ['file:android/'] })]));
    expect(res.status).toBe(1);
    expect(res.out).toContain('not tracked in git');
  });

  it('accepts directory evidence backed by tracked files but rejects an untracked directory', () => {
    const good = run('score', baseRegister([row({ evidence: ['file:scripts/db/'] })]));
    expect(good.status).toBe(0);
    const bad = run('score', baseRegister([row({ evidence: ['file:docs/definitely-absent/'] })]));
    expect(bad.status).toBe(1);
    expect(bad.out).toContain('not tracked in git');
  });

  it('rejects a VERIFIED row whose acceptance names a script that is not in the tree', () => {
    const res = run('check', baseRegister([row({
      status: 'VERIFIED-LOCAL',
      acceptance: 'node scripts/design/nonexistent-gate.mjs',
      evidence: ['file:package.json'],
    })]));
    expect(res.out).toContain('VERIFIED acceptance references untracked script');
  });

  it('rejects a stale generated READINESS.md', () => {
    run('score', baseRegister([row()]));
    fs.writeFileSync(outputPath, 'hand edited\n');
    const res = run('check', baseRegister([row()]));
    expect(res.status).toBe(1);
    expect(res.out).toContain('stale or hand-edited');
  });

  it('prints the next unblocked rows by wave then priority', () => {
    const reg = baseRegister([
      row({ id: 'LATE', wave: 'W3', priority: 'P2', title: 'late work' }),
      row({ id: 'EARLY', wave: 'W1', priority: 'P1', title: 'early work' }),
      row({ id: 'BLOCKED', wave: 'W1', priority: 'P0', title: 'blocked work', depends_on: ['LATE'] }),
    ]);
    const { status, out } = run('next', reg);
    expect(status).toBe(0);
    const ids = out.trim().split('\n').map((l) => l.split(/\s+/)[2]);
    expect(ids[0]).toBe('EARLY');
    expect(ids).not.toContain('BLOCKED');
  });
});
