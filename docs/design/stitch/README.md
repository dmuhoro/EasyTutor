# Stitch design references

**Status:** Reference assets only — **not runtime code.** No file in this directory is
imported by the app.

The product is React Native (Expo + NativeWind). Stitch exports HTML + Tailwind at a fixed
780 px canvas; the app rebuilds these screens with its own tokens and primitives. Treat every
file here as the **visual spec** for a screen, never as a source file to copy into `app/` or
`components/`.

- **Stitch project:** `EasyTutor AI Study Companion` — `projects/8672350964718206202`
- **Project type:** `TEXT_TO_UI_PRO` · **Theme colour mode:** `LIGHT` (dark variants exist per screen)
- **Synced:** 2026-11-17 · 35 screens · screenshots 390 px wide (exported at 780 px, 2×)
- **Machine-readable tokens:** [`design-tokens.json`](./design-tokens.json)
- **Index:** [`manifest.json`](./manifest.json)

Each folder is `<screen-slug>/screenshot.(png|jpg)` + `<screen-slug>/code.html`.

## Re-syncing

The sync script reads the key from the environment; it never accepts it as an argument.

```sh
STITCH_API_KEY=... node scripts/design/stitch_sync.mjs \
  --project 8672350964718206202 --out docs/design/stitch
```

The same project is reachable through the `stitch` MCP server (`opencode mcp list`), which is
the preferred route for future edits (`edit_screens`, `generate_variants`, `apply_design_system`).

## Credential note — action required

The Stitch API key was pasted into a chat transcript and is therefore **exposed**. Rotation in
Stitch settings is the only remedy. After rotating:

1. export the new key as `STITCH_API_KEY` in the shell that starts OpenCode;
2. replace the literal `X-Goog-Api-Key` value in `~/.config/opencode/opencode.json` with
   `{env:STITCH_API_KEY}`.

The key must never land in this repository (Constitution Article V).

## Screen index

| Folder | Screen | Device | Export size |
|---|---|---|---|
| `aujourd-hui-francais/` | Aujourd'hui (Français) | MOBILE | 780×2944 |
| `check-your-email/` | Check Your Email | MOBILE | 780×1768 |
| `desktop-practice-quiz-and-working/` | Desktop Practice Quiz & Working | DESKTOP | 2560×2620 |
| `desktop-tutor-session-friction/` | Desktop Tutor Session (Friction) | DESKTOP | 2560×3002 |
| `home/` | Home | MOBILE | 780×3454 |
| `jaribio-la-mazoezi-swali-la-3-kiswahili/` | Jaribio la Mazoezi: Swali la 3 (Kiswahili) | MOBILE | 780×2454 |
| `kipindi-cha-mkufunzi-msuguano-kiswahili/` | Kipindi cha Mkufunzi: Msuguano (Kiswahili) | MOBILE | 780×3058 |
| `learn/` | Learn | MOBILE | 780×4154 |
| `leo-kiswahili/` | Leo (Kiswahili) | MOBILE | 780×2950 |
| `library-and-study-packs/` | Library & Study Packs | MOBILE | 780×2060 |
| `library-import-notes-modal/` | Library: Import Notes Modal | MOBILE | 780×1768 |
| `library-importing-state/` | Library: Importing State | MOBILE | 780×2592 |
| `library/` | Library | MOBILE | 780×3660 |
| `onboarding-step-3-what-are-you-studying/` | Onboarding: Step 3 (What are you studying?) | MOBILE | 780×1940 |
| `onboarding-step-4-pick-your-track/` | Onboarding: Step 4 (Pick your track) | MOBILE | 780×2086 |
| `onboarding-step-5-when-is-your-exam/` | Onboarding: Step 5 (When is your exam?) | MOBILE | 780×1940 |
| `onboarding-step-6-daily-study-time/` | Onboarding: Step 6 (Daily study time) | MOBILE | 780×2156 |
| `practice-quiz-question-3-dark-mode/` | Practice Quiz: Question 3 (Dark Mode) | MOBILE | 780×2340 |
| `practice-quiz-question-3/` | Practice Quiz: Question 3 | MOBILE | 780×1952 |
| `practice-quiz-result-and-working/` | Practice Quiz: Result & Working | MOBILE | 780×2536 |
| `practice/` | Practice | MOBILE | 780×4158 |
| `quiz-d-entrainement-question-3-francais/` | Quiz d'entraînement : Question 3 (Français) | MOBILE | 780×2648 |
| `seance-de-tutorat-frottement-francais/` | Séance de Tutorat : Frottement (Français) | MOBILE | 780×2718 |
| `sign-in/` | Sign In | MOBILE | 780×1904 |
| `state-connection-error/` | State: Connection Error | MOBILE | 780×1882 |
| `state-not-in-your-notes/` | State: Not in Your Notes | MOBILE | 780×2190 |
| `state-offline-banner/` | State: Offline Banner | MOBILE | 780×2618 |
| `state-tutor-limit-reached/` | State: Tutor Limit Reached | MOBILE | 780×3350 |
| `today-dark-mode/` | Today (Dark Mode) | MOBILE | 780×2788 |
| `today-empty-state/` | Today (Empty State) | MOBILE | 780×2316 |
| `today/` | Today | MOBILE | 780×2600 |
| `tutor-session-citation-modal/` | Tutor Session: Citation Modal | MOBILE | 780×2668 |
| `tutor-session-friction-dark-mode/` | Tutor Session: Friction (Dark Mode) | MOBILE | 780×2982 |
| `tutor-session-friction/` | Tutor Session: Friction | MOBILE | 780×2668 |
| `you-profile-and-settings/` | You (Profile & Settings) | MOBILE | 780×3988 |

## What the design system actually is

Extracted from `get_project → designTheme` (authoritative) and from each export's inline
Tailwind config (per-screen verification). Values below are the **rendered** palette, which
drifts from the original prompt in three places — recorded here rather than "fixed" silently.

| Role | Light | Dark | Prompt said | Note |
|---|---|---|---|---|
| primary (fill) | `#00614f` | `#4edea3` | `#0E7C66` | Stitch derived a tonal pair; `#0e7c66` survives as `primary-container` |
| on-primary | `#ffffff` | `#003824` | — | |
| background / surface | `#fcf9f3` | `#101414` | `#F7F4EE` / `#0B1F2A` | warm paper retained, ink is darker than `#0B1F2A` |
| surface container | `#f0eee8` | `#1c2020` | — | cards/elevated surfaces |
| on-surface | `#1c1c18` | `#e0e3e2` | `#14212B` | |
| on-surface-variant | `#3e4945` | `#bbcabf` | `#4A5A66` | secondary text |
| outline | `#6e7a75` | `#86948a` | — | 1 px borders |
| secondary / accent | `#835400` | `#ffb95f` | `#F2A93B` | amber lands on `secondary-container` `#fdb244`, not on `secondary` |
| error | `#ba1a1a` | `#ffb4ab` | `#D64545` | |
| success | — | — | `#2E9E6B` | the designs express success with **primary** teal, not a separate green |

Typography: **DM Sans** for display, headline, body and labels (weights 400/500/600/700);
**JetBrains Mono** for formulas and code. Roundness: `ROUND_EIGHT`. Spacing: 4/8/16/24/32 px.

Contrast re-checked for WCAG AA (2.2, normal text ≥ 4.5:1):

| Pair | Ratio |
|---|---|
| on-surface on background (light) | 16.26 |
| on-surface-variant on background (light) | 8.91 |
| white on primary (light) | 7.44 |
| error on card (light) | 6.46 |
| on-surface on background (dark) | 14.36 |
| on-surface-variant on background (dark) | 10.88 |
| on-primary on primary (dark) | 7.73 |

One pair fails AA for small text and must not be used that way: `#6e4600` on the amber
`#f2a93b` fill = **4.14**. Amber is a fill/icon colour; small labels on amber use ink
`#1c1c18` (≈ 10:1) instead.

## Coverage map (design → product)

| Design area | Folders | Live route today |
|---|---|---|
| Today (Home) + empty + dark | `today/`, `today-empty-state/`, `today-dark-mode/` | `/` → `screens/tabs/index.tsx` |
| Tutor session + citation + dark | `tutor-session-*`, `desktop-tutor-session-friction/` | no route (dead `screens/tutor/session.tsx`) |
| Practice + result + dark | `practice*`, `practice-quiz-*` | `/quiz` → `screens/tabs/quiz.tsx` |
| Library + import modal + importing | `library*` | `/roadmap` → `screens/tabs/roadmap.tsx` |
| Onboarding steps 3–6 | `onboarding-step-*` | `/setup` (wizard exists) |
| Sign in + check email | `sign-in/`, `check-your-email/` | `/login`, auth routes |
| You (profile + settings) | `you-profile-and-settings/` | `/progress` + `/profile` (two tabs) |
| States | `state-*` | scattered empty/error components |
| Desktop | `desktop-*` | no desktop layout |
| Localisation variants | `*-kiswahili/`, `*-francais/` | `src/locales` |

Not produced: a Sign-up screen, an "Add to weak spots" confirmation state, and a desktop
Library/You. Recorded as gaps, not claimed as done.
