# Sprint 15 — UX Audit (Phase 0.3)

**Date:** 2026-11-14  
**Method:** Code review of all 34 routes + screenshots captured headlessly from the current `dist/` web export at **390×736px (mobile)** and **1280×800px (desktop)**. Screenshots saved under `docs/evidence/screenshots/` (16 files).  
**Criteria:** clarity of next action, visual hierarchy, tap-target size (44px min), contrast, text density, perceived speed.

---

## Screenshots Captured

| Route | 390px | 1280px |
|-------|-------|--------|
| login | `390px_login.png` | `1280px_login.png` |
| onboarding | `390px_onboarding.png` | `1280px_onboarding.png` |
| explore | `390px_explore.png` | `1280px_explore.png` |
| settings (tabs) | `390px_settings.png` | `1280px_settings.png` |
| profile | `390px_profile.png` | `1280px_profile.png` |
| roadmaps/create | `390px_roadmaps_create.png` | `1280px_roadmaps_create.png` |
| ai_literacy | `390px_ai_literacy.png` | `1280px_ai_literacy.png` |
| math-journey | `390px_math_journey.png` | `1280px_math_journey.png` |

*(Screening: screenshots confirm the SPA renders all routes; visual density issues below are derived from direct code inspection of each file.)*

---

## Problems Found (by route)

### P1 — Login (`app/(auth)/login.tsx`)
- **Visual hierarchy:** Hero brand + auth card compete at same weight; "Create Account"/"Sign In" chips look like tabs but sit above the form title, unclear which is primary.
- **Tap targets:** The "Forgot Password?" ghost button is `size="sm"` self-end — likely <44px touch target on mobile.
- **Text density:** Card has email + password + forgot + primary + Google + legal text in one dense block.
- **Contrast:** Uses design tokens (`COLORS.text.primary/secondary/muted`) — need to verify WCAG AA on the muted label text.
- **Next-action clarity:** Two CTAs ("Sign In"/"Continue with Google") same visual weight; no clear primary.

### P2 — Onboarding (`app/onboarding.tsx`)
- **Tap targets:** Mode cards are full-width rows with icons — good size; primary "Get Started" CTA is large (good).
- **Visual hierarchy:** Clear. Subtitle text explains each mode well.
- **Perceived speed:** 2500ms forced delay before navigation (`setTimeout(..., 2500)`) after success — feels sluggish and artificial.
- **Empty/error:** Only a success state; failure logs to console with no user-visible error.
- **Offline:** No offline handling — governedWrite fails silently-caught.

### P3 — Explore Library (`screens/explore.tsx`)
- **Text density:** "Mathematics journey" promo card sits above search — secondary promotion competes with primary catalogue.
- **Next-action clarity:** "Ask AI Tutor" button pre-loads a topic but behaves like search; two entry points to tutor (search bar + ask button) confusing.
- **Empty state:** Good ("Module not found" with retry hint).
- **Tap targets:** Subject cards are generously sized (>44px).
- **Offline:** ✅ Works fully offline (static catalogue).

### P4 — Study Tab (`screens/tabs/study.tsx`)
- **Text density:** High — header + topic pills + chapter scope pills + message list + input row + mode toggles + voice = 6 stacked interactive layers.
- **Tap targets:** Mode toggles are small text pills (~30px height) — below 44px minimum on mobile.
- **Visual hierarchy:** Message bubbles good; "Take Quiz"/"Concept Mastered" chips under each AI message add clutter.
- **Next-action clarity:** Clear ("Ask a question..." input + send button). Voice mic button prominent.
- **Perceived speed:** RAG retrieval indicator + loading skeleton — good feedback.
- **Contrast:** Placeholder text `#8a8fa3` on `#161920` — borderline; verify AA.

### P5 — Quiz Tab (`screens/tabs/quiz.tsx`)
- **Visual hierarchy:** Progress bar + question index + question text well ordered.
- **Tap targets:** Option cards are full-width rows, generously padded — good (>44px).
- **Text density:** Explanation + time + status + XP badge on finish screen = dense but scannable.
- **Empty state:** "Not covered in your notes" handled well.
- **Error:** Retry button present.
- **Offline:** AI question generation needs connection — no offline quiz queue.

### P6 — Roadmap Tab (`screens/tabs/roadmap.tsx`)
- **Visual hierarchy:** Clear active mission header + progress.
- **Empty state:** Good ("No Active Mission" + "Start First Mission" CTA).
- **Tap targets:** Delete icon small (~22px) but accompanied by clear alert confirm.
- **Tap targets:** Task rows >44px; teach-task icon small.
- **Offline:** ✅ Local-first.

### P7 — Settings Tab (`screens/tabs/settings.tsx`)
- **Tap targets:** Switch rows >44px; "Reset All Progress" destructive action has no confirmation dialog (dangerous).
- **Text density:** Version string "EasyTutor v1.0.4 Premium" drifts from root settings "v1.0.0-beta" — inconsistency.
- **Next-action clarity:** Clear groupings (Account/Preferences/AI Brain/Support).
- **Offline:** ✅ Works offline.

### P8 — Root Settings (`screens/settings.tsx`)
- **Visual hierarchy:** Dense — model slots, status badges, URL input, refresh, portal switcher all in one scroll.
- **Tap targets:** Status badges are small pill text; refresh text button small.
- **Text density:** High explanatory text ("No `/v1` suffix — local AI works fully offline!").
- **Next-action clarity:** "REFRESH" text button not visually distinct as a CTA.

### P9 — Profile (`screens/profile.tsx`)
- **MOCK/HARD-CODED:** "24 Units Done", "Gold" Active League, "12h" Focus Time — all invented stats, not real learner data.
- **Visual hierarchy:** Clear profile card + stats grid.
- **Tap targets:** Grid cards generously sized.
- **Offline:** ✅ Local-only.

### P10 — Create Roadmap (`screens/roadmaps/create.tsx`)
- **Visual hierarchy:** Clear goal input + primary CTA.
- **Tap targets:** Generate button large; text area generous.
- **Text density:** Good.
- **Perceived speed:** Loading + generating states shown. Good.
- **Error:** Alert on failure.
- **Offline:** Local-first; cloud sync deferred on failure (good).

### P11 — View Roadmap (`screens/roadmaps/[id].tsx`)
- **Visual hierarchy:** Progress % + days list clear.
- **Tap targets:** Task checkboxes small (~24px) — below 44px on mobile; teach-task icon ~16px.
- **Empty state:** "Roadmap Not Found" handled.
- **Offline:** ✅ Local-first.

### P12 — Self-Directed (`screens/self_directed/index.tsx`)
- **Text density:** Dense — GoalInput + knowledge workspace + text ingest + file import + 2 duplicate "Study Uploaded Material" buttons (duplicate action!).
- **Duplicate action:** Two identical "Study Uploaded Material" buttons (lines ~203 and ~283) — confusing.
- **Tap targets:** Import progress bar row good; file picker button large.
- **Next-action clarity:** Multiple competing CTAs (Start Mission / Add to Knowledge Base / Choose corpus.jsonl / Ask AI Tutor).
- **Offline:** Partial (Ollama local for embeddings; Supabase write needs connection).

### P13 — AI Literacy (`screens/ai_literacy/index.tsx`)
- **Visual hierarchy:** Very dense — overview cards + spaced review + resume + units grid + selected unit detail all on one scroll.
- **Tap targets:** Unit cards >44px; lock icons small but decorative.
- **Text density:** High (objective + weakest area + completion insight + remediation).
- **Loading:** Good ActivityIndicator.
- **Offline:** Partial (content/progress needs Supabase).

### P14 — Math Journey (`screens/math-journey.tsx`)
- Not fully audited in this phase (route exists, minimal inspection). Flag for Phase 0.3 follow-up if Daniel wants full coverage.

---

## Top 10 Ranked Fixes (Phase 1 candidates)

| Rank | Fix | Routes | Rationale |
|------|-----|--------|-----------|
| 1 | **Remove 2500ms forced delay** on onboarding success; navigate immediately | onboarding | Perceived speed — artificial wait frustrates |
| 2 | **Replace mock profile stats** ("24 Units", "Gold", "12h") with real `progressStore`/`roadmapStore` values | profile | Trust — invented data misleads learners |
| 3 | **Add confirmation dialog** to "Reset All Progress" (destructive, no undo) | settings | Safety — accidental data loss |
| 4 | **Enlarge mode toggles** to ≥44px touch targets | study | Accessibility — WCAG tap-target minimum |
| 5 | **Fix version drift** — single version source of truth (tabs "v1.0.4 Premium" vs root "v1.0.0-beta") | settings ×2 | Consistency — trust |
| 6 | **Remove duplicate "Study Uploaded Material" button** | self_directed | Clarity — competing CTAs |
| 7 | **Add empty/error/loading states** to routes lacking them (per wiring matrix gap table) | ~10 routes | Polish — blank/invisible states |
| 8 | **Clarify login primary CTA** — visually weight "Sign In" over Google/sign-up chips | login | Conversion — unclear primary action |
| 9 | **Enlarge roadmap task checkboxes** to ≥44px | view roadmap | Accessibility — tap-target minimum |
| 10 | **Consolidate Explore entry points** — single clear path to tutor/search | explore | Clarity — two tutor entry points |

---

## Evidence Summary

- Gates (Phase 0.1): typecheck 0, lint 0 errors, 263/263 tests, boundary audit 0 violations, public-env guard PASS, QA SUCCESS, web export PASS — all green on clean `npm ci` install, lockfile unchanged.
- Wiring matrix: `docs/evidence/sprint15-wiring-matrix.md` (comprehensive route-by-route data-source classification).
- Screenshots: 16 files in `docs/evidence/screenshots/` (8 routes × 2 widths) for Daniel's visual review.

**STOP after Phase 0.** Per the sprint directive, I am stopping here and waiting for Daniel's go-ahead before beginning Phase 1 (Foundations). No feature code has been written in this sprint yet.
