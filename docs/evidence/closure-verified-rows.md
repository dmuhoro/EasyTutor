# Closure layer — verified rows (2026-11-24)

Branch `feat/readiness-register`. Five P0/P1 rows advanced from `IMPLEMENTED-UNPROVEN` to
`VERIFIED-LOCAL` using only acceptance commands that were **run and observed green** in this tree.
No threshold, timeout, budget or assertion was weakened. No row was flipped on a gate that does not
actually exercise it.

## Rows advanced

| Row | Proof actually executed | Result |
|---|---|---|
| C01 Identity / sign-in | `npm run test:auth-flow` against the real local Supabase stack (`:54331`, 40 migrations), Mailpit `:54325` | 1 file / **4 tests passed** — sign-up session, password sign-in, email-confirmation link, OAuth redirect |
| C02 Email confirmation | same suite, specific confirmation-link assertion | passed |
| C18 DB-backed mastery | new `tests/mastery.unified.test.ts` | 1 file / **2 tests passed** — governed read (`subject_mastery`, ownership filter, subject/topic) and governed upsert (`onConflict=user_id,subject,topic`, ownership stamp, 80 % recompute) |
| C19 Prerequisites engine | new `tests/domain/prerequisites.test.ts` | 1 file / **5 tests passed** — cycle detection, direct/transitive prerequisites, gap set, all closure chains |
| C25 Roadmaps create/persist | existing `tests/flows/roadmap.persistence.test.ts` (acceptance path corrected from the non-existent `tests/flows/roadmap.test.ts`) | 1 file / **3 tests passed** — free-form + curriculum persistence and rehydration |

## Prove the proof (negative control)

`tests/mastery.unified.test.ts` was re-run with the governed write call replaced by a parseable
no-op in `lib/mastery.ts` (then restored byte-for-byte). Result: **1 failed / 1 passed**, with the
failure exactly `expected "vi.fn()" to be called 1 times, but got 0 times`. Restored tree: 2 passed.
This shows the new gate is not vacuous.

An earlier negative-control attempt produced a parse error instead of an assertion failure; it was
discarded, not counted as proof.

## Rows deliberately NOT advanced

- **C03 / C04** — `tests/integration/authFlow.integration.test.ts` exercises auth redirects but
  never renders the setup wizard or its 7 steps. `tests/flows/onboarding.flow.test.ts` proves DB
  persistence gating only. Claiming either row would be a false gate.
- **C11** — `npm run check:ai-boundary` verifies only that no disabled direct rail is called and the
  Ollama default URL is empty. It does **not** verify hosted-proxy auth or a daily cap.
- **C22 / E10-T1** — a single canonical-state projection test cannot prove "all screens"; E10-T1
  also depends on GT-05.
- **C12, C45, C49** — see the handover: structural (branch/PR cap) or credential blocking, not
  engineering omissions.

## Infrastructure note

Bringing up the live auth stack required a temporary `supabase/config.toml` edit (API `:54331`,
local mail `:54325`) matching `.env.local` and E2's verified pin. `supabase/config.toml` was restored
to its tracked content before any commit (`git status` clean for that file). Standard local Supabase
demo credentials appeared only in `/tmp/work/` logs; no secret was committed or pushed.

## Scores

| Milestone | Before | After | Open P0 |
|---|---|---|---|
| PILOT | 16.1 % | **17.7 %** | 30 → 27 |
| V1-ACADEMIC | 5.2 % | 5.2 % | 17 |
| V1-POLYMATH | 12.4 % | **14.4 %** | 12 → 11 |
| WORLD-CLASS | 10.5 % | 10.5 % | 12 |

All four remain `READY=NO`; the ≥80 % target is not claimed.
