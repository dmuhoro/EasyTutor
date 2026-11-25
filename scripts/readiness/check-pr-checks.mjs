#!/usr/bin/env node
/**
 * C49 — real all-checks pull-request gate.
 *
 * `gh pr checks --required` is a false gate on this repository: no checks are
 * marked required, so it exits 0 with "no required checks reported". This
 * checker refuses to pass unless:
 *   1. checks were actually reported;
 *   2. every non-skipped check is a pass;
 *   3. the two checks that prove the learner journey (build + real stack) are
 *      explicitly passing; and
 *   4. at least one passing check carries a GitHub Actions run URL.
 *
 * Skipped integration checks (e.g. Supabase Preview) are allowed but never
 * counted as proof. Pending, failing, cancelled, timing-out and unknown states
 * all fail closed. Exit 8 from `gh pr checks` (pending) is also a failure.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REQUIRED_PASSING = ['build', 'Real stack (Supabase CLI + full e2e)'];
const ALLOWED_BUCKETS = new Set(['pass', 'skipping']);
const RUN_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+/;

export function evaluateChecks(checks) {
  const errors = [];
  if (!Array.isArray(checks) || checks.length === 0) {
    return { ok: false, errors: ['no checks reported on this pull request'], runUrls: [] };
  }
  for (const check of checks) {
    const name = typeof check?.name === 'string' ? check.name : '<unnamed check>';
    if (!ALLOWED_BUCKETS.has(check?.bucket)) {
      errors.push(`${name}: state ${String(check?.bucket ?? 'unknown')} is not a pass`);
    }
  }
  for (const name of REQUIRED_PASSING) {
    if (!checks.some((check) => check?.name === name && check?.bucket === 'pass')) {
      errors.push(`required journey check is not passing: ${name}`);
    }
  }
  const runUrls = [...new Set(
    checks
      .filter((check) => check?.bucket === 'pass' && RUN_URL.test(check.link ?? ''))
      .map((check) => String(check.link).replace(/\/job\/\d+$/, '')),
  )];
  if (runUrls.length === 0) errors.push('no passing GitHub Actions run URL to cite as evidence');
  return { ok: errors.length === 0, errors, runUrls };
}

function main() {
  const pr = process.argv[2] ?? process.env.PR_NUMBER;
  if (!pr) {
    console.error('[PR CHECKS] FAIL — pass a PR number/URL or set PR_NUMBER; refusing to guess.');
    process.exit(1);
  }
  let checks;
  try {
    checks = JSON.parse(execFileSync('gh', [
      'pr', 'checks', pr, '--json', 'name,state,bucket,link',
    ], { encoding: 'utf8' }));
  } catch (error) {
    console.error(`[PR CHECKS] FAIL — could not read checks for ${pr}: ${String(error.message ?? error).split('\n')[0]}`);
    process.exit(1);
  }
  const result = evaluateChecks(checks);
  if (!result.ok) {
    console.error(`[PR CHECKS] FAIL — PR ${pr}:`);
    for (const error of result.errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`[PR CHECKS] PASS — PR ${pr}: all ${checks.length} checks reported; no pending or failing check.`);
  for (const url of result.runUrls) console.log(`  run: ${url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
