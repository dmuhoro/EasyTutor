# Sprint 93 — visible back affordance in the tutor session (red/green)

**Date:** 2026-11-28 · **Base:** `main` `156a78c` · **Spec:**
`sprints/sprint_93_tutor_back_affordance.md`

## Real path under test

`app/_layout.tsx:364` hides native headers for every route. Sprint 92 made Home's
"Ask a question" action open `/tutor/session`, but `screens/tutor/session.tsx`
offered no visible back control; the Stitch tutor-session reference includes a
header `arrow_back`. The test mounts the real route wrapper and finds the actual
rendered control.

## Red — before the fix

`npx vitest run tests/screens/phase2-tutor-session.test.tsx`

```
AssertionError: expected undefined to be defined
 ❯ tests/screens/phase2-tutor-session.test.tsx:162:18
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

## Change

`screens/tutor/session.tsx` header row only: one 44×44 accessible
`TouchableOpacity` labelled with the existing `t('back')` key, calling
`router.back()`, using existing `surface` tokens and Ionicons. No other layout,
copy, data flow, cap, budget, threshold or matcher changed.

## Green — after the fix

```
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

The two pre-existing cited-answer and not-in-notes tests remain byte-identical
and pass.

## Full local gate

Typecheck 0 errors, lint 0 errors (129 pre-existing warnings), `npm test`
119 files / 634 tests, boundaries 0 violations, QA verified, readiness unchanged,
`npm run build` exit 0, `npm run e2e:full` 5/5 against the real local Supabase
stack.

## Governance

- No readiness row promoted; no gate file fabricated.
- No secret, token, credential, learner datum or Stitch key in this change.
- README moves with the behaviour in the same change.
