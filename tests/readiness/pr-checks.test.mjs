import { describe, expect, it } from 'vitest';
import { evaluateChecks } from '../../scripts/readiness/check-pr-checks.mjs';

const runUrl = 'https://github.com/dmuhoro/EasyTutor/actions/runs/45560024991/job/139021241478';
const green = [
  { name: 'build', bucket: 'pass', state: 'SUCCESS', link: `${runUrl.replace(/\/job\/\d+$/, '')}/job/139021241958` },
  { name: 'Real stack (Supabase CLI + full e2e)', bucket: 'pass', state: 'SUCCESS', link: runUrl },
  { name: 'Vercel Preview Comments', bucket: 'pass', state: 'SUCCESS', link: 'https://vercel.com/github' },
  { name: 'Supabase Preview', bucket: 'skipping', state: 'SKIPPED', link: 'https://supabase.com/dashboard' },
];

describe('C49 all-checks PR gate', () => {
  it('accepts only a fully reported green run with the journey checks passing', () => {
    const result = evaluateChecks(green);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.runUrls).toContain('https://github.com/dmuhoro/EasyTutor/actions/runs/45560024991');
  });

  it('rejects the vacuous empty result that --required produces on this repo', () => {
    expect(evaluateChecks([]).ok).toBe(false);
    expect(evaluateChecks([]).errors[0]).toContain('no checks reported');
  });

  it('rejects pending, failing and cancelled checks instead of treating them as proof', () => {
    for (const bucket of ['pending', 'fail', 'cancel']) {
      const result = evaluateChecks(green.map((check, index) => index === 0 ? { ...check, bucket } : check));
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toContain('not a pass');
    }
  });

  it('rejects a green-looking result when the real-stack journey check is skipped or missing', () => {
    const skipped = green.map((check) => check.name.startsWith('Real stack') ? { ...check, bucket: 'skipping' } : check);
    expect(evaluateChecks(skipped).ok).toBe(false);
    expect(evaluateChecks(green.filter((check) => !check.name.startsWith('Real stack'))).ok).toBe(false);
  });

  it('rejects a passing result with no traceable GitHub Actions run URL', () => {
    const result = evaluateChecks(green.map((check) => ({ ...check, link: 'https://vercel.com/github' })));
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('run URL');
  });
});
