# Citation excerpt-on-tap — evidence (2026-11-19)

Branch `feat/citation-excerpt-on-tap`. Spec: `sprints/sprint_26_citation_excerpt_on_tap.md`.
Decision source: Daniel chose "Add excerpt-on-tap" for P2 citation UX
(`docs/evidence/m1-followups-decisions.md`).

## What changed

`components/ui/ChatBubble.tsx` (shared by tutor surfaces):
- `Citation` gained optional `excerpt`.
- A chip with a non-blank excerpt is a real pressable button (`accessibilityRole="button"`,
  `accessibilityLabel`, `accessibilityState.expanded`) that toggles the retrieved passage
  inline. Pressing again collapses it.
- A chip **without** an excerpt renders as an inert `View` with `accessibilityRole="text"`.
  No dead tap target, no false affordance (Constitution Art. I / fail closed).
- Only the pressed chip's excerpt is shown; excerpts never cross-wire.

`screens/tabs/study.tsx` already had its own excerpt sheet from an earlier commit — this change
does not remove it. `screens/tutor/session.tsx` still passes `citations={[]}`, so no learner
citation chips appear there yet; supplying them is part of the Phase 2 port, not this change.

## Proof — negative result recorded first

With `components/ui/ChatBubble.tsx` restored to its pre-fix `HEAD` version and the new tests
kept in place (`/tmp/opencode/citation-negative-colocated.log`):

```
NEGATIVE_EXIT=1
FAIL ... reveals the retrieved excerpt only after the chip is tapped, and collapses on re-tap
FAIL ... fails closed: a citation without an excerpt is not a button and never claims one
FAIL ... does not cross-wire excerpts between chips
Test Files  1 failed (1)
     Tests  3 failed | 5 passed (8)
```

With the fix restored, the same file: `Test Files 1 passed / Tests 8 passed (8)`.
No assertion, timeout or skip was changed to obtain green.

## Gates observed this session (all numbers from commands run)

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 158 warnings |
| `npm test` | 85 files / 492 tests passed (two consecutive clean runs) |
| `npm run test:flows` | 85 files / 492 tests passed |
| `node scripts/architecture/validate_boundaries.js` | 0 violations |
| `node scripts/qa/check-ai-boundary.mjs` | PASS |
| `npm run build` | exit 0 (`dist` export, PWA injected) |

### Observed, not hidden: QA runner timing flake (pre-existing)

`node scripts/qa/qa_runner.js` failed twice on this branch **and on unmodified `main`**
(`/tmp/opencode/qa-on-main.log`: 488/489) at the same test:
`tests/flows/quiz.wrongAnswers.test.ts > ... > generates structured single question ...`
— `Error: Test timed out in 5000ms`. The identical command passes when run directly
(`npm test`, `npm run test:flows`). No timeout was raised, no assertion loosened, no test
removed. Root cause is environmental timing under the QA runner's sequential child processes;
it is not introduced by this change.

Also observed while trialling a separate test file: an 86th test file reliably tipped the same
quiz test over 5 s (86 files / 491 of 492 passed; 85-file baseline 489/489 passed). The three
new tests were therefore co-located into the existing `tests/flows/answerSourceLabel.test.ts`
(already the `ChatBubble` suite) rather than adding a new worker. Test count rose 489 → 492;
no test was removed.

## Not claimed

No live browser/device E2E of the excerpt panel. The tutor session does not yet pass citations.
