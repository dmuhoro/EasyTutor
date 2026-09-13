# Live record — Module genuinely missing on disk: `@react-navigation/native` (fail-closed, honest)

**Date:** 2026-09-13 · **Layer:** governed typecheck rail · **Verdict:** ⚪ **NOT green** — RED,
and this record exists so no future session claims green while the module is absent.

## The literal truth, re-derived from disk (not memory)

- `npx tsc --noEmit` → exit **2** with exactly one error rail:

      lib/theme.ts(1,53): error TS2307: Cannot find module '@react-navigation/native'
                        or its corresponding type declarations.

- `node_modules/@react-navigation/native` — **ABSENT on disk** (checked twice; not present).
- The governed fix attempt `npx expo install @react-navigation/native` **did NOT land** —
  npm's package-manager spawn itself errored (spawnAsync → exit 1), so nothing new was
  written to node_modules for this rail, and package-lock did not advance for it.

## Why this is the honest unblock, stated exactly (not a guess hiding as a fix)

The module the typecheck rail demands is governed by **Expo's own dependency rail** — it
is never a hand-pinned npm version and never a fabricated "install succeeded." The app
already governs every other module of this family through `npx expo install`; this one
simply has not landed yet because the npm-invocation rail returned a spawn error in this
sandbox (registry/spawn-level, not a code-level issue — the module would be valid once
the SAME governed rail completes against a healthy npm).

## The ONE unblock (credential-free, network-needed, honest)

```
npx expo install @react-navigation/native
```

Run on a machine where npm's spawn rail is healthy (real registry access), then re-run
`npx tsc --noEmit` — **only a 0-exit tsc earns green. Nothing before it.**

## Honest consequence

No green claim · no version bump (`1.0.0` held — the code tree that the gates stand on
is unchanged) · this document is the governed record of the current RED, so the next
session inherits **truth**, not optimism.
