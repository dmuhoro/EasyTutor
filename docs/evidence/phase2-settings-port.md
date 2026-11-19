# Evidence — Phase 2 settings port-and-flip (Sprint 27)

Spec: `sprints/sprint_27_phase2_settings_port.md`.
Premise audit: `docs/evidence/phase2-premise-audit.md`.

## Commands and results (2026-11-19)

| Command | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npx tsc --noEmit` (QA runner's exact command) | 0 errors |
| `npm run lint` | 0 errors / 158 warnings |
| `npx vitest run tests/screens/phase2-settings.test.tsx` | 1 file / 1 test passed |
| `npx vitest run tests/smoke/routes.smoke.test.tsx` | 1 file / 44 tests passed |
| `npx vitest run tests/locales/keys.test.ts` | 1 file / 4 tests passed |
| `npm test` | 86 files / 490 tests passed |
| `npm run test:flows` | 86 files / 490 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `npm run check:ai-boundary` | PASS |
| `npm run build` | exit 0, Expo web export written to `dist/` |
| `node scripts/qa/qa_runner.js` | All systems verified (final run) |

## Negative proof (real path)

`app/settings.tsx` was temporarily reverted to `import('../screens/settings')`
(the older screen). The new test failed with
`AssertionError: expected '…' to contain 'powers document retrieval'` —
`Tests 1 failed (1)`. Restoring the explicit `screens/settings/index` import made it
pass — `Tests 1 passed (1)`. The test mounts the real route, not a helper: it asserts
the Phase-2-only locale string, the Ollama URL/model fields, model-status badges and
exactly one mounted `PortalSwitcher`.

## Known flake (recorded honestly)

One `qa_runner.js` run failed at `Flow Tests` before a clean rerun reported
`All systems verified`. The direct `npm test` and `npm run test:flows` runs both
passed 86/490. No timeout, assertion or test was loosened or skipped to obtain the
pass; this matches the pre-existing intermittent quiz timeout documented in the
prior release evidence.

## Secrets

No `.env*` file was read. No credential value was printed or committed.
