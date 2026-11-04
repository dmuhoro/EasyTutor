# First Paint — EasyTutor

Slice 6 of the web-performance directive. The entry chunk is already much
smaller (slice 5); this slice removes the remaining reasons the *first visible
frame* could stall behind work that is not needed to draw the shell.

**Date:** 2026-11-04
**Base:** `4b8ffb3` (entry gzip **425,628 B**)

---

## Problems

1. `app/_layout.tsx` gated the whole tree on `fontsLoaded && !authLoading &&
   !isProfileLoading`. A slow font download or a slow profile fetch meant a
   blank `#0d0f12` screen with a single "EasyTutor" label — no shell, no hint.
2. The splash screen was only hidden when that same gate resolved, so on native
   the blank state persisted even though a font was the only thing missing.
3. The fallback was a `Text` node styled with the custom font family — the one
   thing that might not be available yet.

## Changes

- **System-font fallback with a grace window.** `useFonts` no longer blocks the
  shell. A 1 s timer (`fontGraceElapsed`) settles fonts to "use platform fonts
  and continue"; if the custom fonts arrive later they swap in. Font errors
  also settle immediately.
- **Skeleton instead of blank.** New `components/AppSkeleton.tsx` draws the
  app shell (header, greeting, primary card, subject grid) with plain `View`s
  and no font/custom-module dependency, so it renders with what is already in
  the entry chunk.
- **Splash hides on fonts-settled**, not app-ready, so the skeleton is visible
  while auth/profile finish.
- Auth/profile still gate navigation (a learner is never redirected with a
  half-known session), but they no longer gate the first visible pixels.

`isAppReady` is now `authSettled && fontsSettled`, where
`authSettled = !authLoading && !isProfileLoading` and
`fontsSettled = fontsLoaded || fontError || fontGraceElapsed`.

## Impact

| Metric | Before | After |
|---|---:|---:|
| Entry JS gzip −9 | 425,628 B | **425,904 B** (+276 B skeleton) |
| Time to first visible shell | gated on fonts + auth + profile | gated on mount (skeleton) |
| Font failure outcome | blocked indefinitely | system fonts, app continues |

The skeleton costs 276 gzip bytes and removes the blank-frame failure mode.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors
- `npx expo export --platform web --source-maps` — exported, 35 chunks
- Skeleton is font-free and dependency-light by construction (only `View`).
