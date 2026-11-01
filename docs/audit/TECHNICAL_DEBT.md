# Technical Debt Register — EasyTutor (Phase 0)

| ID | Item | Evidence | Severity |
|----|------|----------|----------|
| TD-01 | Lint warnings: 131 `no-unused-vars` | `npm run lint` output (0 errors, warnings) | low |
| TD-02 | `any`-typed sites in `src/` and `lib/` | STATUS known gaps; non-blocking | medium (type safety) |
| TD-03 | 22 best-effort empty `catch` blocks in `lib/` (AsyncStorage/cache fallbacks), commented as deliberate fall-throughs | grep in lib | low/medium |
| TD-04 | Raw Supabase access candidates bypass candidate in governance audit: `lib/interventionEngine.ts`, `lib/learningCoachEngine.ts`, `lib/performanceEngine.ts`, `lib/questionBank.ts`, `lib/recommendations.ts`, `lib/trendEngine.ts` | `node scripts/qa/qa_runner.js` output | high (governance) — needs verification each goes through governed layer or is refactored |
| TD-05 | Documentation version drift: README/STATUS claim Expo SDK 55 / RN 0.83.6; actual SDK 57 / RN 0.86.3 | package.json vs STATUS.md/README.md | medium (honesty) |
| TD-06 | Live-network round trips unproven (Supabase + physical Ollama on Expo Go); tests are mock-driven | STATUS Stubbed/Blocked | medium |
| TD-07 | Momentum/trend Supabase persistence round-trip unproven | STATUS | medium |
| TD-08 | Embedding requires embedding-capable Ollama model; retrieval returns `[]` honestly when absent | lib/embeddings.ts, STATUS | low (by design, fail closed) |
| TD-09 | Test coverage scoped to live path; archived 29 suites provide no protection (by policy) | tests/ count | low |
| TD-10 | Child-learner data protection / RLS per-user isolation must be re-verified against live cloud (not executed this run) | constraint | high (security) |

Recommendation: prioritise TD-04 and TD-10 before claiming governance completeness; TD-05 update docs in same change per AGENTS.md.