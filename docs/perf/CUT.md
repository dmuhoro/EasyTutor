# Unreachable Module Cut — EasyTutor

Slice 4 of the web-performance directive. Removes code that was shipped to the
browser but could never execute.

**Date:** 2026-11-04
**Base:** `8b9c344` (cycles eliminated; entry gzip **957,419 B**)

---

## What was unreachable

### 1. Every icon family except Ionicons

All 46 icon call sites used the `@expo/vector-icons` barrel
(`import { Ionicons } from '@expo/vector-icons'`), but the app only ever
rendered **Ionicons**. The barrel pulls in every family's glyph map and weight
metadata — MaterialCommunityIcons, FontAwesome5/6, MaterialIcons, etc. — none
of which can be reached at runtime.

**Change:** import the concrete family module (`@expo/vector-icons/Ionicons`,
46 files). No visual or API change; the app still renders Ionicons only.

### 2. `@anthropic-ai/sdk`

Listed in `dependencies` but imported nowhere; the AI rail deliberately calls
the Messages API over `fetch` because the SDK dragged `node:fs` into the
Android bundle (see the comment in `lib/api.ts`). Removed from
`package.json` / `package-lock.json`, which also dropped 5 transitive packages.

## Impact (entry chunk, same command as baseline)

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Entry JS raw | 3,949,700 B | **3,525,044 B** | **−424,656 B (−10.8%)** |
| Entry JS gzip −9 | 957,419 B | **825,345 B** | **−132,074 B (−13.8%)** |
| Source-map modules | 1,744 | **1,694** | −50 |
| Icon glyph maps in entry | multiple families | **1 (Ionicons)** | removed |

The remaining −40% target is carried by route code-splitting (slice 5) and
first-paint deferral (slice 6).

## What was deliberately *not* cut

A `depcruise --ts-pre-compilation-deps` sweep flagged four domain modules with
no app-level inbound import: `src/domain/curriculum/types.ts`,
`src/domain/learning/diagnostic.ts`, `src/domain/learning/validation.ts`, and
`src/domain/learning/{adaptive-progression,socratic}.ts`. They were moved to
`archive/` and immediately restored: `tests/domain/*` import them, so they are
reachable (a test is a consumer). Removing them would have required deleting
coverage, which this directive forbids.

`src/infrastructure/evidence/index.ts` is also unreferenced today. It is the
only application wiring for the evidence boundary and is **not** archived: the
store currently drains evidence through an injected writer, so removing this
file would hide a real integration gap. It is recorded here as follow-up work,
not as dead code.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 0 errors
- `npm test` — 50 files / 239 tests passed
- `npm run lint:cycles` — 0 cycles
- `node scripts/architecture/validate_boundaries.js` — passed
- `npx expo export --platform web --source-maps` — exported
