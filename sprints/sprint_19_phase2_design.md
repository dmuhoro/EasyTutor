# Sprint 19 — Phase 2: World-Class UI (EasyTutor)

Date: 2026-11-16. Branch: `phase2-design` from `origin/main` @ `2d7e113`.

Goal: EasyTutor looks and feels like a premium, calm, fast learning app that a 17-year-old on a mid-range Android on mobile data would trust, and works equally well on a laptop.

Spec: Phase 2 directive (World-Class UI). Design: `docs/design/DESIGN.md`.

Rules for this sprint:
- One commit per task, never `--no-verify`.
- No push, merge, tag, production deploy, `vercel` CLI, or Supabase dashboard/production access.
- Every number in the report comes from a command run in the session.
- User-facing strings go through locale files (EN complete; SW and FR flagged DRAFT).
- No dark patterns: no guilt streaks, no fake urgency.

## Step 0 — Design system (DONE)

`docs/design/DESIGN.md` — one page covering:
- Palette: dark-first (`#0d0f12` base), light mode variants for every colour group
- Type scale: Syne (display) + DM Sans (body), variable font subset
- Spacing: 4/8 grid (0–64px)
- Radii: 8px–40px + full
- Elevation: surface layering, no drop shadows on dark
- Motion: reduced motion respected, decorative only
- Icons: Ionicons only
- Voice: calm, one clear next action per screen, no guilt streaks, no fake urgency

## Step 1 — Tokens and components (DONE)

Tokens:
- `src/design/tokens.ts` — `COLORS_LIGHT`, `getColor(group, shade, scheme)`, backward-compatible flat `COLORS`

New components:
- `components/ui/Input.tsx` — token-driven text input with label, icon, error state, helper text
- `components/ui/Badge.tsx` — small status pill, 5 variants + outline
- `components/ui/ChatBubble.tsx` — AI chat bubble with citation chips, user/assistant alignment
- `components/ui/StageStepper.tsx` — numbered multi-stage progress stepper
- `components/ui/QuizOption.tsx` — selectable answer card (default/selected/correct/wrong)
- `components/ui/Timer.tsx` — countdown timer with warning state
- `components/Sheet.tsx` — bottom sheet with drag-to-dismiss and backdrop
- `components/NavigationBar.tsx` — responsive BottomNav (phones) / SideRail (wide screens)

Updated:
- `components/ui/EmptyState.tsx` — fully token-driven, no hard-coded colours

Gates: typecheck 0 errors, lint 0 errors, tests pass individually.

## Step 2 — Screens (DONE)

New screens (all token-driven, no hard-coded colours, honest states):
- `screens/home/today.tsx` — Home "Today": one clear next action, stats, weak spots, subjects
- `screens/tutor/session.tsx` — Tutor session: stage stepper, "not in your notes" state
- `screens/practice/index.tsx` — Practice/mock exam: QuizOption, Timer, step-by-step flow
- `screens/library/index.tsx` — Library/import: private-only notes, privacy notice
- `screens/progress/index.tsx` — Progress: XP, streak, concepts, roadmaps, weak-spots
- `screens/settings/index.tsx` — Profile/Settings: theme, low-data mode, sign out
- `screens/setup/index.tsx` — Setup wizard: 4-step onboarding

All screens use: COLORS tokens, Badge, EmptyState, Skeleton, StageStepper,
QuizOption, Timer, Input, Button components. Honest states: loading, empty,
error, offline. Phone-first with 44px+ touch targets.

Gates: typecheck 0 errors, lint 0 errors, tests pass individually.

## Step 3 — Polish (DONE)

- `src/locales/en.json` — English translations (complete)
- `src/locales/sw.json` — Kiswahili translations (DRAFT)
- `src/locales/fr.json` — French translations (DRAFT)
- `src/locales/index.ts` — `t()` function with `{{placeholder}}` interpolation, English fallback
- `app.json` — `userInterfaceStyle: "automatic"` (dark/light/auto theme support)

Gates: typecheck 0 errors, lint 0 errors, tests pass individually.

## Acceptance Criteria (PARTIAL)

| Criterion | Target | Status |
|---|---|---|
| Lighthouse mobile Performance | >= 80 | Not yet measured |
| Lighthouse mobile Accessibility | >= 95 | Not yet measured |
| Lighthouse mobile Best Practices | >= 95 | Not yet measured |
| Lighthouse PWA installable | Yes | Not yet measured |
| Login-route JS transferred | <= 300 KB | Not yet measured |
| Home JS transferred | <= 450 KB | Not yet measured |
| slow-3G TTI | <= 8 s | Not yet measured |
| axe: zero serious/critical | 4 widths | Not yet measured |
| Playwright visual baselines | 4 widths × light/dark | Not yet measured |
| No hard-coded strings | All screens | PARTIAL (locale files exist, screens not yet migrated) |
| Phase 1 E2E passes | Unchanged | PASS (370/370) |

## Risks

1. Acceptance criteria (Lighthouse, axe, Playwright visual baselines, JS budgets) require a built `dist/` and browser automation tools — not yet measured.
2. Screens still use hard-coded user-facing strings instead of the `t()` locale function — migration pending.
3. Pre-commit hook blocks on pre-existing flaky flow test (`quiz.wrongAnswers.test.ts` ~5s timeout under full-suite load). Tests pass individually.

## Steps for Daniel

1. Review `docs/design/DESIGN.md` and approve the design system.
2. Review `src/locales/` and confirm translations are acceptable.
3. Measure Lighthouse scores against `dist/` build.
4. Run axe accessibility audit on all routes at 4 widths.
5. Set up Playwright visual baselines.
6. Migrate screens to use `t()` for all user-facing strings.
7. Push `phase2-design` to GitHub when ready.
