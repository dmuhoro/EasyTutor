# Evidence — full codebase audit, 2026-11-22

Scope: HEAD `bd46cc4` (release `v1.15.0`), clean tree. Four parallel read-only audits;
load-bearing claims re-verified by the lead. No files changed during the audit, no builds
or test suites run during the audit, no `.env*` contents read.

Spec: `sprints/sprint_28_audit_and_completion_tracker.md`.

## A. Structure and wiring

```
for d in app screens components lib store src data supabase/migrations tests scripts docs archive; do printf '%-22s %s\n' "$d/" "$(find "$d" -type f | wc -l)"; done
```
```
app/ 42   screens/ 40   components/ 35   lib/ 80   store/ 9   src/ 101
data/ 4   supabase/migrations/ 41   tests/ 173   scripts/ 27   docs/ 255   archive/ 52
```

```
echo "app source files: $(find app -type f -name '*.tsx' | wc -l)"; echo "lazy wrappers: $(grep -rlF 'lazy(() => import' app/ | wc -l)"
```
```
app source files: 42   lazy wrappers: 35   _layout.tsx: 6   named-export wrappers: 3
```

All 35 wrappers are exactly 12 lines; only 7 `app/` files are real implementations (six
`_layout.tsx`, one inline `app/(auth)/login.tsx` at 307 lines).

```
w=0; u=0; for f in $(find screens -type f -name '*.tsx'); do m=${f#screens/}; m=${m%.tsx}; n=$(grep -rIF --include='*.ts' --include='*.tsx' -e "screens/$m'" -e "screens/$m\"" app/ | wc -l); if [ "$n" -gt 0 ]; then w=$((w+1)); else u=$((u+1)); fi; done; echo "total=$(find screens -type f -name '*.tsx' | wc -l) wired=$w unwired=$u"
```
```
total=40 wired=35 unwired=5
```

Unwired: `screens/library/index.tsx`, `screens/progress/index.tsx`, `screens/settings.tsx`
(superseded by `screens/settings/index.tsx`), `screens/setup/index.tsx`,
`screens/tabs/settings.tsx`. Lead re-verified zero `app/` imports for the four substantive ones.

Parallel implementations: settings ×3, library ×2, progress ×2, setup ×2.

Stale STATUS claim disproved:
```
grep -nF "from '../src/infrastructure/evidence'" store/mathJourneyStore.ts
5:import { supabaseEvidenceWriter } from '../src/infrastructure/evidence';
```

## B. Tech debt

```
rg -n --no-heading -g '*.{ts,tsx,js,jsx}' ':\s*any\b|\bas\s+any\b|<any>|any\[\]' src/ lib/ screens/ app/ components/ store/ | wc -l
```
```
115 matching lines / 123 occurrences / 59 files (src 25, lib 38, screens 35, app 4, components 7, store 6)
```

Hex literals (two defensible methods; STATUS's "233" is reproducible under neither):
```
rg -n '#[0-9a-fA-F]{3,6}' app/ src/ components/ lib/ store/ | wc -l        # 226 lines
rg -o '#[0-9a-fA-F]{3,6}' app/ src/ components/ lib/ store/ | wc -l        # 289 occurrences
rg -n -g '*.{ts,tsx,js,jsx}' '#[0-9a-fA-F]{3,8}' app/ src/ components/ lib/ store/ screens/ | wc -l  # 813 lines
rg -o ... (same pattern) | wc -l                                            # 1036 occurrences
```
Screens alone: 587 matching lines. Top file: `screens/shared/learning-dashboard.tsx` (130 occurrences).

i18n:
```
rg -l 'import { ... t ... } from locales' app/ components/ screens/ src/ | wc -l   # 10
rg -l '<Text[ >]' app/ components/ screens/ | wc -l                                # 64
comm -23 ... | wc -l                                                              # 54 of 64 never import t
```
≥476 literal `<Text>` child lines by two regexes. Missing-key proof: `subjects.math`,
`subjects.physics`, `subjects.chemistry`, `subjects.biology`, `subjects.computer_science`,
`subjects.history`, `back` → **0** matches across `src/locales/*.json`.

Marker scan: 85 total — TODO 4, STUB 5, PLACEHOLDER 52 (23 JSX props, 29 semantic), MOCK 22, FAKE 2.

Wired fake paths (lead re-verified):
```
sed -n '94,103p' screens/practice/index.tsx
question: `What is the capital of ${topicName}?`,
options: ['Option A', 'Option B', 'Option C', 'Option D'],
grep -n 'citations=' screens/tutor/session.tsx
206:  citations={[]}
```
`markTopicDone` / `recordWrongAnswer` destructured at `screens/practice/index.tsx:40` but never called.
`screens/library/index.tsx:45-108` seeds three hardcoded documents and a fake import with inert handlers.
`screens/setup/index.tsx:74-81` persists only `setOnboardingComplete(true)`.

## C. Cross-device readiness

```
test -d android && echo ANDROID_DIR_EXISTS                  # exists
git ls-files android | wc -l                                 # 0
grep -n android .gitignore                                   # 41:/android
test -f eas.json && echo EAS_JSON_EXISTS                     # exists
grep -n '"orientation"\|"package"\|"developmentClient"\|"buildType"' app.json eas.json
app.json:6:  "orientation": "portrait",
app.json:29:  "package": "com.danielmuhoro.easytutor"
eas.json:8:  "developmentClient": true
eas.json:14:  "buildType": "apk"
grep -n 'loginRouteTransferredBytes' perf-budget.json
6:  "loginRouteTransferredBytes": 733000
```
Native `android/` is git-ignored prebuild output; `expo-dev-client` means a dev build is needed.
No device E2E proof (`docs/evidence/p0-live-proof-attempt-2026-11-19.md:60-61`).

Platform adaptations: `Platform.select` 0, `platform-suffixed files` 0, `useWindowDimensions` 2
(both `app/(tabs)/_layout.tsx:7,12`; the only viewport rule is `isWide = width >= 768` → 80px rail).
`maxWidth` 0, `grid-cols` 0, `hover:` 0, `tailwind.config.js` has no `screens` config.
Portrait is locked in `app.json:6`, `public/manifest.json:8` and `AndroidManifest.xml:19`.
No desktop Lighthouse measurement exists in the repo.

PWA: manifest + service worker + rewrites present; `screenshots: []`; installability unscored.
A11y: 191 `TouchableOpacity`, 23 `accessibilityLabel`, 8 files with labels, no 44px rule; axe
0 critical/serious at 390/1280 with one moderate landmark finding.

Web perf (`docs/evidence/ground-truth-2026-11-18.md:170-183`): Lighthouse mobile `/` 49,
`/login` 58 (target ≥ 80); login transfer 732,396 B against 733,000 B (604 B headroom);
`perf:budget` gzip 437,125/450,000 B, raw 1,671,056/1,750,000 B, 39 chunks.

## D. Gates and CI

```
grep -c '^      - name:' .github/workflows/ci.yml                 # 17
grep -c "{ name:" scripts/qa/qa_runner.js                        # 4
grep -n "maxWorkers\|testTimeout" vitest.config.js               # 12: maxWorkers: 4; no testTimeout
```
CI triggers on push/PR to main/master only; no `if:`, `continue-on-error` or `paths:`.
`e2e:full` is defined but never invoked by CI; integration tests excluded from `npm test`.

Quiz timeout root cause (not a product bug): the test exercises `PipelineExecutor`
(`tests/flows/quiz.wrongAnswers.test.ts:5,146-165`), not `useOrchestration`. Its real request
graph has `timeoutMs: 12_000, retries: 1` (`hybridInferenceRouter.ts:127-141`), while Vitest
uses the default 5,000 ms with 4 workers. Observed 1.39 s isolated vs 5,040 ms under load
(`docs/evidence/m1-final-gates.md:22,28`).

False gates verified by lead:
```
tail -8 scripts/full-audit.sh
} > "$OUTPUT" 2>&1
echo "Audit saved to: $OUTPUT"      # no set -e; command always exits 0; madge undeclared
sed -n '21,34p' scripts/security/check_secret_exposure.mjs
const SCAN_DIRS = ['app','components','hooks','lib','services','store','src','utils','constants','features','shared'];
if (INCLUDE_DIST) SCAN_DIRS.push('dist');   # screens/, tests/, scripts/ never scanned in CI
```
Locale gate BFS starts at `app/` only (`tests/locales/keys.test.ts:20,57`); 7 keys used by
unwired `screens/setup/index.tsx` are absent from all three locale packs yet the gate passes.
AI-boundary and architecture-boundary gates are regex/scope-limited
(`check-ai-boundary.mjs:31-50`, `validate_boundaries.js:5-46`). `Database.getClient()` returns
`globalThis.__MOCK_SUPABASE_CLIENT__` first in production code (`src/infrastructure/database/index.ts:20-22`).

Perf ratchet was raised 730,843 → 733,000 B (+2,157 B) in commit `9b90e6e`.

## Gate results on the release commit (lead, this session)

`npm run typecheck` 0 errors · `npm run lint` 0 errors / 158 warnings · `npm test`
86 files / 493 tests · boundaries 0 violations · `npm run check:ai-boundary` PASS ·
`npm run build` exit 0 · `node scripts/qa/qa_runner.js` all systems verified (clean retry) ·
CI `build` and `Supabase Preview` success.

During this sprint's gate run the QA runner failed once at `Flow Tests` with
`Error: Test timed out in 5000ms` (the documented G-06 quiz flake), then passed on an
immediate retry with all systems verified. Direct `npm test` also passed 86/493. No timeout,
assertion or test was changed to obtain the pass.
