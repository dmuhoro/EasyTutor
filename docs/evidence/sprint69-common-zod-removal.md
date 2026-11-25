# Sprint 69 — Remove runtime Zod from the common login path

## Real boundary

`lib/api.ts` imports `lib/schemas.ts`, and `lib/api` is loaded in the common
chunk for `/login`. `lib/schemas.ts` used runtime `z` from `zod`; as a result,
every learner downloaded the validator before signing in. The second runtime
import was `lib/ai/reliability.ts` importing `ZodSchema` without `import type`.

This is a real bundle boundary, not a test-only concern: `scripts/perf/
measure-login-route.js` measures the actual JS transferred at a 390 px viewport.

## Red before green

`tests/lib/schemas.boundary.test.ts` was added first. It asserts that neither
common-path module has a runtime zod import and that the validators still
accept/reject the exact quiz and roadmap shapes the app relies on.

```text
RED:  Test Files 1 failed (1); Tests 1 failed | 7 passed (8)
      expected "import { z } from 'zod';" not to match /from ['"]zod['"]/
GREEN:Test Files 1 passed (1); Tests 8 passed (8)
```

No assertion or budget was loosened.

## Change

- Added `lib/ai/validation.ts`, a **type-only** structural `ValidationSchema<T>`
  contract. It emits no runtime code.
- Replaced `lib/schemas.ts` Zod objects with dependency-free validators that
  preserve the previous contract: known keys only, malformed values rejected,
  `error.message` on failure.
- Changed `lib/ai/reliability.ts` to use the structural type instead of
  `ZodSchema`. Existing Zod schemas in tests remain structurally compatible.

## Measured effect

| Build | Common chunk | Total login JS | Budget | Result |
|---|---:|---:|---:|---|
| Before | 306,616 B | 732,972 B | 733,000 B | PASS (28 B headroom) |
| After this layer | 240,056 B | **666,412 B** | 733,000 B | PASS (**66,588 B headroom**) |

The budget file was not edited. The saving is real JS that the browser no
longer transfers, not a changed threshold.

`npm test` after the change: **113 files / 605 tests** (8 new tests). The tracked
count in `AGENTS.md`, the CI drift grep and GT-21 evidence/acceptance were
updated from 112/597 to 113/605. No prior test was weakened.

## Status

`GT-10` is promoted to `VERIFIED-LOCAL`: the login ratchet passes with more than
the required 10 KB headroom. CI-only proof is not claimed in this file.
