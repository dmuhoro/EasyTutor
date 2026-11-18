# EasyTutor Execution Manifest — Master Program

**Generated:** 2026-11-18T16:04
**Branch:** `fix/truth-pass` @ `73cea7b`
**Backup:** `backup/pre-kilo-audit` @ `73cea7b` (verified identical)
**Unpushed commits:** 23 ahead of origin/main

## Baseline State

| Item | Value |
|------|-------|
| Local gates (typecheck, lint, tests, boundaries, QA, perf) | GREEN (441/441 tests, 0 typecheck errors, 0 lint errors) |
| CI on origin/main | RED (historical Phase 1 & Phase 2 merge commits) |
| Fresh-clone typecheck | EXIT 2 — `@axe-core/playwright` module not found, implicit any in axe-a11y.test.ts |
| `supabase db reset` from zero | EXIT 0 (46 migrations, all fixed) |
| e2e:smoke | 9/9 PASS @ 390px |
| e2e:full | NOT RUN — RAM 1,712 MiB < 2 GiB threshold |
| Lighthouse Performance | `/`: 36, `/login`: 56 (target ≥ 80 NOT MET — framework floor 287 KB gzip) |
| Hard-coded hex literals | 233 occurrences (DESIGN.md rule 1 not enforced) |
| Strings outside t() | Many across app/, components/, screens() |
| axe violations | 0 critical/serious; 1 moderate landmark per route × 2 viewports |
| DESIGN.md | Status: Approved — Stitch baseline (2026-11-17) |
| Other branches | `wip/sprint-17-onboarding-auth` has unique quarantined work (NOT merge-ready); all others are ancestors |

## Execution Plan (6 Slices)

| Slice | Objective | Status | Dependencies |
|-------|-----------|--------|--------------|
| Slice 1 | Engineering integrity, backend, CI | PENDING | none |
| Slice 2 | Canonical learner state and learning engine | PENDING | Slice 1 |
| Slice 3 | Complete learner experience | PENDING | Slice 1, Slice 2 |
| Slice 4 | Design system, accessibility, i18n | PENDING | Slice 1 |
| Slice 5 | Performance and operational reliability | PENDING | Slice 1, Slice 4 |
| Slice 6 | Full verification and pilot readiness | PENDING | Slices 1-5 |

## Known Blockers (documented, not ignored)

1. **Production deployment** — requires infrastructure credentials not available to agent; will document blocker and prepare deployment instructions
2. **e2e:full** — RAM 1,712 MiB < 2 GiB; will record NOT RUN with evidence
3. **Lighthouse Performance ≥ 80** — framework floor 287 KB gzip makes target unattainable with current tech stack; will document for Daniel's target approval
4. **Stitch key rotation** — user reported completed externally via .env.local (git-ignored, contents not read)

## Release Sequence (Part 6)

A. Push `fix/truth-pass` to origin — **BLOCKED**: remote push URL is `DISABLED-no-agent-pushes` (agent pushes disabled). Daniel must push manually: `git push origin fix/truth-pass`.
B. Create/update PR into main — Daniel must do manually via GitHub UI.
C. Wait for GitHub Actions to finish — Daniel monitors.
D. Investigate and resolve every failing required status check — Daniel resolves.
E. Verify migrations and deployment compatibility — Daniel verifies.
F. Merge the verified pull request into main — Daniel merges.
G. Verify main is green and contains the expected release commits — Daniel verifies.

## Evidence Location

`docs/evidence/` — dated evidence per slice
