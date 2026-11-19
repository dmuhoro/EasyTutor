# Sprint 26 — Citation excerpt-on-tap (P2 decision)

**Date:** 2026-11-19
**Decision source:** Daniel's answer "Add excerpt-on-tap" to the P2 citation-UX question, recorded
in `docs/evidence/m1-followups-decisions.md`.

## Requirement

A learner tapping a citation chip on an AI answer must see the retrieved passage that the chip
references. The study tab already had an excerpt sheet; the shared `ChatBubble` used by tutor
surfaces rendered chips with no press handler and no excerpt data — a false affordance.

## Scope

- Extend `Citation` with optional `excerpt`.
- Make a chip with a non-blank excerpt a real pressable control that toggles the passage inline.
- Keep a chip without an excerpt inert (`accessibilityRole="text"`), so the UI never advertises
  a capability it does not provide (Constitution Art. I).
- Never show another chip's excerpt.

## Non-goals

- No new navigation, modal/overlay, or change to the study tab's existing excerpt sheet.
- No retrieval work in `screens/tutor/session.tsx`; it still passes no citations. Supplying them
  belongs to the Phase 2 port decision.
- No live browser/device E2E this sprint.

## Acceptance gates

- Negative proof: the new tests fail against the pre-fix component.
- typecheck 0; lint 0 errors; tests green; boundaries 0 violations; AI boundary PASS; build exit 0.
- Evidence under `docs/evidence/`, README/STATUS/CHANGELOG updated in the same change.

**Result:** see `docs/evidence/citation-excerpt-on-tap.md`.
