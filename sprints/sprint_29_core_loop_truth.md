# Sprint 29 — Core-loop truth on the wired routes (G-01 / G-02)

Branch: `feat/core-loop-truth` (stacks on PR #13, tracker from Sprint 28).
Date: 2026-11-22. Spec before code, per Constitution Article VII / deterministic invariant 1.

## Directive

Replace fabricated behaviour on the two **wired, user-reachable** deep-link routes with the
governed paths the live app already uses, and prove it at the route boundary:

- **G-01** `screens/practice/index.tsx:96-102` hardcodes
  `What is the capital of ${topicName}?` / `Option A…D`; `markTopicDone` and
  `recordWrongAnswer` are destructured at `:40` but never called.
- **G-02** `screens/tutor/session.tsx:85` hardcodes the system prompt and `:206` passes
  `citations={[]}` to every `ChatBubble`; `clearMessages` (`:45`) is destructured but never
  called and the cleanup effect at `:63-67` is empty.

## Scope boundaries

- Route layer only. The governed generation/retrieval/progress layers are existing, tested
  production code; this sprint wires the real routes to them and adds route-level proof.
- No timeout, assertion, test or threshold may be weakened (personal rules 3/5; SOP 5).
- No `any` in new code. `Platform`/web guards must remain correct (`screens/practice/index.tsx:264`
  uses `window.location.href` — keep it web-safe or replace with a router-native equivalent).
- Translation keys used by new code must exist in all three packs (G-03 is a later layer, but
  this sprint must not add missing keys).
- Docs move with code: evidence, STATUS, CHANGELOG, README in the same PR.

## Acceptance criteria

1. A **real-route** test (mounts `app/practice/index.tsx`, not the screen helper) fails on the
   fake version and passes after the fix. It asserts:
   - the governed generation function is called with the real subject/topic;
   - its returned question/options/explanation are rendered;
   - no `What is the capital of` / `Option A` text appears;
   - a wrong answer calls the governed wrong-answer record and a finished quiz calls the
     governed score write; errors render the honest error state (fail closed).
2. A **real-route** test (mounts `app/tutor/session.tsx`) fails on the fake version and passes
   after the fix. It asserts:
   - the governed cited-answer/retrieval path is used, not the raw `askTutor` string call;
   - `ChatBubble` receives non-empty citations with excerpts from retrieved sources;
   - the answer-source label reflects the rail that actually answered;
   - when retrieval returns nothing, the UI shows the honest "not in notes" state rather than
     inventing a citation (fail closed).
3. Every new test is demonstrated to fail before its fix; the negative result is recorded in
   `docs/evidence/`.
4. Full gate set green: typecheck 0, lint 0 errors, tests (no new flake), boundaries 0,
   AI boundary PASS, build exit 0, QA runner green. No test count regression.
5. One concern per commit; hooks on; feature branch pushed; PR open to `main`.

## Out of scope (tracked separately)

G-03…G-05 false gates (Layer B), G-15/G-16 devices (Layer C), live-proof pack (Layer D),
unwired library/progress/setup screens, bulk hex/i18n/type debt.

## Result — 2026-11-22 (DONE at route/gate level)

- G-01 and G-02 implemented on the real wired routes; see
  `docs/evidence/2026-11-22-core-loop-truth.md` for the change inventory, the negative proofs
  (3/3 and 2/2 failures against the pre-fix files with the final test code) and the full gate
  outputs.
- Gates: typecheck 0; lint 0 errors / 149 warnings; tests 88 files / 498 tests; boundaries 0;
  AI boundary PASS; build exit 0; QA runner green. No assertion/timeout/threshold weakened.
- Live device/browser proof is still blocked on Daniel's credentials (G-10…G-14); not claimed.

