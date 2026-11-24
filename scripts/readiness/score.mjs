#!/usr/bin/env node
/**
 * Completion Register validator, scorer and READINESS.md generator.
 *
 * Usage:
 *   node scripts/readiness/score.mjs check   validate + assert READINESS.md is current
 *   node scripts/readiness/score.mjs score   validate + write READINESS.md + print scores
 *   node scripts/readiness/score.mjs next    validate + print the next unblocked rows
 *
 * No thresholds are configurable: the 80% ready bar, the status/priority weights and the
 * critical-path rule are fixed by docs/readiness/register.json and this file.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
// Path overrides exist so the unit test can exercise the real validator against throwaway
// fixtures; they never change a weight, threshold or readiness rule.
const REGISTER_PATH = process.env.READINESS_REGISTER
  ? path.resolve(process.env.READINESS_REGISTER)
  : path.join(ROOT, 'docs', 'readiness', 'register.json');
const READINESS_PATH = process.env.READINESS_OUTPUT
  ? path.resolve(process.env.READINESS_OUTPUT)
  : path.join(ROOT, 'docs', 'READINESS.md');
const COMMAND_PREFIXES = ['npm ', 'node ', 'npx ', 'bash ', 'sh ', 'test ', 'grep ', 'gh ', 'supabase ', 'for ', 'echo '];
const EVIDENCE_TAGS = ['file:', 'test:', 'run:', 'command:'];

function loadRegister() {
  return JSON.parse(fs.readFileSync(REGISTER_PATH, 'utf8'));
}

function validate(reg) {
  const errors = [];
  const byId = new Map();
  const priorities = Object.keys(reg.scoring.priority);
  const statuses = Object.keys(reg.scoring.status);
  const waves = reg.waves;
  const required = ['id', 'title', 'milestones', 'priority', 'status', 'evidence', 'acceptance', 'owner', 'epic', 'wave', 'depends_on'];

  for (const row of reg.rows) {
    const tag = `row ${row?.id ?? '?'}`;
    for (const key of required) {
      if (!(key in (row ?? {}))) errors.push(`${tag}: missing field ${key}`);
    }
    if (errors.length && !row?.id) continue;

    if (byId.has(row.id)) errors.push(`${tag}: duplicate id`);
    else byId.set(row.id, row);
    if (!priorities.includes(row.priority)) errors.push(`${tag}: bad priority ${row.priority}`);
    if (!statuses.includes(row.status)) errors.push(`${tag}: bad status ${row.status}`);
    if (!['agent', 'daniel', 'both'].includes(row.owner)) errors.push(`${tag}: bad owner ${row.owner}`);
    if (!waves.includes(row.wave)) errors.push(`${tag}: bad wave ${row.wave}`);
    if (!Array.isArray(row.milestones) || row.milestones.length === 0) errors.push(`${tag}: milestones must be a non-empty array`);
    else for (const m of row.milestones) {
      if (!reg.milestones.includes(m)) errors.push(`${tag}: unknown milestone ${m}`);
    }
    if (!Array.isArray(row.evidence) || row.evidence.length === 0) errors.push(`${tag}: evidence must be a non-empty array`);
    else for (const e of row.evidence) {
      if (typeof e !== 'string' || !EVIDENCE_TAGS.some((p) => e.startsWith(p))) {
        errors.push(`${tag}: evidence must use one of ${EVIDENCE_TAGS.join(', ')} -> ${e}`);
        continue;
      }
      const m = /^(?:file|test):([^:]+)(?::\d+)?$/.exec(e);
      if (m && !fs.existsSync(path.join(ROOT, m[1]))) errors.push(`${tag}: evidence path does not exist: ${m[1]}`);
    }
    if (!Array.isArray(row.depends_on)) errors.push(`${tag}: depends_on must be an array`);
    if (typeof row.acceptance !== 'string' || row.acceptance.trim() === '') errors.push(`${tag}: missing acceptance command`);
    else if (!COMMAND_PREFIXES.some((p) => row.acceptance.startsWith(p))) {
      errors.push(`${tag}: acceptance is not a runnable command: ${row.acceptance}`);
    }
    if (row.status === 'VERIFIED-IN-CI' && !row.evidence.some((e) => e.startsWith('run:'))) {
      errors.push(`${tag}: VERIFIED-IN-CI requires a run: URL from gh pr checks`);
    }
    if (row.status === 'VERIFIED-LOCAL' && !row.evidence.some((e) => e.startsWith('file:') || e.startsWith('test:'))) {
      errors.push(`${tag}: VERIFIED-LOCAL requires a file: or test: evidence path`);
    }
    if (row.decision) {
      if (!row.recommended_default) errors.push(`${tag}: decision needs recommended_default`);
      if (!row.cost_of_delay) errors.push(`${tag}: decision needs cost_of_delay`);
    }
  }

  for (const row of reg.rows) {
    for (const dep of row.depends_on ?? []) {
      if (!byId.has(dep)) errors.push(`row ${row.id}: unknown dependency ${dep}`);
    }
  }

  // Cycle detection (iterative DFS, three colours).
  const colour = new Map();
  for (const row of reg.rows) {
    if (colour.get(row.id)) continue;
    const stack = [{ id: row.id, next: 0 }];
    colour.set(row.id, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const deps = byId.get(top.id)?.depends_on ?? [];
      if (top.next >= deps.length) { colour.set(top.id, 2); stack.pop(); continue; }
      const dep = deps[top.next++];
      if (colour.get(dep) === 1) errors.push(`dependency cycle: ${top.id} -> ${dep}`);
      else if (!colour.get(dep)) { colour.set(dep, 1); stack.push({ id: dep, next: 0 }); }
    }
  }

  // Every F requirement must be represented by at least one row.
  for (const fItem of reg.f_items) {
    if (!reg.rows.some((r) => (r.f_items ?? []).includes(fItem))) errors.push(`no row covers requirement ${fItem}`);
  }
  return errors;
}

const isVerified = (r) => r.status.startsWith('VERIFIED');

function scores(reg) {
  const out = {};
  for (const milestone of reg.milestones) {
    const rows = reg.rows.filter((r) => r.milestones.includes(milestone));
    const weight = (r) => reg.scoring.priority[r.priority];
    const denominator = rows.reduce((sum, r) => sum + weight(r), 0);
    const numerator = rows.reduce((sum, r) => sum + weight(r) * reg.scoring.status[r.status], 0);
    const pct = denominator ? numerator / denominator : 0;
    const openP0 = rows.filter((r) => r.priority === 'P0' && !isVerified(r)).length;
    const criticalNotCI = rows.filter((r) => r.critical_path && r.status !== 'VERIFIED-IN-CI').length;
    out[milestone] = {
      numerator, denominator, pct, openP0, criticalNotCI, rowCount: rows.length,
      ready: pct >= 0.8 && openP0 === 0 && criticalNotCI === 0,
    };
  }
  return out;
}

function nextRows(reg, limit = 12) {
  const byId = new Map(reg.rows.map((r) => [r.id, r]));
  const waveOrder = new Map(reg.waves.map((w, i) => [w, i]));
  const prioOrder = { P0: 0, P1: 1, P2: 2 };
  return reg.rows
    .filter((r) => !isVerified(r) && r.depends_on.every((d) => byId.has(d) && isVerified(byId.get(d))))
    .sort((a, b) =>
      (waveOrder.get(a.wave) - waveOrder.get(b.wave)) ||
      (prioOrder[a.priority] - prioOrder[b.priority]) ||
      a.id.localeCompare(b.id))
    .slice(0, limit);
}

function render(reg, result) {
  const byId = new Map(reg.rows.map((r) => [r.id, r]));
  const lines = [];
  lines.push('# READINESS — EasyTutor');
  lines.push('');
  lines.push('> GENERATED FILE — do not edit. Change `docs/readiness/register.json`, then run');
  lines.push('> `npm run readiness:score`. CI rejects a stale or hand-edited file via `readiness:check`.');
  lines.push('');
  lines.push('Scoring is computed, never typed: `VERIFIED-IN-CI` 1.0 · `VERIFIED-LOCAL` 0.6 ·');
  lines.push('`IMPLEMENTED-UNPROVEN` 0.3 · `PARTIAL` 0.2 · `MISSING` 0; weights P0 3 / P1 2 / P2 1.');
  lines.push('READY iff score ≥ 80% **and** zero open P0 rows **and** every critical-path row is `VERIFIED-IN-CI`.');
  lines.push('');
  lines.push('## Verdict');
  lines.push('');
  lines.push('| Milestone | Score | Arithmetic | Rows | Open P0 | Critical path not CI | READY |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const m of reg.milestones) {
    const s = result[m];
    lines.push(`| ${m} | ${(s.pct * 100).toFixed(1)}% | ${s.numerator.toFixed(2)} / ${s.denominator} | ${s.rowCount} | ${s.openP0} | ${s.criticalNotCI} | ${s.ready ? 'YES' : 'NO'} |`);
  }
  lines.push('');
  lines.push('## Next unblocked rows');
  lines.push('');
  lines.push('| ID | Title | Wave | Prio | Status | Owner |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of nextRows(reg)) {
    lines.push(`| ${r.id} | ${r.title} | ${r.wave} | ${r.priority} | ${r.status} | ${r.owner} |`);
  }
  lines.push('');
  lines.push('## Daniel-only steps');
  lines.push('');
  lines.push('| ID | Step | Priority | Acceptance |');
  lines.push('|---|---|---|---|');
  for (const r of reg.rows.filter((r) => r.owner === 'daniel')) {
    lines.push(`| ${r.id} | ${r.title} | ${r.priority} | \`${r.acceptance}\` |`);
  }
  lines.push('');
  lines.push('## Open decisions');
  lines.push('');
  lines.push('| ID | Decision | Recommended default | Cost of delay |');
  lines.push('|---|---|---|---|');
  for (const r of reg.rows.filter((r) => r.decision)) {
    lines.push(`| ${r.id} | ${r.title} | ${r.recommended_default} | ${r.cost_of_delay} |`);
  }
  lines.push('');
  lines.push('## Non-goals for v1');
  lines.push('');
  for (const n of reg.non_goals) lines.push(`- ${n}`);
  lines.push('');
  lines.push('## Full register');
  lines.push('');
  lines.push('| ID | Title | Milestones | Prio | Status | Owner | Epic | Wave | Depends on |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of reg.rows) {
    const ms = r.milestones.map((m) => m.replace('V1-', '')).join(', ');
    const deps = r.depends_on.length ? r.depends_on.join(', ') : '—';
    lines.push(`| ${r.id} | ${r.title} | ${ms} | ${r.priority} | ${r.status} | ${r.owner} | ${r.epic} | ${r.wave} | ${deps} |`);
  }
  lines.push('');
  // Silence an unused-variable warning in a deterministic way: prove all deps resolve.
  if (byId.size !== reg.rows.length) lines.push('<!-- register id mismatch -->');
  return lines.join('\n') + '\n';
}

function printScores(result) {
  for (const [milestone, s] of Object.entries(result)) {
    console.log(`${milestone.padEnd(13)} ${(s.pct * 100).toFixed(1).padStart(5)}%  arithmetic ${s.numerator.toFixed(2)}/${s.denominator}  openP0=${s.openP0}  criticalNotCI=${s.criticalNotCI}  READY=${s.ready ? 'YES' : 'NO'}`);
  }
}

function main() {
  const mode = process.argv[2] ?? 'check';
  if (!['check', 'score', 'next'].includes(mode)) {
    console.error(`usage: score.mjs [check|score|next] (got ${mode})`);
    process.exit(1);
  }
  const reg = loadRegister();
  const errors = validate(reg);
  if (errors.length) {
    console.error('REGISTER INVALID');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const result = scores(reg);

  if (mode === 'next') {
    const rows = nextRows(reg, Number(process.argv[3] ?? 12));
    for (const r of rows) console.log(`${r.wave} ${r.priority} ${r.id.padEnd(8)} ${r.status.padEnd(22)} ${r.title}`);
    return;
  }

  const md = render(reg, result);
  if (mode === 'check') {
    const onDisk = fs.existsSync(READINESS_PATH) ? fs.readFileSync(READINESS_PATH, 'utf8') : '';
    if (onDisk !== md) {
      console.error('READINESS.md is stale or hand-edited. Run `npm run readiness:score` to regenerate.');
      process.exit(1);
    }
    console.log(`Readiness register valid (${reg.rows.length} rows); READINESS.md is current.`);
    printScores(result);
    return;
  }
  fs.writeFileSync(READINESS_PATH, md);
  console.log(`Wrote ${path.relative(ROOT, READINESS_PATH)} from ${reg.rows.length} rows.`);
  printScores(result);
}

main();
