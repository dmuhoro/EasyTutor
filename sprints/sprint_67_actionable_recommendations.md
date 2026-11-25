# Sprint 67 — Actionable recommendations on Home

## Spec / real boundary

Capability work: a recommended topic returned by the real governed selector must
be actionable from the reachable Home screen, not merely displayed. Real
boundary was `screens/tabs/index.tsx`; no new endpoint, store, import or locale
key was added.

## Change

- Recommendation cards are now `TouchableOpacity` controls with a 48 px minimum
  target and an accessibility label (`Practice <topic>`).
- Tapping pushes `/(tabs)/study` with `topic`, the active roadmap `subjectId`
  and `mode: 'Teach & Quiz'` — the same route contract already used by weak-spot
  cards on the same screen.
- Existing empty/error behaviour is unchanged: no selector result means no
  section and no invented topic.

## Proof

New real-screen test was red before the change (`1 failed / 3 passed`) and green
after (`4 passed`). Full gate green locally: 112 files / 597 tests, login
**732,972 / 733,000 B PASS** (no shared-chunk growth). Evidence:
`docs/evidence/sprint67-actionable-recommendations.md`.

Registered test counts in `AGENTS.md` and GT-21 were updated to 597 to stay
truthful. No CI-only status was promoted before a pushed green run.
