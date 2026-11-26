# READINESS — EasyTutor

> GENERATED FILE — do not edit. Change `docs/readiness/register.json`, then run
> `npm run readiness:score`. CI rejects a stale or hand-edited file via `readiness:check`.

Scoring is computed, never typed: `VERIFIED-IN-CI` 1.0 · `VERIFIED-LOCAL` 0.6 ·
`IMPLEMENTED-UNPROVEN` 0.3 · `PARTIAL` 0.2 · `MISSING` 0; weights P0 3 / P1 2 / P2 1.
READY iff score ≥ 80% **and** zero open P0 rows **and** every critical-path row is `VERIFIED-IN-CI`.

## Verdict

| Milestone | Score | Arithmetic | Rows | Open P0 | Critical path not CI | READY |
|---|---|---|---|---|---|---|
| PILOT | 62.3% | 150.20 / 241 | 104 | 11 | 6 | NO |
| V1-ACADEMIC | 53.7% | 59.60 / 111 | 50 | 6 | 4 | NO |
| V1-POLYMATH | 44.0% | 45.80 / 104 | 48 | 7 | 4 | NO |
| WORLD-CLASS | 29.2% | 34.40 / 118 | 57 | 9 | 4 | NO |

## Next unblocked rows

| ID | Title | Wave | Prio | Status | Owner |
|---|---|---|---|---|---|
| C45 | Staging environment | W1 | P0 | MISSING | agent |
| DEC-02 | Curriculum priority and reviewer | W1 | P0 | MISSING | both |
| DEC-03 | Performance targets | W1 | P1 | MISSING | both |
| DEC-04 | PWA vs APK vs Play Store | W1 | P1 | MISSING | both |
| E3-T2 | Prove 20 in-suite runs with zero failures | W1 | P1 | MISSING | agent |
| D03 | Provision staging Supabase and apply migrations | W2 | P0 | MISSING | daniel |
| D05 | Make one live hosted AI call and record the rail | W2 | P0 | MISSING | daniel |
| D10 | Set production Auth URLs and Google OAuth callback | W2 | P0 | MISSING | daniel |
| D04 | Provision staging Vercel project and protection | W2 | P1 | MISSING | daniel |
| D06 | Install the APK and walk the full learner loop on a phone | W2 | P1 | MISSING | daniel |
| D07 | Confirm Groq tier and token/day limit | W2 | P1 | MISSING | daniel |
| D11 | Legal review of consent and deletion wording | W2 | P1 | MISSING | daniel |

## Daniel-only steps

| ID | Step | Priority | Acceptance |
|---|---|---|---|
| D01 | Rotate the exposed Stitch API key | P1 | `test -f docs/evidence/daniel-D01.md` |
| D02 | Deploy ai-proxy with ALLOWED_ORIGINS set to real origins | P0 | `test -f docs/evidence/daniel-D02.md` |
| D03 | Provision staging Supabase and apply migrations | P0 | `test -f docs/evidence/daniel-D03.md` |
| D04 | Provision staging Vercel project and protection | P1 | `test -f docs/evidence/daniel-D04.md` |
| D05 | Make one live hosted AI call and record the rail | P0 | `test -f docs/evidence/daniel-D05.md` |
| D06 | Install the APK and walk the full learner loop on a phone | P1 | `test -f docs/evidence/daniel-D06.md` |
| D07 | Confirm Groq tier and token/day limit | P1 | `test -f docs/evidence/daniel-D07.md` |
| D08 | Confirm Supabase plan and egress limits | P2 | `test -f docs/evidence/daniel-D08.md` |
| D09 | Confirm Vercel plan and egress limits | P2 | `test -f docs/evidence/daniel-D09.md` |
| D10 | Set production Auth URLs and Google OAuth callback | P0 | `test -f docs/evidence/daniel-D10.md` |
| D11 | Legal review of consent and deletion wording | P1 | `test -f docs/evidence/daniel-D11.md` |
| D12 | Approve the mobile Lighthouse target | P2 | `test -f docs/evidence/daniel-D12.md` |
| D13 | Review curriculum packs and flip DRAFT to OFFICIAL | P1 | `test -f docs/evidence/daniel-D13.md` |
| D14 | Confirm marking scheme per subject | P1 | `test -f docs/evidence/daniel-D14.md` |
| D15 | Provide alert destination and billing dashboard access | P2 | `test -f docs/evidence/daniel-D15.md` |
| D16 | Sign off provider plan, capacity runbook and pilot size | P1 | `test -f docs/evidence/daniel-D16.md` |

## Open decisions

| ID | Decision | Recommended default | Cost of delay |
|---|---|---|---|
| DEC-01 | Pilot size | 10 learners, Mathematics only, Android + web | Each extra 10 learners needs a provider tier decision; delay blocks D16 and the pilot gate. |
| DEC-02 | Curriculum priority and reviewer | KCSE first, then Kenya TVET automotive, then one university pack; Daniel reviews | Without a reviewer packs stay DRAFT and F3 cannot be claimed. |
| DEC-03 | Performance targets | Keep existing budgets; add a mobile Lighthouse floor of 60, ratchet to 80 after a measured baseline | No mobile gate means repeated unmeasured regressions; delay keeps F8 unverifiable. |
| DEC-04 | PWA vs APK vs Play Store | PWA for pilot, signed APK for device proof, Play Store deferred | Play Store needs legal/assets and is not on the critical path to learning proof. |
| DEC-05 | AI budget | Cap 200 calls/user/day and 1000 tokens/call; budget for 10 learners then re-plan at 25 | Without a tier decision the pilot can exhaust free quota mid-cohort. |

## Non-goals for v1

- Payments, commerce and subscriptions in v1 (archive/lib/commerce stays archived).
- Play Store publication in v1; signed APK for device proof only.
- Native iOS in v1.
- Free-text essay marking and image-based question solving in v1.
- Live Ollama inference as a default rail; it remains opt-in and unreachable by default.
- Rewriting history or rotating credentials in an agent session.

## Full register

| ID | Title | Milestones | Prio | Status | Owner | Epic | Wave | Depends on |
|---|---|---|---|---|---|---|---|---|
| R0 | Completion Register and scoring machinery | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | VERIFIED-IN-CI | agent | R0 | R0 | — |
| C01 | Identity / sign-in | PILOT | P0 | VERIFIED-LOCAL | agent |  | W3 | — |
| C02 | Email confirmation | PILOT | P0 | VERIFIED-LOCAL | agent |  | W3 | — |
| C03 | Onboarding handoff to setup wizard | PILOT | P0 | IMPLEMENTED-UNPROVEN | agent |  | W3 | — |
| C04 | Setup wizard (7 steps) | PILOT | P0 | IMPLEMENTED-UNPROVEN | agent |  | W3 | — |
| C05 | Import own notes/books | PILOT | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C06 | Semantic chunking | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C07 | Embeddings (optional, fail-closed) | PILOT | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C08 | Governed retrieval | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C09 | Exact-marker citations | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C10 | Single AI provider selector | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C11 | Hosted proxy auth and daily cap | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C12 | Proxy CORS for web/PWA | PILOT | P0 | VERIFIED-IN-CI | agent | E1 | W1 | — |
| C13 | Socratic tutoring strategy | PILOT | P1 | PARTIAL | agent |  | W3 | — |
| C14 | Quiz generation | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C15 | Worked solutions | ACADEMIC | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C16 | Diagrams for diagram-needing subjects | ACADEMIC | P1 | MISSING | agent |  | W3 | — |
| C17 | Domain mastery (deterministic) | PILOT, POLYMATH | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C18 | DB-backed mastery | PILOT, POLYMATH | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C19 | Prerequisites engine | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C20 | Spaced repetition surfaced in UI | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C21 | Recommendations surfaced on Home | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C22 | Canonical learner state (all screens) | PILOT, POLYMATH | P1 | PARTIAL | agent |  | W3 | — |
| C23 | Weak-spot review | PILOT | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C24 | Multi-subject generality (>=2 proven) | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C25 | Roadmaps create/persist | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C26 | Curriculum packs consumed at runtime | ACADEMIC | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C27 | Mock exam with marking | ACADEMIC | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C28 | Exam countdown displayed | ACADEMIC | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C29 | Offline + idempotent sync | PILOT | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C30 | i18n en/sw/fr on every routed screen | WORLD-CLASS | P1 | PARTIAL | agent |  | W3 | — |
| C31 | A11y WCAG 2.2 AA (authenticated axe) | WORLD-CLASS | P1 | IMPLEMENTED-UNPROVEN | agent |  | W3 | — |
| C32 | Low-data mode behaviour | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C33 | PWA manifest + service worker | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C34 | Native Android build + install | PILOT | P2 | MISSING | agent |  | W3 | — |
| C35 | Stitch designs mapped to routed screens | WORLD-CLASS | P1 | PARTIAL | agent |  | W3 | — |
| C36 | Design tokens only (zero raw hex) | WORLD-CLASS | P2 | PARTIAL | agent |  | W3 | — |
| C37 | Empty / error states on every screen | WORLD-CLASS | P1 | PARTIAL | agent |  | W3 | — |
| C38 | JS size budgets with real headroom | WORLD-CLASS | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C39 | Consent reachable in UI | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C40 | Data export reachable in UI | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C41 | Delete account reachable in UI | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C42 | Rate limiting on hosted AI | PILOT | P1 | VERIFIED-IN-CI | agent |  | W3 | — |
| C43 | Real cost telemetry | WORLD-CLASS | P2 | VERIFIED-IN-CI | agent |  | W3 | — |
| C44 | Monitoring and alerting | WORLD-CLASS | P1 | PARTIAL | agent |  | W3 | — |
| C45 | Staging environment | PILOT | P0 | MISSING | agent | E2 | W1 | — |
| C46 | Migrations apply from zero | PILOT | P0 | VERIFIED-LOCAL | agent | E5 | W1 | — |
| C47 | RLS matrix all tables, two users | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C48 | No secrets in client or bundle | PILOT | P0 | VERIFIED-IN-CI | agent |  | W3 | — |
| C49 | CI proves the real learner journey | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | VERIFIED-IN-CI | agent | E2 | W1 | — |
| GT-01 | Web cannot call hosted AI (no CORS) | PILOT | P0 | VERIFIED-IN-CI | agent | E1 | W1 | C12 |
| GT-02 | Curriculum packs never loaded (Node fs, 0 consumers) | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E7 | W3 | C26 |
| GT-03 | No mock exam or marking | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E8 | W3 | C27 |
| GT-04 | Exam date captured but never displayed | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E9 | W3 | C28 |
| GT-05 | Canonical learner state feeds only Math | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent | E10 | W5 | C22 |
| GT-06 | Two disconnected mastery systems | PILOT, POLYMATH | P1 | PARTIAL | agent | E11 | W5 | C17, C18 |
| GT-07 | Consent/export/delete wired to no UI | PILOT | P1 | VERIFIED-IN-CI | agent | E4 | W2 | C39, C40, C41 |
| GT-08 | e2e:full not reproducible; no CI real stack | PILOT | P1 | VERIFIED-IN-CI | agent | E2 | W1 | C49 |
| GT-09 | Confirmed quiz test flake 1/20 | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E3 | W1 | C14 |
| GT-10 | Login-route budget has at least 10 KB headroom | WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E3 | W1 | C38 |
| GT-11 | RLS proof not in CI | PILOT | P1 | VERIFIED-IN-CI | agent | E5 | W1 | C47 |
| GT-12 | 34 production vulnerabilities incl. 1 critical | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E5 | W1 | — |
| GT-13 | Governance bypass in trendEngine/recommendations | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent | E6 | W4 | — |
| GT-14 | Spaced repetition not surfaced | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent | E6 | W4 | C20 |
| GT-15 | i18n covers 9/40 screens | WORLD-CLASS | P1 | PARTIAL | agent | E13 | W4 | C30 |
| GT-16 | Axe suite excluded from CI | WORLD-CLASS | P1 | PARTIAL | agent | E15 | W4 | C31 |
| GT-17 | Cost telemetry always 0 | WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E6 | W4 | C43 |
| GT-18 | Free-tier AI supports ~11-40 learners | PILOT | P1 | PARTIAL | agent | E16 | W2 | — |
| GT-19 | 953 raw hex across 48 files | WORLD-CLASS | P2 | PARTIAL | agent | E14 | W4 | C36 |
| GT-20 | 4 unused deps and stray root files | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | VERIFIED-IN-CI | agent | E4 | W5 | — |
| GT-21 | AGENTS.md test count stale (174 vs 515) | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | VERIFIED-IN-CI | agent | R0 | R0 | — |
| GT-22 | No diagram renderer | ACADEMIC | P2 | MISSING | agent | E7 | W3 | C16 |
| GT-23 | Native APK unverified | PILOT | P2 | MISSING | agent | E2 | W2 | C34 |
| GT-24 | Mobile Lighthouse NOT MET and ungated | WORLD-CLASS | P2 | PARTIAL | agent | E15 | W4 | C31 |
| F1 | Personalised AI tutor: import, cited answers, quiz, Socratic help | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | PARTIAL | both | FREQ | W4 | C01 |
| F2 | Polymathic learner model over >=2 subjects | PILOT, POLYMATH | P1 | PARTIAL | both | FREQ | W4 | C22 |
| F3 | Academic suite: packs, mock exam, countdown, worked solutions | ACADEMIC | P1 | MISSING | both | FREQ | W4 | C26 |
| F4 | Privacy and child safety: consent, export, delete, isolation | PILOT | P1 | PARTIAL | both | FREQ | W4 | C39 |
| F5 | Proof: reproducible local stack and CI-verified real journey | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | PARTIAL | both | FREQ | W4 | C49 |
| F6 | World-class UI: Stitch parity, tokens, i18n, states | WORLD-CLASS | P1 | PARTIAL | both | FREQ | W4 | C30 |
| F7 | Operations at scale: monitoring, cost, capacity, runbooks | WORLD-CLASS | P1 | PARTIAL | both | FREQ | W4 | C43 |
| F8 | Performance and accessibility: budgets, a11y, offline | WORLD-CLASS | P1 | PARTIAL | both | FREQ | W4 | C31 |
| E1-T1 | Add ALLOWED_ORIGINS allowlist parsing (exact match, no wildcard) | PILOT | P0 | VERIFIED-LOCAL | agent | E1 | W1 | GT-01 |
| E1-T2 | Handle OPTIONS with 204 and Vary: Origin | PILOT | P1 | VERIFIED-IN-CI | agent | E1 | W1 | E1-T1 |
| E1-T3 | Add CORS headers to every response including errors | PILOT | P1 | VERIFIED-IN-CI | agent | E1 | W1 | E1-T2 |
| E1-T4 | Unit test allowed-origin, disallowed-origin and missing-env | PILOT | P1 | VERIFIED-IN-CI | agent | E1 | W1 | E1-T3 |
| E1-T5 | Prove non-POST non-OPTIONS keeps its 405 contract | PILOT | P1 | VERIFIED-IN-CI | agent | E1 | W1 | E1-T4 |
| E1-T6 | Name ALLOWED_ORIGINS in .env.example (no value) | PILOT | P1 | VERIFIED-LOCAL | agent | E1 | W1 | E1-T5 |
| E2-T1 | Make e2e:full read URL and keys from supabase status | PILOT | P0 | VERIFIED-IN-CI | agent | E2 | W1 | GT-08 |
| E2-T2 | Pin CI ports so :54331 harness matches config | PILOT | P1 | VERIFIED-IN-CI | agent | E2 | W1 | E2-T1 |
| E2-T3 | Add real-stack CI job: start, reset, build, e2e:full | PILOT | P1 | VERIFIED-IN-CI | agent | E2 | W1 | E2-T2 |
| E2-T4 | Upload Playwright traces on failure | PILOT | P1 | VERIFIED-LOCAL | agent | E2 | W1 | E2-T3 |
| E3-T1 | Reduce cold import/seed cost of quiz.wrongAnswers | PILOT | P0 | VERIFIED-IN-CI | agent | E3 | W1 | GT-09, GT-10 |
| E3-T2 | Prove 20 in-suite runs with zero failures | PILOT | P1 | MISSING | agent | E3 | W1 | E3-T1 |
| E3-T3 | Create >=10 KB headroom on perf:login-route without raising budget | PILOT | P1 | MISSING | agent | E3 | W1 | E3-T2 |
| E4-T1 | Add consent section to settings | PILOT | P0 | VERIFIED-IN-CI | agent | E4 | W2 | GT-07 |
| E4-T2 | Add export and delete with explicit confirmation | PILOT | P1 | VERIFIED-IN-CI | agent | E4 | W2 | E4-T1 |
| E4-T3 | Write audit record for each privacy action | PILOT | P1 | VERIFIED-IN-CI | agent | E4 | W2 | E4-T2 |
| E5-T1 | Classify 34 audit findings by reachability | PILOT | P0 | VERIFIED-LOCAL | agent | E5 | W1 | GT-11, GT-12 |
| E5-T2 | Fix critical and reachable highs by targeted upgrade | PILOT | P1 | VERIFIED-IN-CI | agent | E5 | W1 | E5-T1 |
| E5-T3 | Add RLS matrix to CI and fail closed | PILOT | P1 | VERIFIED-IN-CI | agent | E5 | W1 | E5-T2 |
| E6-T1 | Route trendEngine through governed layer | WORLD-CLASS | P0 | VERIFIED-IN-CI | agent | E6 | W4 | GT-13, GT-17 |
| E6-T2 | Route recommendations through governed layer | WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E6 | W4 | E6-T1 |
| E6-T3 | Replace estimatedCostUsd placeholder with token cost | WORLD-CLASS | P1 | VERIFIED-IN-CI | agent | E6 | W4 | E6-T2 |
| E6-T4 | Add error-rate and uptime alerting | WORLD-CLASS | P1 | MISSING | agent | E6 | W4 | E6-T3 |
| E7-T1 | Replace Node fs pack loading with bundled JSON + Zod validation | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E7 | W3 | GT-02, GT-22 |
| E7-T2 | Surface source_status (DRAFT/OFFICIAL) in UI | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E7 | W3 | E7-T1 |
| E7-T3 | Seed KCSE and university packs | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E7 | W3 | E7-T2 |
| E8-T1 | Exam session store | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E8 | W3 | GT-03 |
| E8-T2 | Exam timer | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E8 | W3 | E8-T1 |
| E8-T3 | Paper assembly from a pack | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E8 | W3 | E8-T2 |
| E8-T4 | Deterministic marking | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E8 | W3 | E8-T3 |
| E8-T5 | Per-question review with worked solutions | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E8 | W3 | E8-T4 |
| E9-T1 | Read examDate from profile | ACADEMIC | P0 | VERIFIED-IN-CI | agent | E9 | W3 | GT-04 |
| E9-T2 | Render countdown on Home | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E9 | W3 | E9-T1 |
| E9-T3 | Handle missing and past dates | ACADEMIC | P1 | VERIFIED-IN-CI | agent | E9 | W3 | E9-T2 |
| E10-T1 | Make projectCanonicalLearnerState the canonical selector | PILOT, POLYMATH | P0 | VERIFIED-IN-CI | agent | E10 | W5 | GT-05 |
| E10-T2 | Consume it in Home, You and Math journey | PILOT, POLYMATH | P1 | MISSING | agent | E10 | W5 | E10-T1 |
| E11-T1 | Make lib/mastery.ts an adapter over evaluateMastery | PILOT, POLYMATH | P0 | MISSING | agent | E11 | W5 | GT-06, E10-T1 |
| E11-T2 | Remove the duplicate implementation via archive | PILOT, POLYMATH | P1 | MISSING | agent | E11 | W5 | E11-T1 |
| E12-T1 | Add Physics fixtures | PILOT, POLYMATH | P0 | VERIFIED-IN-CI | agent | E12 | W5 | GT-05 |
| E12-T2 | Prove second subject through the same state machine | PILOT, POLYMATH | P1 | VERIFIED-IN-CI | agent | E12 | W5 | E12-T1 |
| E13-T1 | Migrate remaining screens to t() | WORLD-CLASS | P0 | MISSING | agent | E13 | W4 | GT-15 |
| E13-T2 | Extend locale gate to fail on user-visible literals | WORLD-CLASS | P1 | MISSING | agent | E13 | W4 | E13-T1 |
| E14-T1 | Map raw hex to design tokens | WORLD-CLASS | P0 | MISSING | agent | E14 | W4 | GT-19 |
| E14-T2 | Add zero-hex CI check | WORLD-CLASS | P1 | MISSING | agent | E14 | W4 | E14-T1 |
| E15-T1 | Authenticated axe run in CI | WORLD-CLASS | P0 | MISSING | agent | E15 | W4 | GT-16, GT-24 |
| E15-T2 | Add mobile Lighthouse preset | WORLD-CLASS | P1 | MISSING | agent | E15 | W4 | E15-T1 |
| E15-T3 | Fail closed at approved mobile target | WORLD-CLASS | P1 | MISSING | agent | E15 | W4 | E15-T2 |
| E16-T1 | Per-feature token budget | PILOT | P0 | MISSING | agent | E16 | W2 | GT-18 |
| E16-T2 | Provider tier upgrade plan | PILOT | P1 | MISSING | agent | E16 | W2 | E16-T1 |
| E16-T3 | Capacity runbook | PILOT | P1 | MISSING | agent | E16 | W2 | E16-T2 |
| D01 | Rotate the exposed Stitch API key | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W4 | — |
| D02 | Deploy ai-proxy with ALLOWED_ORIGINS set to real origins | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | VERIFIED-LOCAL | daniel | DANIEL | W2 | — |
| D03 | Provision staging Supabase and apply migrations | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | daniel | DANIEL | W2 | — |
| D04 | Provision staging Vercel project and protection | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W2 | — |
| D05 | Make one live hosted AI call and record the rail | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | daniel | DANIEL | W2 | — |
| D06 | Install the APK and walk the full learner loop on a phone | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W2 | — |
| D07 | Confirm Groq tier and token/day limit | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W2 | — |
| D08 | Confirm Supabase plan and egress limits | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | MISSING | daniel | DANIEL | W2 | — |
| D09 | Confirm Vercel plan and egress limits | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | MISSING | daniel | DANIEL | W2 | — |
| D10 | Set production Auth URLs and Google OAuth callback | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | daniel | DANIEL | W2 | — |
| D11 | Legal review of consent and deletion wording | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W2 | — |
| D12 | Approve the mobile Lighthouse target | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | MISSING | daniel | DANIEL | W4 | — |
| D13 | Review curriculum packs and flip DRAFT to OFFICIAL | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W3 | — |
| D14 | Confirm marking scheme per subject | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W3 | — |
| D15 | Provide alert destination and billing dashboard access | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P2 | MISSING | daniel | DANIEL | W2 | — |
| D16 | Sign off provider plan, capacity runbook and pilot size | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | daniel | DANIEL | W2 | — |
| DEC-01 | Pilot size | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | both | DEC | W1 | D16 |
| DEC-02 | Curriculum priority and reviewer | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | both | DEC | W1 | — |
| DEC-03 | Performance targets | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | both | DEC | W1 | — |
| DEC-04 | PWA vs APK vs Play Store | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P1 | MISSING | both | DEC | W1 | — |
| DEC-05 | AI budget | PILOT, ACADEMIC, POLYMATH, WORLD-CLASS | P0 | MISSING | both | DEC | W1 | D07 |

