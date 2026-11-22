# Evidence — closing the false gates (G-03 / G-04 / G-05)

Date: 2026-11-22 · Branch: `feat/truthful-gates` (stacks on Sprint 29 / PR #14) ·
Spec: `sprints/sprint_30_truthful_gates.md`.

Each gate was first observed passing while the real path was broken, then made to reject
the thing it previously missed. No assertion, timeout or threshold was weakened.

## G-03 — locale coverage gate

**Baseline (before):** `npx vitest run tests/locales/keys.test.ts -c vitest.config.js`
→ `Test Files 1 passed (1)`, `Tests 4 passed (4)`, while a direct walk of the same algorithm
reported:

```
CURRENT gate reachability (app/ graph): 287 files / 131 t() keys
Keys used by screens/setup/index.tsx: 25
Missing from ALL three packs: 7 [ 'back', 'subjects.biology', 'subjects.chemistry',
  'subjects.computer_science', 'subjects.history', 'subjects.math', 'subjects.physics' ]
Are any of those in the gate usedKeys? []
Gate result: PASS (4/4) despite the above
```

`screens/setup/index.tsx` is not routed today, but a missing pack key is still a raw-key
defect the moment it is wired.

**Fix:** the gate seeds its import-graph walk from `app/` **and** `screens/`, asserts the seven
previously invisible keys are now in scope, and keeps all four original assertions unchanged.
The seven keys were added with real copy to `en`, `sw` and `fr`. Because packs use flat
dotted keys, `t()` now resolves a literal flat key before its legacy nested traversal —
otherwise a key present in the pack would still render as its own raw name.

**Negative proof A — runtime resolver:** with the final test file and the pre-fix
`src/locales/index.ts` restored from `HEAD`:

```
npx vitest run tests/locales/runtime-dotted-keys.test.ts -c vitest.config.js
  Test Files  1 failed (1)
       Tests  3 failed | 1 passed (4)
  - expect(t('subjects.math')).toBe('Mathematics')  → received 'subjects.math'
  - sw resolves every key: expected 'subjects.biology' not to be 'subjects.biology'
  - fr resolves every key: same
```

The one passing test is the deliberate fail-closed check for a genuinely unknown key.

**Negative proof B — gate:** with `subjects.math` removed from a copy of `en.json`:

```
npx vitest run tests/locales/keys.test.ts -c vitest.config.js
  Test Files  1 failed (1)
       Tests  2 failed | 3 passed (5)
  - every t() key exists in English
  - all packs declare the same key set (diff shows + "subjects.math")
```

With the fix: both locale test files pass, `2 files / 9 tests`.

## G-04 — full audit script

**Baseline:** the script had no `set -e`, redirected every command's output into a report and
always finished with `echo "Audit saved to: …"` and exit 0. It also called undeclared `madge`
at two points; `expo-doctor` is not installed and `expo doctor` is not a command in this Expo
CLI.

**Fix:** `scripts/full-audit.sh` now classifies steps explicitly:

- **Verification (gates the result):** typecheck, lint, tests, circular deps via the declared
  `lint:cycles`, architecture boundaries, AI boundary, secret guards. Any non-zero exit is
  counted; the script exits 1 if any verification failed.
- **Informational (recorded, never gates):** git status, `npm outdated`, `npm audit` — these
  legitimately report findings on a healthy tree.
- No `set -e` on purpose: every step runs so the report is complete. Undeclared `madge` and
  the unavailable doctor step were removed.

**Negative proof — real script, one failing step.** A PATH stub made `npm test` exit 7 while
all other commands ran normally:

```
PATH=<stub> ./scripts/full-audit.sh
  audit exit code: 1
  report: audits/full-audit-2026-11-22_21-32-44.txt (written despite the failure)
  VERIFICATION FAIL: TESTS (exit 7)
  AUDIT FAILED — 1 verification step(s) failed (see VERIFICATION FAIL above)
```

**Positive proof — green tree:** `npm run audit:full` exit 0, report
`audits/full-audit-2026-11-22_21-49-30.txt`:

```
VERIFICATION PASS: TYPESCRIPT CHECK / ESLINT / TESTS / CIRCULAR DEPENDENCIES /
                   ARCHITECTURE BOUNDARIES / AI BOUNDARY / SECRET GUARDS
INFORMATIONAL: OUTDATED PACKAGES exited 1 — recorded, does not gate this audit
INFORMATIONAL: SECURITY AUDIT exited 1 — recorded, does not gate this audit
AUDIT COMPLETE — all verification steps passed
```

Generated reports were removed after each proof; the tracked historical audit file is untouched.

## G-05 — secret and public-env guards

**Baseline:** both guards skipped `screens/`, `tests/`, `scripts/`, `supabase/` and `public/`;
the CI never inspected the exported bundle. Rules covered only service-role, Supabase secret,
Anthropic and JWT markers.

**Fix and scope decision:**

- `check_secret_exposure.mjs` now scans shipped dirs (`app`, `components`, `hooks`, `lib`,
  `screens`, `services`, `store`, `src`, `utils`, `constants`, `features`, `shared`, `public`,
  plus `dist` with `--include-dist`) **and** repo dirs (`tests`, `scripts`, `supabase`).
- All **value** rules (Supabase secret, Anthropic, Groq `gsk_`, Google `AIza`, OpenAI
  `sk-proj-` / `sk-`, service-role JWT) apply in every scanned directory.
- **Name** rules (`service_role`, `SUPABASE_SERVICE_ROLE_KEY`) apply only to shipped code.
  This is not a weakening: the repo dirs legitimately contain name references — a synthetic
  test JWT claim, `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` in the server-only Edge Function,
  and a "never add a server key" comment in the allowlist — while actual key material is still
  detected there.
- `check_public_env_allowlist.mjs` now walks all source directories including `screens/`,
  `tests/`, `scripts/`, `supabase/` and `public/`.
- New `npm run guard:dist` runs the secret guard with `--include-dist`; CI executes it **after**
  the web export.

**Negative proofs (synthetic, non-functional fixtures created only for the run and removed):**

```
node scripts/security/check_secret_exposure.mjs   → exit 1
      Groq API key -> screens/__guard_secret_fixture.ts
      Google API key -> screens/__guard_secret_fixture.ts
      OpenAI project key -> screens/__guard_secret_fixture.ts
      OpenAI API key -> screens/__guard_secret_fixture.ts
  value leakage check: no fixture value printed

node scripts/security/check_public_env_allowlist.mjs → exit 1
      FAIL: EXPO_PUBLIC_NOT_ALLOWED is used in client code but is not in
            scripts/public-env-allowlist.txt
      screens/__guard_public_env_fixture.ts

node scripts/security/check_secret_exposure.mjs --include-dist → exit 1
      Groq API key -> dist/__guard_dist_fixture.js
```

**Post-fix counts:** source guard 444 files scanned; exported-bundle guard 489 files;
public-env guard 2 allowlisted names checked. No fixture or generated audit report remains in
the tree.

## Final gates (this branch, final tree)

| Gate | Command | Actual result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | exit 0, 0 errors |
| Lint | `npm run lint` | 0 errors / 149 warnings |
| Declared imports | `npm run check:imports` | PASS — 419 files scanned |
| Tests | `npm test` | **89 files / 503 tests passed** (was 88 / 498) |
| Architecture | `node scripts/architecture/validate_boundaries.js` | `[AUDIT PASSED] No architecture violations found.` |
| AI boundary | `npm run check:ai-boundary` | PASS |
| Source guards | `npm run guard:secrets` | 444 files; 2 EXPO_PUBLIC_* names |
| Bundle guard | `npm run guard:dist` | 489 files |
| Web build | `npm run build` | exit 0, PWA assets injected |
| QA runner | `node scripts/qa/qa_runner.js` | `[QA] All systems verified. Ready for release.` |
| Full audit | `npm run audit:full` | exit 0, all verification steps passed |

## Not claimed

- No browser, device, live Supabase or Vercel proof; those remain Layer C/D blockers.
- `npm outdated` and `npm audit` report findings (both exited 1 in this run). They are recorded
  by the audit script as informational, not silently treated as passes or as gates.
- Lighthouse P1 ≥ 80 remains NOT MET by the existing decision; no budget changed.
